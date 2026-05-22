import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { SubmitReportUseCase } from '../../usecases/SubmitReportUseCase';
import { ForbiddenError, NotFoundError, ValidationError } from '../../domain/errors';
import { isValidUuid } from '../../lib/validation';

const REPORT_REASONS = new Set(['user_behavior', 'fake_item', 'fraud', 'cancel', 'other']);
const MAX_DETAIL_LENGTH = 1000;

export class ReportController {
  constructor(private readonly submitReportUseCase: SubmitReportUseCase) {}

  async submitReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: '認証が必要です' });
        return;
      }

      if (typeof req.body !== 'object' || req.body === null || Array.isArray(req.body)) {
        res.status(400).json({ error: 'リクエストボディはオブジェクトで指定してください' });
        return;
      }

      const { transaction_id, reported_user_id, reason, detail } = req.body;

      if (!isValidUuid(transaction_id)) {
        res.status(400).json({ error: '無効な取引ID形式です' });
        return;
      }

      if (!isValidUuid(reported_user_id)) {
        res.status(400).json({ error: '無効な対象ユーザーID形式です' });
        return;
      }

      if (typeof reason !== 'string' || !REPORT_REASONS.has(reason)) {
        res.status(400).json({ error: '通報内容を選択してください' });
        return;
      }

      if (typeof detail !== 'string') {
        res.status(400).json({ error: '詳細内容は文字列で指定してください' });
        return;
      }

      const normalizedDetail = detail.trim();
      if (normalizedDetail.length === 0 || normalizedDetail.length > MAX_DETAIL_LENGTH) {
        res.status(400).json({ error: '詳細内容は1文字以上1000文字以内で入力してください' });
        return;
      }

      const report = await this.submitReportUseCase.execute(
        {
          transaction_id,
          reported_user_id,
          reason,
          detail: normalizedDetail,
        },
        req.user.id,
      );

      res.status(201).json(report);
    } catch (error) {
      this.handleError(res, error, '[ReportController.submitReport]');
    }
  }

  private handleError(res: Response, error: unknown, context: string): void {
    console.error(context, error);
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error instanceof ForbiddenError) {
      res.status(403).json({ error: error.message });
      return;
    }
    if (error instanceof ValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}
