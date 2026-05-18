/**
 * ICancellationRepository
 */
import { CancellationRequestEntity } from '../cancellation';

export interface ICancellationRepository {
  findById(id: string): Promise<CancellationRequestEntity | null>;
  findByTransactionId(transactionId: string): Promise<CancellationRequestEntity | null>;

  /**
   * キャンセル申請を作成する
   */
  createCancellationRequest(
    transactionId: string,
    requesterId: string,
    reason?: string
  ): Promise<CancellationRequestEntity>;

  /**
   * キャンセル申請を拒否する
   */
  rejectCancellationRequest(cancellationId: string): Promise<CancellationRequestEntity>;

  /**
   * キャンセル申請を承認し、ペナルティ（-10点）付与と取引のステータス変更を原子的に行う
   * @param cancellationId キャンセル申請ID
   * @param transactionId 取引ID
   * @param itemId アイテムID
   * @param requesterId キャンセル申請者ID（ペナルティ対象）
   * @param responderId キャンセル承認者ID
   */
  acceptCancellationAtomically(
    cancellationId: string,
    transactionId: string,
    itemId: string,
    requesterId: string,
    responderId: string
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
