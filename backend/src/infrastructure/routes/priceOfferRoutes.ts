import { Router } from 'express';
import { PriceOfferController } from '../../interfaces/controllers/PriceOfferController';
import { PriceOfferRepository } from '../repositories/PriceOfferRepository';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { SendPriceOfferUseCase } from '../../usecases/SendPriceOfferUseCase';
import { RespondPriceOfferUseCase } from '../../usecases/RespondPriceOfferUseCase';
import { GetPriceOffersUseCase } from '../../usecases/GetPriceOffersUseCase';
import { authenticateToken } from '../../middleware/auth';

const router = Router();

// 依存関係の組み立て
const priceOfferRepository = new PriceOfferRepository();
const transactionRepository = new TransactionRepository();

const sendPriceOfferUseCase = new SendPriceOfferUseCase(
  priceOfferRepository,
  transactionRepository,
);
const respondPriceOfferUseCase = new RespondPriceOfferUseCase(
  priceOfferRepository,
  transactionRepository,
);

const getPriceOffersUseCase = new GetPriceOffersUseCase(
  priceOfferRepository,
  transactionRepository,
);

const priceOfferController = new PriceOfferController(
  sendPriceOfferUseCase,
  respondPriceOfferUseCase,
  getPriceOffersUseCase,
);

// すべてのルートに認証ミドルウェアを適用
router.use(authenticateToken);

// オファー一覧取得
router.get('/by-transaction/:transactionId', priceOfferController.getOffersByTransaction.bind(priceOfferController));

// オファー送信
router.post('/', priceOfferController.sendOffer.bind(priceOfferController));

// オファーへの回答（承認/辞退）
router.patch('/:id/respond', priceOfferController.respondToOffer.bind(priceOfferController));

export default router;
