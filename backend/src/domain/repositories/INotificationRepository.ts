import { NotificationEntity } from '../notification';

export interface INotificationRepository {
  findByUserId(userId: string): Promise<NotificationEntity[]>;
  countUnreadByUserId(userId: string): Promise<number>;
  markRead(userId: string, notificationId: string): Promise<NotificationEntity | null>;
}
