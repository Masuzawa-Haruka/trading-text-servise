/**
 * IMessageRepository
 */
import { MessageEntity } from '../message';

export interface IMessageRepository {
  /**
   * メッセージを保存する
   */
  create(transactionId: string, senderId: string, content: string): Promise<MessageEntity>;

  /**
   * 取引に紐づくメッセージ一覧を古い順（作成日時昇順）で取得する
   */
  findByTransactionId(transactionId: string): Promise<MessageEntity[]>;
}
