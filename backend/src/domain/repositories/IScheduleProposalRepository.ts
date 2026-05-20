/**
 * IScheduleProposalRepository
 */
import { ScheduleProposalEntity, ScheduleCandidateInput } from '../scheduleProposal';

export interface IScheduleProposalRepository {
  /**
   * 既存の保留中提案を一括却下し、新しい提案（親レコード）と複数の日時候補を一括作成する（原子的操作）
   */
  replaceProposalsAtomically(
    transactionId: string,
    senderId: string,
    candidates: ScheduleCandidateInput[]
  ): Promise<void>;

  /**
   * 特定の提案を取得する（日時候補含む）
   */
  findById(id: string): Promise<ScheduleProposalEntity | null>;

  /**
   * 取引に紐づく提案一覧を取得する（日時候補含む）
   */
  findByTransactionId(transactionId: string): Promise<ScheduleProposalEntity[]>;

  /**
   * 提案全体を却下する（原子的操作。親レコードと全候補のステータスを rejected に更新する）
   */
  rejectProposalAtomically(proposalId: string): Promise<ScheduleProposalEntity>;

  /**
   * 提案の特定候補を承認し、その他の候補・他提案を却下、取引情報を更新する（原子的操作）
   */
  acceptProposalAtomically(
    proposalId: string,
    transactionId: string,
    candidateId: string
  ): Promise<ScheduleProposalEntity>;
}

