import { Router } from 'express';
import { CancellationController } from '../../interfaces/controllers/CancellationController';
import { CancellationRepository } from '../repositories/CancellationRepository';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { RequestCancellationUseCase } from '../../usecases/RequestCancellationUseCase';
import { RespondCancellationUseCase } from '../../usecases/RespondCancellationUseCase';
import { ReportNoShowUseCase } from '../../usecases/ReportNoShowUseCase';
import { authenticateToken } from '../../middleware/auth';

const router = Router();

// DI
const cancellationRepository = new CancellationRepository();
const transactionRepository = new TransactionRepository();

const requestCancellationUseCase = new RequestCancellationUseCase(cancellationRepository, transactionRepository);
const respondCancellationUseCase = new RespondCancellationUseCase(cancellationRepository, transactionRepository);
const reportNoShowUseCase = new ReportNoShowUseCase(cancellationRepository, transactionRepository);

const controller = new CancellationController(
  requestCancellationUseCase,
  respondCancellationUseCase,
  reportNoShowUseCase
);

router.use(authenticateToken);

router.post('/request', controller.requestCancellation.bind(controller));
router.post('/respond', controller.respondCancellation.bind(controller));
router.post('/no-show', controller.reportNoShow.bind(controller));

export default router;
