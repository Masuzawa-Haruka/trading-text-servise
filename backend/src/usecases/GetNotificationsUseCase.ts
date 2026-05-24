import { NotificationEntity } from '../domain/notification';
import { INotificationRepository } from '../domain/repositories/INotificationRepository';

export class GetNotificationsUseCase {
  constructor(private readonly notificationRepository: INotificationRepository) {}

  async execute(userId: string): Promise<NotificationEntity[]> {
    return await this.notificationRepository.findByUserId(userId);
  }
}
