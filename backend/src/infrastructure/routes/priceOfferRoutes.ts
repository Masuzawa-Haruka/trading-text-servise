import { Router } from 'express';
import { PriceOfferController } from '../../interfaces/controllers/PriceOfferController';
import { PriceOfferRepository } from '../repositories/PriceOfferRepository';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { SendPriceOfferUseCase } from '../../usecases/SendPriceOfferUseCase';
import { RespondPriceOfferUseCase } from '../../usecases/RespondPriceOfferUseCase';
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

const priceOfferController = new PriceOfferController(
  sendPriceOfferUseCase,
  respondPriceOfferUseCase,
  priceOfferRepository,
);

// すべてのルートに認証ミドルウェアを適用
router.use(authenticateToken);

// オファー一覧取得
// .bind(priceOfferController) を使用して、this が失われないようにする
router.get('/:transactionId', priceOfferController.getOffersByTransaction.bind(priceOfferController));

// オファー送信
router.post('/', priceOfferController.sendOffer.bind(priceOfferController));

// オファーへの回答（承認/辞退）
router.patch('/:id/respond', priceOfferController.respondToOffer.bind(priceOfferController));

export default router;
