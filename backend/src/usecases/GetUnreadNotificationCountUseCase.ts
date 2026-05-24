import { INotificationRepository } from '../domain/repositories/INotificationRepository';

export class GetUnreadNotificationCountUseCase {
  constructor(private readonly notificationRepository: INotificationRepository) {}

  async execute(userId: string): Promise<{ unread_count: number }> {
    const unreadCount = await this.notificationRepository.countUnreadByUserId(userId);
    return { unread_count: unreadCount };
  }
}
