import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { CreateItemUseCase } from '../../usecases/CreateItemUseCase';
import { GetItemsUseCase } from '../../usecases/GetItemsUseCase';
import { GetItemDetailsUseCase } from '../../usecases/GetItemDetailsUseCase';
import { UpdateItemStatusUseCase } from '../../usecases/UpdateItemStatusUseCase';
import { ItemCondition, ItemStatus, GetItemsFilter } from '../../domain/item';

export class ItemController {
  constructor(
    private readonly createItemUseCase: CreateItemUseCase,
    private readonly getItemsUseCase: GetItemsUseCase,
    private readonly getItemDetailsUseCase: GetItemDetailsUseCase,
    private readonly updateItemStatusUseCase: UpdateItemStatusUseCase,
  ) {}

  // GET /api/items?category=xxx&condition=xxx
  getItems = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const filter: GetItemsFilter = {
        category: req.query.category as string | undefined,
        condition: req.query.condition as ItemCondition | undefined,
        status: req.query.status as ItemStatus | undefined,
      };
      const items = await this.getItemsUseCase.execute(filter);
      res.status(200).json(items);
    } catch {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };

  // GET /api/items/:id
  getItemById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const item = await this.getItemDetailsUseCase.execute(req.params.id as string);
      if (!item) {
        res.status(404).json({ error: '出品が見つかりません' });
        return;
      }
      res.status(200).json(item);
    } catch {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };

  // POST /api/items  (要認証)
  createItem = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: '認証が必要です' });
        return;
      }
      const { title, description, condition, category, price, image_url } = req.body;
      if (!title || !condition) {
        res.status(400).json({ error: 'title と condition は必須です' });
        return;
      }
      const item = await this.createItemUseCase.execute({
        seller_id: req.user.id,
        title,
        description,
        condition,
        category,
        price,
        image_url,
      });
      res.status(201).json(item);
    } catch {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };

  // PATCH /api/items/:id/status  (要認証・本人のみ)
  updateStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: '認証が必要です' });
        return;
      }
      const { status } = req.body;
      if (!status) {
        res.status(400).json({ error: 'status は必須です' });
        return;
      }
      const item = await this.updateItemStatusUseCase.execute(
        req.params.id as string,
        status as ItemStatus,
        req.user.id,
      );
      res.status(200).json(item);
    } catch (error: any) {
      if (error.message === 'NOT_FOUND') {
        res.status(404).json({ error: '出品が見つかりません' });
      } else if (error.message === 'FORBIDDEN') {
        res.status(403).json({ error: '変更権限がありません' });
      } else {
        res.status(500).json({ error: 'Internal Server Error' });
      }
    }
  };
}
