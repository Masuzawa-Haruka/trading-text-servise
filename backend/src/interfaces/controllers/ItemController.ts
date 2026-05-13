/**
 * ItemController（出品コントローラー）
 *
 * HTTPリクエストの受け取り・バリデーション・レスポンス返却を担う。
 * 各リクエストを対応する UseCase に委譲し、結果をJSONで返す。
 * ビジネスロジックはすべて UseCase 層に任せ、このクラスはHTTPの入出力のみ担当する。
 */
import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { CreateItemUseCase } from '../../usecases/CreateItemUseCase';
import { GetItemsUseCase } from '../../usecases/GetItemsUseCase';
import { GetItemDetailsUseCase } from '../../usecases/GetItemDetailsUseCase';
import { UpdateItemStatusUseCase } from '../../usecases/UpdateItemStatusUseCase';
import { ItemCondition, ItemStatus, GetItemsFilter } from '../../domain/item';

export class ItemController {
  // 各ユースケースをコンストラクタで受け取ることで、依存性の注入（DI）を実現する
  constructor(
    private readonly createItemUseCase: CreateItemUseCase,
    private readonly getItemsUseCase: GetItemsUseCase,
    private readonly getItemDetailsUseCase: GetItemDetailsUseCase,
    private readonly updateItemStatusUseCase: UpdateItemStatusUseCase,
  ) {}

  /**
   * GET /api/items
   * クエリパラメータ（category, condition, status）でフィルタした出品一覧を返す。
   * 認証不要（公開エンドポイント）。
   */
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

  /**
   * GET /api/items/:id
   * URLパラメータで指定した出品の詳細情報を返す。
   * 存在しない場合は 404 を返す。
   * 認証不要（公開エンドポイント）。
   */
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

  /**
   * POST /api/items
   * 新しい出品を作成する。認証必須。
   * seller_id は JWT トークンから取得した認証ユーザーのIDを自動でセットする。
   * title と condition は必須項目のためバリデーションを行う。
   */
  createItem = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      // 認証ミドルウェアを通過していなければ 401 を返す
      if (!req.user) {
        res.status(401).json({ error: '認証が必要です' });
        return;
      }

      const { title, description, condition, category, price, image_url } = req.body;

      // 必須項目のバリデーション
      if (!title || !condition) {
        res.status(400).json({ error: 'title と condition は必須です' });
        return;
      }

      const item = await this.createItemUseCase.execute({
        seller_id: req.user.id, // 認証情報からseller_idを自動セット（クライアントから受け取らない）
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

  /**
   * PATCH /api/items/:id/status
   * 出品のステータスを変更する。認証必須・出品者本人のみ実行可能。
   * UseCase 内で本人確認を行い、他人の出品は変更できない（403）。
   * UseCase が throw したエラーの種類に応じてレスポンスを分岐する。
   */
  updateStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: '認証が必要です' });
        return;
      }

      const { status } = req.body;

      // status は必須
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
      // UseCase が throw したエラーの種類に応じてHTTPステータスを分岐
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
