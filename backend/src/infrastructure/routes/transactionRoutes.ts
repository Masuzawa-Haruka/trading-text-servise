/**
 * transactionRoutes（取引ルーティングと依存性の注入）
 *
 * Composition Root として、Repository → UseCase → Controller の
 * 依存関係を組み立て、各エンドポイントへのルーティングを定義する。
 * すべてのエンドポイントは認証必須（authenticateToken ミドルウェアを全体に適用）。
 */
import { Router } from 'express';
import { TransactionController } from '../../interfaces/controllers/TransactionController';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { ItemRepository } from '../repositories/ItemRepository';
import { CreateTransactionUseCase } from '../../usecases/CreateTransactionUseCase';
import { GetTransactionsUseCase } from '../../usecases/GetTransactionsUseCase';
import { UpdateTransactionUseCase } from '../../usecases/UpdateTransactionUseCase';
import { authenticateToken } from '../../middleware/auth';

const router = Router();

// --- 依存関係の注入 (Dependency Injection / Composition Root) ---
const transactionRepository = new TransactionRepository();
// CreateTransactionUseCase は出品存在チェックのため ItemRepository も必要
const itemRepository = new ItemRepository();

const transactionController = new TransactionController(
  new CreateTransactionUseCase(transactionRepository, itemRepository),
  new GetTransactionsUseCase(transactionRepository),
  new UpdateTransactionUseCase(transactionRepository),
);

// --- ルーティング定義 ---
// 取引は全エンドポイントで認証必須のため、router レベルで一括適用する
router.use(authenticateToken);

// 自分が関わる取引一覧取得
router.get('/', transactionController.getTransactions);

// マッチング申し込み（取引作成）
router.post('/', transactionController.createTransaction);

// 取引情報更新（ステータス変更・受け渡し情報設定）
router.patch('/:id', transactionController.updateTransaction);

export default router;
