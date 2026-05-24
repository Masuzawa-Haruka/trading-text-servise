/**
 * messageRoutes
 */
import { Router } from 'express';
import { MessageController } from '../../interfaces/controllers/MessageController';
import { MessageRepository } from '../repositories/MessageRepository';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { NotificationRepository } from '../repositories/NotificationRepository';
import { SendMessageUseCase } from '../../usecases/SendMessageUseCase';
import { GetMessagesUseCase } from '../../usecases/GetMessagesUseCase';
import { authenticateToken } from '../../middleware/auth';

const router = Router();

// DI
const messageRepository = new MessageRepository();
const transactionRepository = new TransactionRepository();
const notificationRepository = new NotificationRepository();

const sendMessageUseCase = new SendMessageUseCase(
  messageRepository,
  transactionRepository,
  notificationRepository
);
const getMessagesUseCase = new GetMessagesUseCase(messageRepository, transactionRepository);

const controller = new MessageController(sendMessageUseCase, getMessagesUseCase);

router.use(authenticateToken);

router.get('/by-transaction/:transactionId', controller.getMessagesByTransaction.bind(controller));
router.post('/', controller.sendMessage.bind(controller));

export default router;
