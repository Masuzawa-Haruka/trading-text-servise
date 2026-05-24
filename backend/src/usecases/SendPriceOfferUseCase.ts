/**
 * SendPriceOfferUseCase（価格交渉オファー送信ユースケース）
 *
 * Take it or Leave it 方式の価格交渉において、新しいオファーを送信する処理を担う。
 *
 * ビジネスルール:
 * 1. 取引の当事者（売り手または買い手）のみ送信可能
 * 2. 取引のステータスが 'proposing' の場合のみ送信可能
 * 3. 並行オファーの禁止: 既に 'pending'（未回答）のオファーがある場合は送信不可
 * 4. 回数制限: 1つの取引につき、両者合わせて最大3回まで
 */
import { IPriceOfferRepository } from '../domain/repositories/IPriceOfferRepository';
import { ITransactionRepository } from '../domain/repositories/ITransactionRepository';
import { INotificationRepository } from '../domain/repositories/INotificationRepository';
import { PriceOfferEntity, SendPriceOfferInput } from '../domain/priceOffer';
import { NotFoundError, ForbiddenError, ValidationError } from '../domain/errors';

export class SendPriceOfferUseCase {
  constructor(
    private readonly priceOfferRepository: IPriceOfferRepository,
    private readonly transactionRepository: ITransactionRepository,
    private readonly notificationRepository?: INotificationRepository,
  ) {}

  /**
   * オファーを送信して作成する。
   * @param input 送信するオファーの情報
   * @throws {NotFoundError} 指定した取引が存在しない場合
   * @throws {ForbiddenError} 権限なし、ステータス不正、並行オファー、回数制限超過の場合
   * @throws {ValidationError} 金額が不正な場合（Controller側でも弾くが念のため）
   */
  async execute(input: SendPriceOfferInput): Promise<PriceOfferEntity> {
    if (input.price < 0) {
      throw new ValidationError('価格は0以上である必要があります');
    }

    // 取引の存在確認
    const transaction = await this.transactionRepository.findById(input.transaction_id);
    if (!transaction) {
      throw new NotFoundError('指定した取引が見つかりません');
    }

    // 当事者確認
    const isParticipant =
      transaction.seller_id === input.sender_id || transaction.buyer_id === input.sender_id;
    if (!isParticipant) {
      throw new ForbiddenError('この取引の価格交渉を行う権限がありません');
    }

    // ステータス確認（proposingのみ許可）
    if (transaction.status !== 'proposing') {
      throw new ForbiddenError(
        `現在の取引ステータス（${transaction.status}）では価格交渉を行えません`,
      );
    }

    // 並行オファーや回数上限のチェックと作成を原子的に行う
    try {
      const offer = await this.priceOfferRepository.createAtomically(input);
      const recipientId =
        transaction.seller_id === input.sender_id ? transaction.buyer_id : transaction.seller_id;
      await this.createNotificationSafely({
        user_id: recipientId,
        actor_id: input.sender_id,
        title: '価格提案が届いています',
        type: 'action_required',
        transaction_id: input.transaction_id,
      });
      return offer;
    } catch (error: any) {
      if (error.message === 'PENDING_EXISTS') {
        throw new ForbiddenError(
          '相手からの未回答のオファーが既に存在するため、新しいオファーは送信できません',
        );
      }
      if (error.message === 'LIMIT_EXCEEDED') {
        throw new ForbiddenError('この取引での価格交渉回数の上限（3回）に達しました');
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
      console.error('[SendPriceOfferUseCase.createNotification]', error);
    }
  }
}
