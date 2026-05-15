/**
 * IScheduleProposalRepository
 */
import { ScheduleProposalEntity, ScheduleCandidateInput, ProposalStatus } from '../scheduleProposal';

export interface IScheduleProposalRepository {
  /**
   * 既存の保留中候補を一括却下し、新しい候補を一括作成する（原子的操作）
   */
  replaceProposalsAtomically(
    transactionId: string,
    senderId: string,
    candidates: ScheduleCandidateInput[]
  ): Promise<void>;

  /**
   * 特定の候補を取得する
   */
  findById(id: string): Promise<ScheduleProposalEntity | null>;

  /**
   * 取引に紐づく候補一覧を取得する
   */
  findByTransactionId(transactionId: string): Promise<ScheduleProposalEntity[]>;

  /**
   * 単一候補のステータスをrejectedに更新する（原子的操作）
   */
  rejectProposalAtomically(id: string): Promise<ScheduleProposalEntity>;

  /**
   * 提案の承認と取引情報の更新を原子的に行う
   */
  acceptProposalAtomically(
    proposalId: string,
    transactionId: string,
    acceptedDatetime: Date,
    acceptedPlace: string
  ): Promise<ScheduleProposalEntity>;


}
