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
import {
  ItemCondition,
  Campus,
  ItemStatus,
  GetItemsFilter,
  VALID_ITEM_STATUSES,
  VALID_ITEM_CONDITIONS,
  VALID_CAMPUSES,
} from '../../domain/item';
import { NotFoundError, ForbiddenError, ValidationError } from '../../domain/errors';
import { INT32_MAX } from '../../lib/validation';

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
   * クエリパラメータ（q, category, condition, status）でフィルタした出品一覧を返す。
   * 認証不要（公開エンドポイント）。
   * 想定外の値のクエリパラメータは無視してフィルタ未指定として扱う（ホワイトリスト検証）。
   */
  getItems = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const rawCategory = req.query.category;
      const rawCampus = req.query.campus;
      const rawCondition = req.query.condition;
      const rawStatus = req.query.status;
      const rawQ = req.query.q;

      const filter: GetItemsFilter = {
        // 文字列かつホワイトリスト内の値のみ受け付ける
        q: normalizeQueryString(rawQ),
        category: normalizeQueryString(rawCategory),
        campus:
          typeof rawCampus === 'string' && VALID_CAMPUSES.includes(rawCampus as Campus)
            ? (rawCampus as Campus)
            : undefined,
        condition:
          typeof rawCondition === 'string' && VALID_ITEM_CONDITIONS.includes(rawCondition as ItemCondition)
            ? (rawCondition as ItemCondition)
            : undefined,
        status:
          typeof rawStatus === 'string' && VALID_ITEM_STATUSES.includes(rawStatus as ItemStatus)
            ? (rawStatus as ItemStatus)
            : undefined,
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
   * title は非空文字列、condition はホワイトリスト内の値であることを検証する。
   */
  createItem = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      // 認証ミドルウェアを通過していなければ 401 を返す
      if (!req.user) {
        res.status(401).json({ error: '認証が必要です' });
        return;
      }

      if (typeof req.body !== 'object' || req.body === null || Array.isArray(req.body)) {
        res.status(400).json({ error: 'リクエストボディはオブジェクトで指定してください' });
        return;
      }

      const { title, author, description, condition, campus, handoff_location, category, price, image_urls } = req.body;

      // title: 非空文字列であることを検証
      if (typeof title !== 'string' || title.trim() === '') {
        res.status(400).json({ error: 'title は空でない文字列で指定してください' });
        return;
      }

      const normalizedAuthor = normalizeOptionalString(author);
      if (normalizedAuthor === false) {
        res.status(400).json({ error: 'author は文字列で指定してください' });
        return;
      }

      const normalizedDescription = normalizeOptionalString(description);
      if (normalizedDescription === false) {
        res.status(400).json({ error: 'description は文字列で指定してください' });
        return;
      }

      const normalizedCategory = normalizeOptionalString(category);
      if (normalizedCategory === false) {
        res.status(400).json({ error: 'category は文字列で指定してください' });
        return;
      }

      const normalizedHandoffLocation = normalizeOptionalString(handoff_location);
      if (normalizedHandoffLocation === false) {
        res.status(400).json({ error: 'handoff_location は文字列で指定してください' });
        return;
      }
      if (!normalizedHandoffLocation) {
        res.status(400).json({ error: 'handoff_location は空でない文字列で指定してください' });
        return;
      }
      if (normalizedHandoffLocation.length > 100) {
        res.status(400).json({ error: 'handoff_location は100文字以内で指定してください' });
        return;
      }

      // condition: 許容値（ホワイトリスト）内であることを検証
      if (!VALID_ITEM_CONDITIONS.includes(condition)) {
        res.status(400).json({
          error: `condition は ${VALID_ITEM_CONDITIONS.join(', ')} のいずれかで指定してください`,
        });
        return;
      }

      if (!VALID_CAMPUSES.includes(campus)) {
        res.status(400).json({
          error: `campus は ${VALID_CAMPUSES.join(', ')} のいずれかで指定してください`,
        });
        return;
      }

      if (
        price !== undefined &&
        (typeof price !== 'number' ||
          !Number.isInteger(price) ||
          price < 0 ||
          price > INT32_MAX)
      ) {
        res.status(400).json({
          error: `price は 0 以上 ${INT32_MAX} 以下の整数で指定してください`,
        });
        return;
      }

      let normalizedImageUrls: string[] | undefined;
      // image_urls: 文字列配列かつ最大5枚、各URLは空でない文字列であることを検証
      if (image_urls !== undefined) {
        if (!Array.isArray(image_urls)) {
          res.status(400).json({ error: 'image_urls は文字列の配列で指定してください' });
          return;
        }
        if (image_urls.length > 5) {
          res.status(400).json({ error: '画像は最大5枚まで登録できます' });
          return;
        }
        if (image_urls.some((url) => typeof url !== 'string' || url.trim() === '')) {
          res.status(400).json({ error: 'image_urls の各要素は空でない文字列で指定してください' });
          return;
        }
        normalizedImageUrls = image_urls.map((url) => url.trim());
      }

      const item = await this.createItemUseCase.execute({
        seller_id: req.user.id, // 認証情報からseller_idを自動セット（クライアントから受け取らない）
        title: title.trim(),
        author: normalizedAuthor,
        description: normalizedDescription,
        condition,
        campus,
        handoff_location: normalizedHandoffLocation,
        category: normalizedCategory,
        price,
        image_urls: normalizedImageUrls,
      });
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
      } else if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else if (error instanceof ForbiddenError) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal Server Error' });
      }
    }
  };

  /**
   * PATCH /api/items/:id/status
   * 出品のステータスを変更する。認証必須・出品者本人のみ実行可能。
   * status はホワイトリスト検証を行い不正値は 400 を返す。
   * UseCase が throw した NotFoundError / ForbiddenError を instanceof で判定してレスポンスを分岐する。
   */
  updateStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: '認証が必要です' });
        return;
      }

      const { status } = req.body;

      // status: 許容値（ホワイトリスト）内であることを検証
      if (!status || !VALID_ITEM_STATUSES.includes(status)) {
        res.status(400).json({
          error: `status は ${VALID_ITEM_STATUSES.join(', ')} のいずれかで指定してください`,
        });
        return;
      }

      const item = await this.updateItemStatusUseCase.execute(
        req.params.id as string,
        status as ItemStatus,
        req.user.id,
      );
      res.status(200).json(item);
    } catch (error) {
      // 文字列比較ではなく instanceof で判定することで、メッセージ変更による事故を防ぐ
      if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else if (error instanceof ForbiddenError) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal Server Error' });
      }
    }
  };
}

function normalizeOptionalString(value: unknown): string | undefined | false {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'string') {
    return false;
  }

  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function normalizeQueryString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}
