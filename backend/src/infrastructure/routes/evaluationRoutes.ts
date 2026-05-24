/**
 * evaluationRoutes
 */
import { Router } from 'express';
import { EvaluationController } from '../../interfaces/controllers/EvaluationController';
import { EvaluationRepository } from '../repositories/EvaluationRepository';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { NotificationRepository } from '../repositories/NotificationRepository';
import { SubmitEvaluationUseCase } from '../../usecases/SubmitEvaluationUseCase';
import { GetEvaluationsUseCase } from '../../usecases/GetEvaluationsUseCase';
import { GetMyEvaluationsUseCase } from '../../usecases/GetMyEvaluationsUseCase';
import { authenticateToken } from '../../middleware/auth';

const router = Router();

// DI
const evaluationRepository = new EvaluationRepository();
const transactionRepository = new TransactionRepository();
const notificationRepository = new NotificationRepository();

const submitEvaluationUseCase = new SubmitEvaluationUseCase(
  evaluationRepository,
  transactionRepository,
  notificationRepository
);
const getEvaluationsUseCase = new GetEvaluationsUseCase(evaluationRepository, transactionRepository);
const getMyEvaluationsUseCase = new GetMyEvaluationsUseCase(evaluationRepository);

const controller = new EvaluationController(
  submitEvaluationUseCase,
  getEvaluationsUseCase,
  getMyEvaluationsUseCase
);

router.use(authenticateToken);

router.get('/me', controller.getMyEvaluations.bind(controller));
router.get('/by-transaction/:transactionId', controller.getEvaluationsByTransaction.bind(controller));
router.post('/', controller.submitEvaluation.bind(controller));

export default router;
