/**
 * PriceOffer（価格交渉オファー）に関するドメイン型定義
 *
 * Take it or Leave it 方式の価格交渉を表現するエンティティ。
 * 1取引につき最大3回までオファーでき、3回目は「承認」か「辞退」の2択のみとなる。
 */

/** オファーのステータス */
export type OfferStatus = 'pending' | 'accepted' | 'rejected';

/** バリデーション用ホワイトリスト */
export const VALID_OFFER_STATUSES: OfferStatus[] = ['pending', 'accepted', 'rejected'];

/**
 * 価格オファーエンティティ（DBの price_offers テーブル 1 行に対応）
 */
export interface PriceOfferEntity {
  id: string;
  transaction_id: string;
  sender_id: string; // オファーを送信したユーザーID
  price: number;     // 提案価格 (0以上の整数)
  status: OfferStatus;
  offer_count: number; // このオファーが何回目か (1〜3)
  created_at: Date;
  updated_at: Date;
}

/**
 * オファー送信時に必要な入力データ
 */
export interface SendPriceOfferInput {
  transaction_id: string;
  sender_id: string;
  price: number;
}

/**
 * オファーに対する回答（承認・辞退）時に必要な入力データ
 */
export interface RespondPriceOfferInput {
  status: 'accepted' | 'rejected'; // 'pending' に戻すことはない
}
