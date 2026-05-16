/**
 * MessageController
 */
import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { SendMessageUseCase } from '../../usecases/SendMessageUseCase';
import { GetMessagesUseCase } from '../../usecases/GetMessagesUseCase';
import { NotFoundError, ForbiddenError, ValidationError } from '../../domain/errors';
import { isValidUuid } from '../../lib/validation';

export class MessageController {
  constructor(
    private readonly sendMessageUseCase: SendMessageUseCase,
    private readonly getMessagesUseCase: GetMessagesUseCase
  ) {}

  /**
   * メッセージ一覧を取得する
   * GET /api/messages/by-transaction/:transactionId
   */
  async getMessagesByTransaction(req: AuthRequest, res: Response): Promise<void> {
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

      const messages = await this.getMessagesUseCase.execute(transactionId, req.user.id);
      res.status(200).json(messages);
    } catch (error) {
      this.handleError(res, error, '[MessageController.getMessagesByTransaction]');
    }
  }

  /**
   * メッセージを投稿する
   * POST /api/messages
   */
  async sendMessage(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: '認証が必要です' });
        return;
      }

      // Copilot 指摘：req.body の型チェック
      if (typeof req.body !== 'object' || req.body === null || Array.isArray(req.body)) {
        res.status(400).json({ error: 'リクエストボディはオブジェクトで指定してください' });
        return;
      }

      const { transaction_id, content } = req.body;

      if (!isValidUuid(transaction_id)) {
        res.status(400).json({ error: '無効な取引ID形式です' });
        return;
      }

      const message = await this.sendMessageUseCase.execute({
        transaction_id,
        sender_id: req.user.id,
        content,
      });

      res.status(201).json(message);
    } catch (error) {
      this.handleError(res, error, '[MessageController.sendMessage]');
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
