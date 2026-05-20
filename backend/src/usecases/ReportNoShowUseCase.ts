/**
 * ReportNoShowUseCase（ドタキャン報告ユースケース）
 *
 * POST /api/cancellations/no-show に対応する。
 * 約束時刻から 15 分経過後に報告可能。
 * 報告者の相手側に -30 点のペナルティを付与する。
 *
 * 副作用（すべて 1 トランザクション）:
 *   - Transaction.status → canceled
 *   - Item.status → available
 *   - Evaluation（no_show, -30）作成
 *   - 相手の credit_score -= 30
 */
import { ICancellationRepository } from '../domain/repositories/ICancellationRepository';
import { ITransactionRepository } from '../domain/repositories/ITransactionRepository';
import { NotFoundError, ForbiddenError, ValidationError, ConflictError } from '../domain/errors';

export interface ReportNoShowInput {
  transaction_id: string;
}

export class ReportNoShowUseCase {
  constructor(
    private readonly cancellationRepository: ICancellationRepository,
    private readonly transactionRepository: ITransactionRepository
  ) {}

  async execute(input: ReportNoShowInput, reporterId: string): Promise<void> {
    const { transaction_id } = input;

    // 1. 取引の存在確認
    const transaction = await this.transactionRepository.findById(transaction_id);
    if (!transaction) {
      throw new NotFoundError('取引が見つかりません');
    }

    // 2. 権限チェック（当事者のみ）
    const isSeller = transaction.seller_id === reporterId;
    const isBuyer = transaction.buyer_id === reporterId;
    if (!isSeller && !isBuyer) {
      throw new ForbiddenError('この取引のドタキャン報告を行う権限がありません');
    }

    // 3. 取引ステータスチェック（状態競合 → 409）
    if (transaction.status === 'canceled') {
      throw new ConflictError('この取引はすでにキャンセル済みです');
    }
    if (transaction.status !== 'scheduled') {
      throw new ConflictError('ドタキャン報告は日時確定後（scheduled）の取引でのみ行えます');
    }

    // 4. 受け渡し予定日時チェック（入力不正 → 400）
    if (!transaction.meeting_datetime) {
      throw new ValidationError('受け渡し予定日時が設定されていません');
    }

    const meetingTime = new Date(transaction.meeting_datetime);
    const fifteenMinutesAfter = new Date(meetingTime.getTime() + 15 * 60 * 1000);
    if (new Date() < fifteenMinutesAfter) {
      throw new ValidationError('約束の時刻から15分経過するまではドタキャン報告を行えません');
    }

    // 5. ペナルティ対象者（報告者の相手側）を判定
    const targetUserId = isSeller ? transaction.buyer_id : transaction.seller_id;

    try {
      await this.cancellationRepository.executeNoShowAtomically(
        transaction_id,
        transaction.item_id,
        reporterId,
        targetUserId
      );
    } catch (error: any) {
      if (error.message === 'ALREADY_CANCELED') {
        throw new ConflictError('この取引はすでにキャンセル済みです');
      }
      if (error.message === 'INVALID_TRANSITION') {
        throw new ConflictError('ドタキャン報告は日時確定後（scheduled）の取引でのみ行えます');
      }
      throw error;
    }
  }
}
