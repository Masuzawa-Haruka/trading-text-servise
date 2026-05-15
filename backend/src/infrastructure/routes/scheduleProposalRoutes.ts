/**
 * scheduleProposalRoutes
 */
import { Router } from 'express';
import { ScheduleProposalController } from '../../interfaces/controllers/ScheduleProposalController';
import { ScheduleProposalRepository } from '../repositories/ScheduleProposalRepository';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { SendScheduleProposalUseCase } from '../../usecases/SendScheduleProposalUseCase';
import { RespondScheduleProposalUseCase } from '../../usecases/RespondScheduleProposalUseCase';
import { GetScheduleProposalsUseCase } from '../../usecases/GetScheduleProposalsUseCase';
import { authenticateToken } from '../../middleware/auth';

const router = Router();

// DI
const scheduleProposalRepository = new ScheduleProposalRepository();
const transactionRepository = new TransactionRepository();

const sendScheduleProposalUseCase = new SendScheduleProposalUseCase(
  scheduleProposalRepository,
  transactionRepository
);
const respondScheduleProposalUseCase = new RespondScheduleProposalUseCase(
  scheduleProposalRepository,
  transactionRepository
);
const getScheduleProposalsUseCase = new GetScheduleProposalsUseCase(
  scheduleProposalRepository,
  transactionRepository
);

const controller = new ScheduleProposalController(
  sendScheduleProposalUseCase,
  respondScheduleProposalUseCase,
  getScheduleProposalsUseCase
);

router.use(authenticateToken);

router.get('/by-transaction/:transactionId', controller.getProposalsByTransaction.bind(controller));
router.post('/', controller.sendProposal.bind(controller));
router.patch('/:id/respond', controller.respondToProposal.bind(controller));

export default router;
