import { Router } from 'express';
import { CancellationController } from '../../interfaces/controllers/CancellationController';
import { CancellationRepository } from '../repositories/CancellationRepository';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { ExecuteCancellationUseCase } from '../../usecases/ExecuteCancellationUseCase';
import { ReportNoShowUseCase } from '../../usecases/ReportNoShowUseCase';
import { authenticateToken } from '../../middleware/auth';

const router = Router();

// DI
const cancellationRepository = new CancellationRepository();
const transactionRepository = new TransactionRepository();

const executeCancellationUseCase = new ExecuteCancellationUseCase(cancellationRepository, transactionRepository);
const reportNoShowUseCase = new ReportNoShowUseCase(cancellationRepository, transactionRepository);

const controller = new CancellationController(
  executeCancellationUseCase,
  reportNoShowUseCase
);

router.use(authenticateToken);

// POST /api/cancellations/execute — キャンセル即時実行
router.post('/execute', controller.executeCancellation.bind(controller));

// POST /api/cancellations/no-show — ドタキャン報告
router.post('/no-show', controller.reportNoShow.bind(controller));

export default router;
