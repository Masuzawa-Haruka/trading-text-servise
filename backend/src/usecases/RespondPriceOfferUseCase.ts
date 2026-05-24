/**
 * RespondPriceOfferUseCase（価格オファー回答ユースケース）
 *
 * 受信したオファーに対して、「承認（accepted）」または「辞退（rejected）」を行う。
 *
 * ビジネスルール:
 * 1. オファーの受信側（送信者でない当事者）のみ回答可能
 * 2. 既に回答済みのオファーには回答不可
 * 3. 承認（accepted）された場合、取引（Transaction）の確定価格（final_price）を原子的に更新する
 */
import { IPriceOfferRepository } from '../domain/repositories/IPriceOfferRepository';
import { ITransactionRepository } from '../domain/repositories/ITransactionRepository';
import { INotificationRepository } from '../domain/repositories/INotificationRepository';
import { PriceOfferEntity, RespondPriceOfferInput } from '../domain/priceOffer';
import { NotFoundError, ForbiddenError, ValidationError } from '../domain/errors';

export class RespondPriceOfferUseCase {
  constructor(
    private readonly priceOfferRepository: IPriceOfferRepository,
    private readonly transactionRepository: ITransactionRepository,
    private readonly notificationRepository?: INotificationRepository,
  ) {}

  /**
   * オファーに対して回答（承認/辞退）を行う。
   * @param offerId 回答対象のオファーID
   * @param input 回答ステータス
   * @param requesterId リクエストしたユーザーのID（権限確認用）
   * @throws {NotFoundError} オファーが存在しない場合
   * @throws {ForbiddenError} 権限なし（送信者が自分で回答しようとした）、または取引の当事者でない場合
   * @throws {ValidationError} すでに回答済みの場合
   */
  async execute(
    offerId: string,
    input: RespondPriceOfferInput,
    requesterId: string,
  ): Promise<PriceOfferEntity> {
    // オファーの存在確認
    const offer = await this.priceOfferRepository.findById(offerId);
    if (!offer) {
      throw new NotFoundError('指定したオファーが見つかりません');
    }

    // 取引の存在確認（念のため、および当事者確認用）
    const transaction = await this.transactionRepository.findById(offer.transaction_id);
    if (!transaction) {
      throw new NotFoundError('関連する取引が見つかりません');
    }

    // 当事者であるか確認
    const isParticipant =
      transaction.seller_id === requesterId || transaction.buyer_id === requesterId;
    if (!isParticipant) {
      throw new ForbiddenError('このオファーに回答する権限がありません');
    }

    // 受信側であるか確認（送信者は自分で回答できない）
    if (offer.sender_id === requesterId) {
      throw new ForbiddenError('自分が送信したオファーに自分で回答することはできません');
    }

    // すでに回答済みか確認
    if (offer.status !== 'pending') {
      throw new ValidationError(`このオファーは既に ${offer.status} と回答されています`);
    }

    try {
      // 承認（accepted）の場合は、取引のfinal_priceも同時に更新する
      if (input.status === 'accepted') {
        const acceptedOffer = await this.priceOfferRepository.respondAtomically(
          offerId,
          'accepted',
          transaction.id,
          offer.price,
        );
        await this.createNotificationSafely({
          user_id: offer.sender_id,
          actor_id: requesterId,
          title: '価格提案が承認されました',
          type: 'info',
          transaction_id: transaction.id,
        });
        return acceptedOffer;
      }

      // 辞退（rejected）の場合は、オファーのステータスのみ更新する
      const rejectedOffer = await this.priceOfferRepository.updateStatus(offerId, 'rejected');
      await this.createNotificationSafely({
        user_id: offer.sender_id,
        actor_id: requesterId,
        title: '価格提案が見送られました',
        type: 'action_required',
        transaction_id: transaction.id,
      });
      return rejectedOffer;
    } catch (error: any) {
      if (error.message === 'ALREADY_RESPONDED') {
        throw new ValidationError('このオファーはすでに回答済みか存在しません');
      }
      if (error.message === 'NOT_FOUND') {
        throw new NotFoundError('指定したオファーが見つかりません');
      }
      throw error;
    }
  }

  private async createNotificationSafely(input: {
    user_id: string;
    actor_id: string;
    title: string;
    type: 'info' | 'action_required';
    transaction_id: string;
  }): Promise<void> {
    if (!this.notificationRepository) return;

    try {
      await this.notificationRepository.create(input);
    } catch (error) {
      console.error('[RespondPriceOfferUseCase.createNotification]', error);
    }
  }
}
