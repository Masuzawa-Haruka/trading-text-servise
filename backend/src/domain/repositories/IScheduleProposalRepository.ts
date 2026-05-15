/**
 * IScheduleProposalRepository
 */
import { ScheduleProposalEntity, ScheduleCandidateInput, ProposalStatus } from '../scheduleProposal';

export interface IScheduleProposalRepository {
  /**
   * 複数の候補を一括作成する
   */
  createMany(
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
   * 取引に紐づく保留中の候補をすべて却下する
   */
  rejectAllPendingByTransactionId(transactionId: string): Promise<void>;

  /**
   * 提案の承認と取引情報の更新を原子的に行う
   */
  acceptProposalAtomically(
    proposalId: string,
    transactionId: string,
    acceptedDatetime: Date,
    acceptedPlace: string
  ): Promise<ScheduleProposalEntity>;

  /**
   * 単一候補のステータスを更新する
   */
  updateStatus(id: string, status: ProposalStatus): Promise<ScheduleProposalEntity>;
}
