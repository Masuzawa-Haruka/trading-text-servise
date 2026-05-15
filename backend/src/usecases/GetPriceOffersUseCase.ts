/**
 * GetPriceOffersUseCase（価格オファー一覧取得ユースケース）
 *
 * 取引に紐づくオファーの一覧を取得する。
 * 取引の当事者（売り手・買い手）のみが閲覧できるようアクセス制御を行う。
 */
import { IPriceOfferRepository } from '../domain/repositories/IPriceOfferRepository';
import { ITransactionRepository } from '../domain/repositories/ITransactionRepository';
import { PriceOfferEntity } from '../domain/priceOffer';
import { NotFoundError, ForbiddenError } from '../domain/errors';

export class GetPriceOffersUseCase {
  constructor(
    private readonly priceOfferRepository: IPriceOfferRepository,
    private readonly transactionRepository: ITransactionRepository,
  ) {}

  /**
   * 指定した取引のオファー履歴を取得する
   * @param transactionId 取引ID
   * @param requesterId リクエストしたユーザーID
   * @throws {NotFoundError} 取引が存在しない場合
   * @throws {ForbiddenError} 閲覧権限がない（当事者でない）場合
   */
  async execute(transactionId: string, requesterId: string): Promise<PriceOfferEntity[]> {
    const transaction = await this.transactionRepository.findById(transactionId);
    if (!transaction) {
      throw new NotFoundError('指定した取引が見つかりません');
    }

    const isParticipant =
      transaction.seller_id === requesterId || transaction.buyer_id === requesterId;
    if (!isParticipant) {
      throw new ForbiddenError('この取引の価格交渉履歴を閲覧する権限がありません');
    }

    return await this.priceOfferRepository.findByTransactionId(transactionId);
  }
}
