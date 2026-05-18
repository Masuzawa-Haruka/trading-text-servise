import { ICancellationRepository } from '../domain/repositories/ICancellationRepository';
import { ITransactionRepository } from '../domain/repositories/ITransactionRepository';
import { ReportNoShowInput } from '../domain/cancellation';
import { NotFoundError, ForbiddenError, ValidationError } from '../domain/errors';

export class ReportNoShowUseCase {
  constructor(
    private readonly cancellationRepository: ICancellationRepository,
    private readonly transactionRepository: ITransactionRepository
  ) {}

  async execute(input: ReportNoShowInput, reporterId: string): Promise<void> {
    const { transaction_id } = input;

    const transaction = await this.transactionRepository.findById(transaction_id);
    if (!transaction) {
      throw new NotFoundError('取引が見つかりません');
    }

    // 1. 権限チェック (当事者のみ)
    const isSeller = transaction.seller_id === reporterId;
    const isBuyer = transaction.buyer_id === reporterId;
    if (!isSeller && !isBuyer) {
      throw new ForbiddenError('この取引のドタキャン報告を行う権限がありません');
    }

    // 2. 取引ステータスチェック
    if (transaction.status !== 'scheduled') {
      throw new ForbiddenError('ドタキャン報告は日時確定後の取引でのみ行えます');
    }

    // 3. 予定日時チェック (約束時刻から15分経過していること)
    if (!transaction.meeting_datetime) {
      throw new ValidationError('受け渡し予定日時が設定されていません');
    }

    const meetingTime = new Date(transaction.meeting_datetime);
    const fifteenMinutesAfter = new Date(meetingTime.getTime() + 15 * 60 * 1000);
    const now = new Date();

    if (now < fifteenMinutesAfter) {
      throw new ValidationError('約束の時刻から15分経過するまではドタキャン報告を行えません');
    }

    // 4. 遅刻報告（遅刻・キャンセル申請）が無いことのチェック
    const existingRequest = await this.cancellationRepository.findByTransactionId(transaction_id);
    if (existingRequest && existingRequest.status === 'pending') {
      throw new ValidationError('現在キャンセル申請が進行中のため、ドタキャン報告は行えません');
    }

    // ペナルティの対象者を判定
    const targetUserId = isSeller ? transaction.buyer_id : transaction.seller_id;

    try {
      await this.cancellationRepository.executeNoShowAtomically(
        transaction_id,
        transaction.item_id,
        reporterId,
        targetUserId
      );
    } catch (error: any) {
      if (error.message === 'INVALID_TRANSITION') {
        throw new ValidationError('取引のステータスが不正なため、ドタキャン報告を処理できませんでした');
      }
      throw error;
    }
  }
}
