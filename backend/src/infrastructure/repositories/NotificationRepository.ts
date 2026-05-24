import { Notification } from '@prisma/client';
import { NotificationEntity, NotificationType } from '../../domain/notification';
import { INotificationRepository } from '../../domain/repositories/INotificationRepository';
import { prisma } from '../../lib/prisma';

export class NotificationRepository implements INotificationRepository {
  async findByUserId(userId: string): Promise<NotificationEntity[]> {
    const notifications = await prisma.notification.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });

    return notifications.map((notification) => this.toEntity(notification));
  }

  async countUnreadByUserId(userId: string): Promise<number> {
    return await prisma.notification.count({
      where: {
        user_id: userId,
        is_read: false,
      },
    });
  }

  async markRead(userId: string, notificationId: string): Promise<NotificationEntity | null> {
    const result = await prisma.notification.updateMany({
      where: {
        id: notificationId,
        user_id: userId,
      },
      data: { is_read: true },
    });

    if (result.count === 0) {
      return null;
    }

    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        user_id: userId,
      },
    });

    return notification ? this.toEntity(notification) : null;
  }

  private toEntity(notification: Notification): NotificationEntity {
    return {
      ...notification,
      type: notification.type as NotificationType,
    };
  }
}
