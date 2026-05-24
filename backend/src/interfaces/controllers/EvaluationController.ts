/**
 * EvaluationController
 */
import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { SubmitEvaluationUseCase } from '../../usecases/SubmitEvaluationUseCase';
import { GetEvaluationsUseCase } from '../../usecases/GetEvaluationsUseCase';
import { GetMyEvaluationsUseCase } from '../../usecases/GetMyEvaluationsUseCase';
import { NotFoundError, ForbiddenError, ValidationError } from '../../domain/errors';
import { isValidUuid } from '../../lib/validation';

export class EvaluationController {
  constructor(
    private readonly submitEvaluationUseCase: SubmitEvaluationUseCase,
    private readonly getEvaluationsUseCase: GetEvaluationsUseCase,
    private readonly getMyEvaluationsUseCase: GetMyEvaluationsUseCase
  ) {}

  /**
   * 認証ユーザーが受けた評価履歴を取得する
   * GET /api/evaluations/me
   */
  async getMyEvaluations(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: '認証が必要です' });
        return;
      }

      const evaluations = await this.getMyEvaluationsUseCase.execute(req.user.id);
      res.status(200).json(evaluations);
    } catch (error) {
      this.handleError(res, error, '[EvaluationController.getMyEvaluations]');
    }
  }

  /**
   * 評価一覧を取得する
   * GET /api/evaluations/by-transaction/:transactionId
   */
  async getEvaluationsByTransaction(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { transactionId } = req.params;
      if (!isValidUuid(transactionId)) {
        res.status(400).json({ error: '無効な取引ID形式です' });
        return;
      }

      if (!req.user) {
        res.status(401).json({ error: '認証が必要です' });
        return;
      }

      const evaluations = await this.getEvaluationsUseCase.execute(transactionId, req.user.id);
      res.status(200).json(evaluations);
    } catch (error) {
      this.handleError(res, error, '[EvaluationController.getEvaluationsByTransaction]');
    }
  }

  /**
   * 評価を送信する
   * POST /api/evaluations
   */
  async submitEvaluation(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: '認証が必要です' });
        return;
      }

      if (typeof req.body !== 'object' || req.body === null || Array.isArray(req.body)) {
        res.status(400).json({ error: 'リクエストボディはオブジェクトで指定してください' });
        return;
      }

      const { transaction_id, type } = req.body;

      if (!isValidUuid(transaction_id)) {
        res.status(400).json({ error: '無効な取引ID形式です' });
        return;
      }

      if (type !== 'good' && type !== 'bad') {
        res.status(400).json({ error: '評価は good または bad を指定してください' });
        return;
      }

      const evaluation = await this.submitEvaluationUseCase.execute({
        transaction_id,
        type,
      }, req.user.id);

      res.status(201).json(evaluation);
    } catch (error) {
      this.handleError(res, error, '[EvaluationController.submitEvaluation]');
    }
  }

  private handleError(res: Response, error: unknown, context: string): void {
    console.error(context, error);
    if (error instanceof Error) {
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
    }
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}
