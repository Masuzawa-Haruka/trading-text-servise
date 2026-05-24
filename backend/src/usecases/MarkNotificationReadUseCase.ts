import { NotificationEntity } from '../domain/notification';
import { INotificationRepository } from '../domain/repositories/INotificationRepository';
import { NotFoundError } from '../domain/errors';

export class MarkNotificationReadUseCase {
  constructor(private readonly notificationRepository: INotificationRepository) {}

  async execute(userId: string, notificationId: string): Promise<NotificationEntity> {
    const notification = await this.notificationRepository.markRead(userId, notificationId);
    if (!notification) {
      throw new NotFoundError('通知が見つかりません');
    }

    return notification;
  }
}
