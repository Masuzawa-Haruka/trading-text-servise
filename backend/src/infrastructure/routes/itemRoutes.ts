import { Router } from 'express';
import { ItemController } from '../../interfaces/controllers/ItemController';
import { ItemRepository } from '../repositories/ItemRepository';
import { CreateItemUseCase } from '../../usecases/CreateItemUseCase';
import { GetItemsUseCase } from '../../usecases/GetItemsUseCase';
import { GetItemDetailsUseCase } from '../../usecases/GetItemDetailsUseCase';
import { UpdateItemStatusUseCase } from '../../usecases/UpdateItemStatusUseCase';
import { authenticateToken } from '../../middleware/auth';

const router = Router();

// 依存関係の注入 (Dependency Injection / Composition Root)
const itemRepository = new ItemRepository();
const itemController = new ItemController(
  new CreateItemUseCase(itemRepository),
  new GetItemsUseCase(itemRepository),
  new GetItemDetailsUseCase(itemRepository),
  new UpdateItemStatusUseCase(itemRepository),
);

// GET /api/items  - 出品一覧（認証不要・公開）
router.get('/', itemController.getItems);

// GET /api/items/:id  - 出品詳細（認証不要・公開）
router.get('/:id', itemController.getItemById);

// POST /api/items  - 出品作成（認証必須）
router.post('/', authenticateToken, itemController.createItem);

// PATCH /api/items/:id/status  - ステータス変更（認証必須・本人のみ）
router.patch('/:id/status', authenticateToken, itemController.updateStatus);

export default router;
