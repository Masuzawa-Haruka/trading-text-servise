/**
 * ICancellationRepository
 */
import { CancellationRequestEntity } from '../cancellation';

export interface ICancellationRepository {
  findById(id: string): Promise<CancellationRequestEntity | null>;
  findByTransactionId(transactionId: string): Promise<CancellationRequestEntity | null>;

  /**
   * キャンセルを即時実行し、ペナルティ（-10点）付与と取引のステータス変更を原子的に行う
   * @param transactionId 取引ID
   * @param itemId アイテムID
   * @param requesterId キャンセル実行者ID（ペナルティ対象）
   * @param reason キャンセル理由
   */
  executeCancellationAtomically(
    transactionId: string,
    itemId: string,
    requesterId: string,
    reason?: string
  ): Promise<CancellationRequestEntity>;

  /**
   * ドタキャン報告を行い、ペナルティ（-30点）付与と取引のステータス変更を原子的に行う
   * @param transactionId 取引ID
   * @param itemId アイテムID
   * @param reporterId 報告者ID
   * @param targetUserId ペナルティ対象者ID
   */
  executeNoShowAtomically(
    transactionId: string,
    itemId: string,
    reporterId: string,
    targetUserId: string
  ): Promise<void>;
}
