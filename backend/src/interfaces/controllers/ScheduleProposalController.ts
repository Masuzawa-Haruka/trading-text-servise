/**
 * ScheduleProposalController
 */
import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { SendScheduleProposalUseCase } from '../../usecases/SendScheduleProposalUseCase';
import { RespondScheduleProposalUseCase } from '../../usecases/RespondScheduleProposalUseCase';
import { GetScheduleProposalsUseCase } from '../../usecases/GetScheduleProposalsUseCase';
import { NotFoundError, ForbiddenError, ValidationError } from '../../domain/errors';
import { isValidUuid, isValidIso8601 } from '../../lib/validation';

export class ScheduleProposalController {
  constructor(
    private readonly sendScheduleProposalUseCase: SendScheduleProposalUseCase,
    private readonly respondScheduleProposalUseCase: RespondScheduleProposalUseCase,
    private readonly getScheduleProposalsUseCase: GetScheduleProposalsUseCase
  ) {}

  async getProposalsByTransaction(req: AuthRequest, res: Response): Promise<void> {
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

      const proposals = await this.getScheduleProposalsUseCase.execute(transactionId, req.user.id);
      res.status(200).json(proposals);
    } catch (error) {
      this.handleError(res, error, '[ScheduleProposalController.getProposalsByTransaction]');
    }
  }

  async sendProposal(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: '認証が必要です' });
        return;
      }

      if (typeof req.body !== 'object' || req.body === null || Array.isArray(req.body)) {
        res.status(400).json({ error: 'リクエストボディはオブジェクトで指定してください' });
        return;
      }

      const { transaction_id, candidates } = req.body;

      if (!isValidUuid(transaction_id)) {
        res.status(400).json({ error: '無効な取引ID形式です' });
        return;
      }

      if (!Array.isArray(candidates) || candidates.length === 0) {
        res.status(400).json({ error: '候補は配列で1件以上指定してください' });
        return;
      }

      // 候補のバリデーション
      for (const c of candidates) {
        if (!isValidIso8601(c.proposed_datetime)) {
          res.status(400).json({ error: `無効な日時形式です: ${c.proposed_datetime}` });
          return;
        }
        if (typeof c.proposed_place !== 'string' || c.proposed_place.trim() === '') {
          res.status(400).json({ error: '場所は空でない文字列で指定してください' });
          return;
        }
      }

      await this.sendScheduleProposalUseCase.execute({
        transaction_id,
        sender_id: req.user.id,
        candidates,
      });

      res.status(201).json({ message: '提案を送信しました' });
    } catch (error) {
      this.handleError(res, error, '[ScheduleProposalController.sendProposal]');
    }
  }

  async respondToProposal(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: '認証が必要です' });
        return;
      }

      const proposalId = req.params.id;
      if (!isValidUuid(proposalId)) {
        res.status(400).json({ error: '無効な提案ID形式です' });
        return;
      }

      if (typeof req.body !== 'object' || req.body === null || Array.isArray(req.body)) {
        res.status(400).json({ error: 'リクエストボディはオブジェクトで指定してください' });
        return;
      }

      const { status, candidate_id } = req.body;
      if (status !== 'accepted' && status !== 'rejected') {
        res.status(400).json({ error: 'ステータスは accepted または rejected を指定してください' });
        return;
      }
      if (status === 'accepted' && (typeof candidate_id !== 'string' || candidate_id.trim() === '')) {
        res.status(400).json({ error: '承認する場合は candidate_id を指定してください' });
        return;
      }
      if (status === 'accepted' && !isValidUuid(candidate_id)) {
        res.status(400).json({ error: '無効な candidate_id 形式です' });
        return;
      }

      const updated = await this.respondScheduleProposalUseCase.execute(
        proposalId,
        { status, candidate_id },
        req.user.id
      );

      res.status(200).json(updated);
    } catch (error) {
      this.handleError(res, error, '[ScheduleProposalController.respondToProposal]');
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
