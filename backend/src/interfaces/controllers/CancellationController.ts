/**
 * CancellationController
 *
 * キャンセル・ドタキャン報告に関するHTTPハンドラー。
 * 旧 /request・/respond エンドポイントは廃止（cancellationRoutes.ts 参照）。
 */
import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { ExecuteCancellationUseCase } from '../../usecases/ExecuteCancellationUseCase';
import { ReportNoShowUseCase } from '../../usecases/ReportNoShowUseCase';
import { NotFoundError, ForbiddenError, ValidationError, ConflictError } from '../../domain/errors';
import { isValidUuid } from '../../lib/validation';

export class CancellationController {
  constructor(
    private readonly executeCancellationUseCase: ExecuteCancellationUseCase,
    private readonly reportNoShowUseCase: ReportNoShowUseCase
  ) {}

  /**
   * キャンセルを即時実行する
   * POST /api/cancellations/execute
   */
  async executeCancellation(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: '認証が必要です' });
        return;
      }

      if (typeof req.body !== 'object' || req.body === null || Array.isArray(req.body)) {
        res.status(400).json({ error: 'リクエストボディはオブジェクトで指定してください' });
        return;
      }

      const { transaction_id, reason } = req.body;

      if (!isValidUuid(transaction_id)) {
        res.status(400).json({ error: '無効な取引ID形式です' });
        return;
      }

      if (reason !== undefined && typeof reason !== 'string') {
        res.status(400).json({ error: '理由は文字列で指定してください' });
        return;
      }

      const result = await this.executeCancellationUseCase.execute(
        { transaction_id, reason },
        req.user.id
      );

      res.status(201).json(result);
    } catch (error) {
      this.handleError(res, error, '[CancellationController.executeCancellation]');
    }
  }

  /**
   * ドタキャン報告を送信する
   * POST /api/cancellations/no-show
   */
  async reportNoShow(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: '認証が必要です' });
        return;
      }

      if (typeof req.body !== 'object' || req.body === null || Array.isArray(req.body)) {
        res.status(400).json({ error: 'リクエストボディはオブジェクトで指定してください' });
        return;
      }

      const { transaction_id } = req.body;

      if (!isValidUuid(transaction_id)) {
        res.status(400).json({ error: '無効な取引ID形式です' });
        return;
      }

      await this.reportNoShowUseCase.execute({ transaction_id }, req.user.id);

      res.status(200).json({ message: 'ドタキャン報告を受け付け、取引を中止しました' });
    } catch (error) {
      this.handleError(res, error, '[CancellationController.reportNoShow]');
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
}
