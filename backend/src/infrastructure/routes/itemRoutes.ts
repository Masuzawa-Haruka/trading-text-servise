/**
 * itemRoutes（出品ルーティングと依存性の注入）
 *
 * このファイルは2つの役割を持つ：
 * 1. Composition Root（組み立て場所）:
 *    Repository → UseCase → Controller の順にインスタンスを生成し、依存関係を繋ぎ合わせる。
 * 2. ルーティング設定:
 *    各URLパスとHTTPメソッドに対して、対応するコントローラーのメソッドをひも付ける。
 *    認証が必要なエンドポイントには authenticateToken ミドルウェアを挟む。
 */
import { Router } from 'express';
import { ItemController } from '../../interfaces/controllers/ItemController';
import { ItemRepository } from '../repositories/ItemRepository';
import { CreateItemUseCase } from '../../usecases/CreateItemUseCase';
import { GetItemsUseCase } from '../../usecases/GetItemsUseCase';
import { GetItemDetailsUseCase } from '../../usecases/GetItemDetailsUseCase';
import { UpdateItemStatusUseCase } from '../../usecases/UpdateItemStatusUseCase';
import { authenticateToken } from '../../middleware/auth';

const router = Router();

// --- 依存関係の注入 (Dependency Injection / Composition Root) ---
// 1つの ItemRepository インスタンスを全 UseCase で共有する
const itemRepository = new ItemRepository();
const itemController = new ItemController(
  new CreateItemUseCase(itemRepository),
  new GetItemsUseCase(itemRepository),
  new GetItemDetailsUseCase(itemRepository),
  new UpdateItemStatusUseCase(itemRepository),
);

// --- ルーティング定義 ---

// 出品一覧取得（認証不要・公開）
router.get('/', itemController.getItems);

// 出品詳細取得（認証不要・公開）
router.get('/:id', itemController.getItemById);

// 出品作成（認証必須）: authenticateToken が先に実行され req.user をセットする
router.post('/', authenticateToken, itemController.createItem);

// ステータス変更（認証必須・本人のみ）: UseCase 内でさらに seller_id チェックを行う
router.patch('/:id/status', authenticateToken, itemController.updateStatus);

export default router;
