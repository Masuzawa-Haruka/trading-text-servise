/**
 * ICancellationRepository
 */
import { CancellationRequestEntity } from '../cancellation';

export interface ICancellationRepository {
  findById(id: string): Promise<CancellationRequestEntity | null>;
  findByTransactionId(transactionId: string): Promise<CancellationRequestEntity | null>;

  /**
   * キャンセルを即時実行する。
   * 1 トランザクションで以下を原子的に処理する:
   *   - Transaction.status → canceled
   *   - Item.status → available
   *   - cancellation_requests レコード作成（重複時はエラー）
   *   - Evaluation (cancel, -10) 作成
   *   - User.credit_score -= 10
   * @throws Error('INVALID_TRANSITION') 取引が scheduled 状態でない場合
   * @throws Error('ALREADY_CANCELED')   取引がすでにキャンセル済みの場合
   */
  executeCancellationAtomically(
    transactionId: string,
    itemId: string,
    requesterId: string,
    reason?: string
  ): Promise<CancellationRequestEntity>;

  /**
   * ドタキャン報告を行い、ペナルティ（-30点）付与と取引のステータス変更を原子的に行う
   * @throws Error('INVALID_TRANSITION') 取引が scheduled 状態でない場合
   * @throws Error('ALREADY_CANCELED')   取引がすでにキャンセル済みの場合
   */
  executeNoShowAtomically(
    transactionId: string,
    itemId: string,
    reporterId: string,
    targetUserId: string
  ): Promise<void>;
}
