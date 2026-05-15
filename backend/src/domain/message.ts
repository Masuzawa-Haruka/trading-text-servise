/**
 * Message（取引連絡ボードのメッセージ）に関するドメイン型定義
 */

export interface MessageEntity {
  id: string;
  transaction_id: string;
  sender_id: string;
  content: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * メッセージ投稿時の入力データ
 */
export interface SendMessageInput {
  transaction_id: string;
  sender_id: string;
  content: string;
}
