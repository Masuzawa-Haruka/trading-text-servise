import { Router } from 'express';
import { NotificationController } from '../../interfaces/controllers/NotificationController';
import { authenticateToken } from '../../middleware/auth';
import { NotificationRepository } from '../repositories/NotificationRepository';
import { GetNotificationsUseCase } from '../../usecases/GetNotificationsUseCase';
import { GetUnreadNotificationCountUseCase } from '../../usecases/GetUnreadNotificationCountUseCase';
import { MarkNotificationReadUseCase } from '../../usecases/MarkNotificationReadUseCase';

const router = Router();

const notificationRepository = new NotificationRepository();
const getNotificationsUseCase = new GetNotificationsUseCase(notificationRepository);
const getUnreadNotificationCountUseCase = new GetUnreadNotificationCountUseCase(notificationRepository);
const markNotificationReadUseCase = new MarkNotificationReadUseCase(notificationRepository);
const controller = new NotificationController(
  getNotificationsUseCase,
  getUnreadNotificationCountUseCase,
  markNotificationReadUseCase,
);

router.use(authenticateToken);

router.get('/', controller.getNotifications.bind(controller));
router.get('/unread-count', controller.getUnreadCount.bind(controller));
router.patch('/:id/read', controller.markRead.bind(controller));

export default router;
