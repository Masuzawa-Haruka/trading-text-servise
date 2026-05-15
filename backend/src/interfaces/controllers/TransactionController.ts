/**
 * TransactionController（取引コントローラー）
 *
 * HTTPリクエストの受け取り・バリデーション・レスポンス返却を担う。
 * バリデーション方針（4鉄則 + 追加修正）：
 * 1. Enum はホワイトリスト（VALID_TRANSACTION_STATUSES）で検証し、as キャストは使わない
 * 2. req.body がオブジェクトかどうかを分割代入の前に確認し、null/Array を除外する
 * 3. UUID パラメータは正規表現で形式検証し、不正形式は 400 を返す
 * 4. meeting_datetime は ISO8601 正規表現で厳密に検証する（Date.parse 単体では不十分）
 * 5. final_price は Prisma Int の上限（INT32_MAX）も検証する
 * 6. エラーは instanceof で分岐し、文字列比較に依存しない
 */
import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { CreateTransactionUseCase } from '../../usecases/CreateTransactionUseCase';
import { GetTransactionsUseCase } from '../../usecases/GetTransactionsUseCase';
import { UpdateTransactionUseCase } from '../../usecases/UpdateTransactionUseCase';
import { VALID_TRANSACTION_STATUSES } from '../../domain/transaction';
import { NotFoundError, ForbiddenError } from '../../domain/errors';
import { isValidUuid, isValidIso8601, INT32_MAX } from '../../lib/validation';

export class TransactionController {
  constructor(
    private readonly createTransactionUseCase: CreateTransactionUseCase,
    private readonly getTransactionsUseCase: GetTransactionsUseCase,
    private readonly updateTransactionUseCase: UpdateTransactionUseCase,
  ) {}

  /**
   * GET /api/transactions
   * 認証ユーザーが関わる取引一覧（売り手・買い手どちらも含む）を返す。
   * 認証必須。
   */
  getTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: '認証が必要です' });
        return;
      }
      const transactions = await this.getTransactionsUseCase.execute(req.user.id);
      res.status(200).json(transactions);
    } catch {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };

  /**
   * POST /api/transactions
   * 購入希望者が出品に対してマッチングを申し込む。
   * 認証必須。item_id は UUID 形式必須。
   */
  createTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: '認証が必要です' });
        return;
      }

      // req.body がオブジェクトでなければ分割代入前に弾く（JSON null や配列の TypeError 防止）
      if (typeof req.body !== 'object' || req.body === null || Array.isArray(req.body)) {
        res.status(400).json({ error: 'リクエストボディはオブジェクトで指定してください' });
        return;
      }

      const { item_id } = req.body;

      // item_id: UUID v4 形式であることを検証（非 UUID はPrismaがDBエラーを返し 500 になるため）
      if (!isValidUuid(item_id)) {
        res.status(400).json({ error: 'item_id は有効な UUID 形式で指定してください' });
        return;
      }

      const transaction = await this.createTransactionUseCase.execute(
        item_id,
        req.user.id, // buyer_id は認証情報から自動セット（クライアントから受け取らない）
      );
      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else if (error instanceof ForbiddenError) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal Server Error' });
      }
    }
  };

  /**
   * PATCH /api/transactions/:id
   * 取引の当事者（売り手または買い手）が取引情報を更新する。
   * 認証必須。:id は UUID 形式必須。
   * status はホワイトリスト検証、meeting_datetime は ISO8601 正規表現で厳密に検証する。
   */
  updateTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: '認証が必要です' });
        return;
      }

      // :id パラメータの UUID 形式検証（非 UUID は Prisma DB エラー → 500 になるため事前に弾く）
      if (!isValidUuid(req.params.id)) {
        res.status(400).json({ error: 'id は有効な UUID 形式で指定してください' });
        return;
      }

      // req.body がオブジェクトでなければ分割代入前に弾く（JSON null や配列の TypeError 防止）
      if (typeof req.body !== 'object' || req.body === null || Array.isArray(req.body)) {
        res.status(400).json({ error: 'リクエストボディはオブジェクトで指定してください' });
        return;
      }

      const { status, final_price, meeting_datetime, meeting_place } = req.body;

      // 少なくとも1つのフィールドが必要
      if (
        status === undefined &&
        final_price === undefined &&
        meeting_datetime === undefined &&
        meeting_place === undefined
      ) {
        res.status(400).json({
          error: 'status, final_price, meeting_datetime, meeting_place のいずれかを指定してください',
        });
        return;
      }

      // status: 指定された場合はホワイトリスト検証（as キャストは使わない）
      if (status !== undefined && !VALID_TRANSACTION_STATUSES.includes(status)) {
        res.status(400).json({
          error: `status は ${VALID_TRANSACTION_STATUSES.join(', ')} のいずれかで指定してください`,
        });
        return;
      }

      // final_price: 0 以上かつ Prisma Int 上限（32bit 符号付き整数）以内の整数を検証
      if (
        final_price !== undefined &&
        (typeof final_price !== 'number' ||
          !Number.isInteger(final_price) ||
          final_price < 0 ||
          final_price > INT32_MAX)
      ) {
        res.status(400).json({
          error: `final_price は 0 以上 ${INT32_MAX} 以下の整数で指定してください`,
        });
        return;
      }

      // meeting_datetime: ISO8601 正規表現で厳密に検証（Date.parse だけでは非標準形式が通過する）
      if (meeting_datetime !== undefined && !isValidIso8601(meeting_datetime)) {
        res.status(400).json({
          error: 'meeting_datetime は ISO8601 形式（例: 2026-05-14T10:00:00+09:00）で指定してください',
        });
        return;
      }

      // meeting_place: 指定された場合は非空文字列であることを検証
      if (
        meeting_place !== undefined &&
        (typeof meeting_place !== 'string' || meeting_place.trim() === '')
      ) {
        res.status(400).json({ error: 'meeting_place は空でない文字列で指定してください' });
        return;
      }

      const transaction = await this.updateTransactionUseCase.execute(
        req.params.id,
        {
          status,
          final_price,
          meeting_datetime,
          meeting_place: meeting_place?.trim(),
        },
        req.user.id,
      );
      res.status(200).json(transaction);
    } catch (error) {
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
