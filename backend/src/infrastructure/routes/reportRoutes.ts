import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { ReportController } from '../../interfaces/controllers/ReportController';
import { ReportRepository } from '../repositories/ReportRepository';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { SubmitReportUseCase } from '../../usecases/SubmitReportUseCase';

const router = Router();

const reportRepository = new ReportRepository();
const transactionRepository = new TransactionRepository();
const submitReportUseCase = new SubmitReportUseCase(reportRepository, transactionRepository);
const controller = new ReportController(submitReportUseCase);

router.post('/', authenticateToken, controller.submitReport.bind(controller));

export default router;
