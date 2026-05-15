/**
 * IPriceOfferRepository（価格オファーリポジトリのインターフェース）
 *
 * UseCase 層が依存する抽象。
 * 依存関係逆転の原則（DIP）に従い、DBの具体的な実装（Prisma等）を隠蔽する。
 */
import { PriceOfferEntity, SendPriceOfferInput, OfferStatus } from '../priceOffer';

export interface IPriceOfferRepository {
  /** 新しいオファーを作成する */
  create(input: SendPriceOfferInput, offerCount: number): Promise<PriceOfferEntity>;

  /** 指定したIDのオファーを1件取得する */
  findById(id: string): Promise<PriceOfferEntity | null>;

  /** 指定した取引に紐づくすべてのオファーを取得する（作成日時昇順など） */
  findByTransactionId(transactionId: string): Promise<PriceOfferEntity[]>;

  /** 指定した取引に紐づく現在のオファーの数（pending/accepted/rejected全て含む）を取得する */
  countByTransactionId(transactionId: string): Promise<number>;

  /** 指定した取引に紐づく保留中（pending）のオファーを取得する。なければ null */
  findPendingByTransactionId(transactionId: string): Promise<PriceOfferEntity | null>;

  /** オファーのステータスを更新する（辞退の場合などに使用） */
  updateStatus(id: string, status: OfferStatus): Promise<PriceOfferEntity>;

  /**
   * オファー承認時に、オファーのステータスを 'accepted' にし、
   * 同時に取引（Transaction）の 'final_price' を更新する原子的操作。
   */
  respondAtomically(offerId: string, status: 'accepted', transactionId: string, price: number): Promise<PriceOfferEntity>;
}
