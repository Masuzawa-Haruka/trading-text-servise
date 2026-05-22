import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { SubmitReportUseCase } from '../../usecases/SubmitReportUseCase';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../domain/errors';
import { isValidUuid } from '../../lib/validation';

const REPORT_REASONS = new Set(['user_behavior', 'fake_item', 'fraud', 'cancel', 'other']);
const MAX_DETAIL_LENGTH = 1000;
const MAX_EVIDENCE_IMAGES = 5;

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

      const { transaction_id, reported_user_id, reason, detail, evidence_image_urls } = req.body;

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

      const normalizedEvidenceImageUrls = this.normalizeEvidenceImageUrls(evidence_image_urls);
      if (normalizedEvidenceImageUrls instanceof ValidationError) {
        res.status(400).json({ error: normalizedEvidenceImageUrls.message });
        return;
      }

      const report = await this.submitReportUseCase.execute(
        {
          transaction_id,
          reported_user_id,
          reason,
          detail: normalizedDetail,
          evidence_image_urls: normalizedEvidenceImageUrls,
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
    if (error instanceof ConflictError) {
      res.status(409).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }

  private normalizeEvidenceImageUrls(value: unknown): string[] | ValidationError {
    if (value === undefined) {
      return [];
    }

    if (!Array.isArray(value)) {
      return new ValidationError('証拠画像URLは配列で指定してください');
    }

    if (value.length > MAX_EVIDENCE_IMAGES) {
      return new ValidationError('証拠画像は最大5枚まで添付できます');
    }

    const urls: string[] = [];
    for (const imageUrl of value) {
      if (typeof imageUrl !== 'string') {
        return new ValidationError('証拠画像URLは文字列で指定してください');
      }

      const normalizedUrl = imageUrl.trim();
      if (!this.isValidHttpUrl(normalizedUrl)) {
        return new ValidationError('証拠画像URLはHTTP(S)のURLで指定してください');
      }

      urls.push(normalizedUrl);
    }

    return urls;
  }

  private isValidHttpUrl(value: string): boolean {
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }
}
