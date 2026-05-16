/**
 * evaluationRoutes
 */
import { Router } from 'express';
import { EvaluationController } from '../../interfaces/controllers/EvaluationController';
import { EvaluationRepository } from '../repositories/EvaluationRepository';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { SubmitEvaluationUseCase } from '../../usecases/SubmitEvaluationUseCase';
import { GetEvaluationsUseCase } from '../../usecases/GetEvaluationsUseCase';
import { authenticateToken } from '../../middleware/auth';

const router = Router();

// DI
const evaluationRepository = new EvaluationRepository();
const transactionRepository = new TransactionRepository();

const submitEvaluationUseCase = new SubmitEvaluationUseCase(evaluationRepository, transactionRepository);
const getEvaluationsUseCase = new GetEvaluationsUseCase(evaluationRepository, transactionRepository);

const controller = new EvaluationController(submitEvaluationUseCase, getEvaluationsUseCase);

router.use(authenticateToken);

router.get('/by-transaction/:transactionId', controller.getEvaluationsByTransaction.bind(controller));
router.post('/', controller.submitEvaluation.bind(controller));

export default router;
