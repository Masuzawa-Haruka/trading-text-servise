/**
 * TransactionController（取引コントローラー）
 *
 * HTTPリクエストの受け取り・バリデーション・レスポンス返却を担う。
 * バリデーション方針（4鉄則）：
 * 1. Enum はホワイトリスト（VALID_TRANSACTION_STATUSES）で検証し、as キャストは使わない
 * 2. req.body の型・存在を明示的にチェックし、不正値は必ず 400 を返す
 * 3. エラーは instanceof で分岐し、文字列比較に依存しない
 * 4. 認証チェックは先頭で行い、req.user が確認できなければ即 401 を返す
 */
import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { CreateTransactionUseCase } from '../../usecases/CreateTransactionUseCase';
import { GetTransactionsUseCase } from '../../usecases/GetTransactionsUseCase';
import { UpdateTransactionUseCase } from '../../usecases/UpdateTransactionUseCase';
import { VALID_TRANSACTION_STATUSES } from '../../domain/transaction';
import { NotFoundError, ForbiddenError } from '../../domain/errors';

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
   * 認証必須。item_id は必須項目としてバリデーションを行う。
   */
  createTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: '認証が必要です' });
        return;
      }

      const { item_id } = req.body;

      // item_id: 非空文字列であることを検証
      if (typeof item_id !== 'string' || item_id.trim() === '') {
        res.status(400).json({ error: 'item_id は空でない文字列で指定してください' });
        return;
      }

      const transaction = await this.createTransactionUseCase.execute(
        item_id.trim(),
        req.user.id, // buyer_id は認証情報から自動セット（クライアントから受け取らない）
      );
      res.status(201).json(transaction);
    } catch (error) {
      // instanceof で分岐し、文字列比較に依存しない
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
   * 認証必須。status はホワイトリスト検証、meeting_datetime は ISO8601 形式を確認する。
   */
  updateTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: '認証が必要です' });
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

      // status: 指定された場合はホワイトリスト検証
      if (status !== undefined && !VALID_TRANSACTION_STATUSES.includes(status)) {
        res.status(400).json({
          error: `status は ${VALID_TRANSACTION_STATUSES.join(', ')} のいずれかで指定してください`,
        });
        return;
      }

      // final_price: 指定された場合は 0 以上の整数であることを検証
      if (final_price !== undefined && (typeof final_price !== 'number' || final_price < 0 || !Number.isInteger(final_price))) {
        res.status(400).json({ error: 'final_price は 0 以上の整数で指定してください' });
        return;
      }

      // meeting_datetime: 指定された場合は ISO8601 形式であることを検証
      if (meeting_datetime !== undefined) {
        if (typeof meeting_datetime !== 'string' || isNaN(Date.parse(meeting_datetime))) {
          res.status(400).json({ error: 'meeting_datetime は ISO8601 形式の日時文字列で指定してください' });
          return;
        }
      }

      // meeting_place: 指定された場合は非空文字列であることを検証
      if (meeting_place !== undefined && (typeof meeting_place !== 'string' || meeting_place.trim() === '')) {
        res.status(400).json({ error: 'meeting_place は空でない文字列で指定してください' });
        return;
      }

      const transaction = await this.updateTransactionUseCase.execute(
        req.params.id as string,
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
