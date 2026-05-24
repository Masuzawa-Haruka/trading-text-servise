import { CreateNotificationInput, NotificationEntity } from '../notification';

export interface INotificationRepository {
  create(input: CreateNotificationInput): Promise<NotificationEntity>;
  findByUserId(userId: string): Promise<NotificationEntity[]>;
  countUnreadByUserId(userId: string): Promise<number>;
  markRead(userId: string, notificationId: string): Promise<NotificationEntity | null>;
}
