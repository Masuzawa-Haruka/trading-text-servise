/**
 * PriceOfferController
 *
 * クライアントからの価格交渉（PriceOffer）に関するHTTPリクエストを受け付け、
 * バリデーションを行った後、UseCase層に処理を委譲する。
 */
import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { SendPriceOfferUseCase } from '../../usecases/SendPriceOfferUseCase';
import { RespondPriceOfferUseCase } from '../../usecases/RespondPriceOfferUseCase';
import { GetPriceOffersUseCase } from '../../usecases/GetPriceOffersUseCase';
import { IPriceOfferRepository } from '../../domain/repositories/IPriceOfferRepository';
import { NotFoundError, ForbiddenError, ValidationError } from '../../domain/errors';
import { isValidUuid, INT32_MAX } from '../../lib/validation';

export class PriceOfferController {
  constructor(
    private readonly sendPriceOfferUseCase: SendPriceOfferUseCase,
    private readonly respondPriceOfferUseCase: RespondPriceOfferUseCase,
    private readonly getPriceOffersUseCase: GetPriceOffersUseCase,
  ) {}

  /**
   * 取引に紐づくオファーの一覧を取得する。
   * (GET /api/price-offers/:transactionId)
   */
  async getOffersByTransaction(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { transactionId } = req.params;

      if (typeof transactionId !== 'string' || !isValidUuid(transactionId)) {
        res.status(400).json({ error: '無効な取引ID形式です' });
        return;
      }

      if (!req.user) {
        res.status(401).json({ error: '認証が必要です' });
        return;
      }

      const offers = await this.getPriceOffersUseCase.execute(transactionId, req.user.id);
      
      res.status(200).json(offers);
    } catch (error) {
      console.error('[PriceOfferController.getOffersByTransaction]', error);

      if (error instanceof Error) {
        if (error instanceof NotFoundError) {
          res.status(404).json({ error: error.message });
          return;
        }
        if (error instanceof ForbiddenError) {
          res.status(403).json({ error: error.message });
          return;
        }
      }

      res.status(500).json({ error: 'サーバーエラーが発生しました' });
    }
  }

  /**
   * 新しい価格オファーを送信する。
   * (POST /api/price-offers)
   */
  async sendOffer(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: '認証が必要です' });
        return;
      }
      const senderId = req.user.id;

      // req.body のオブジェクトチェック
      if (typeof req.body !== 'object' || req.body === null || Array.isArray(req.body)) {
        res.status(400).json({ error: 'リクエストボディはオブジェクトで指定してください' });
        return;
      }

      const { transaction_id, price } = req.body;

      // バリデーション
      if (typeof transaction_id !== 'string' || !isValidUuid(transaction_id)) {
        res.status(400).json({ error: '無効な取引ID形式です' });
        return;
      }
      if (typeof price !== 'number' || !Number.isInteger(price) || price < 0 || price > INT32_MAX) {
        res.status(400).json({ error: '価格は0以上、上限以下の整数で指定してください' });
        return;
      }

      // ユースケースの実行
      const offer = await this.sendPriceOfferUseCase.execute({
        transaction_id,
        sender_id: senderId,
        price,
      });

      res.status(201).json(offer);
    } catch (error) {
      console.error('[PriceOfferController.sendOffer]', error);

      if (error instanceof Error) {
        if (error instanceof NotFoundError) {
          res.status(404).json({ error: error.message });
          return;
        }
        if (error instanceof ForbiddenError) {
          res.status(403).json({ error: error.message });
          return;
        }
        if (error instanceof ValidationError) {
          res.status(400).json({ error: error.message });
          return;
        }
      }

      res.status(500).json({ error: 'サーバーエラーが発生しました' });
    }
  }

  /**
   * 受信したオファーに対して回答（承認/辞退）する。
   * (PATCH /api/price-offers/:id/respond)
   */
  async respondToOffer(req: AuthRequest, res: Response): Promise<void> {
    try {
      const offerId = req.params.id;
      if (typeof offerId !== 'string' || !isValidUuid(offerId)) {
        res.status(400).json({ error: '無効なオファーID形式です' });
        return;
      }

      if (!req.user) {
        res.status(401).json({ error: '認証が必要です' });
        return;
      }
      const requesterId = req.user.id;

      if (typeof req.body !== 'object' || req.body === null || Array.isArray(req.body)) {
        res.status(400).json({ error: 'リクエストボディはオブジェクトで指定してください' });
        return;
      }

      const { status } = req.body;

      // ステータスは accepted か rejected のみ許可
      if (status !== 'accepted' && status !== 'rejected') {
        res.status(400).json({ error: 'ステータスは accepted または rejected を指定してください' });
        return;
      }

      // ユースケースの実行
      const updatedOffer = await this.respondPriceOfferUseCase.execute(
        offerId,
        { status },
        requesterId,
      );

      res.status(200).json(updatedOffer);
    } catch (error) {
      console.error('[PriceOfferController.respondToOffer]', error);

      if (error instanceof Error) {
        if (error instanceof NotFoundError) {
          res.status(404).json({ error: error.message });
          return;
        }
        if (error instanceof ForbiddenError) {
          res.status(403).json({ error: error.message });
          return;
        }
        if (error instanceof ValidationError) {
          res.status(400).json({ error: error.message });
          return;
        }
      }

      res.status(500).json({ error: 'サーバーエラーが発生しました' });
    }
  }
}
