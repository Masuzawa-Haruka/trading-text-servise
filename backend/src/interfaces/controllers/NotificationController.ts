import { Response } from 'express';
import { NotFoundError } from '../../domain/errors';
import { isValidUuid } from '../../lib/validation';
import { AuthRequest } from '../../middleware/auth';
import { GetNotificationsUseCase } from '../../usecases/GetNotificationsUseCase';
import { GetUnreadNotificationCountUseCase } from '../../usecases/GetUnreadNotificationCountUseCase';
import { MarkNotificationReadUseCase } from '../../usecases/MarkNotificationReadUseCase';

export class NotificationController {
  constructor(
    private readonly getNotificationsUseCase: GetNotificationsUseCase,
    private readonly getUnreadNotificationCountUseCase: GetUnreadNotificationCountUseCase,
    private readonly markNotificationReadUseCase: MarkNotificationReadUseCase,
  ) {}

  async getNotifications(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: '認証が必要です' });
        return;
      }

      const notifications = await this.getNotificationsUseCase.execute(req.user.id);
      res.status(200).json(notifications);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async getUnreadCount(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: '認証が必要です' });
        return;
      }

      const result = await this.getUnreadNotificationCountUseCase.execute(req.user.id);
      res.status(200).json(result);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async markRead(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: '認証が必要です' });
        return;
      }

      const { id } = req.params;
      if (!isValidUuid(id)) {
        res.status(400).json({ error: '無効な通知ID形式です' });
        return;
      }

      const notification = await this.markNotificationReadUseCase.execute(req.user.id, id);
      res.status(200).json(notification);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private handleError(res: Response, error: unknown): void {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Internal Server Error' });
  }
}
