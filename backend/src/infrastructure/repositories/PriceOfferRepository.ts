/**
 * PriceOfferRepository（価格オファーリポジトリの実装）
 *
 * Prisma Client を用いて price_offers テーブルに対するDB操作を行う。
 */
import { PriceOffer } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { IPriceOfferRepository } from '../../domain/repositories/IPriceOfferRepository';
import { PriceOfferEntity, SendPriceOfferInput, OfferStatus } from '../../domain/priceOffer';

export class PriceOfferRepository implements IPriceOfferRepository {
  /**
   * 新しいオファーを作成する（非原子的・互換用）。
   */
  async create(input: SendPriceOfferInput, offerCount: number): Promise<PriceOfferEntity> {
    const offer = await prisma.priceOffer.create({
      data: {
        transaction_id: input.transaction_id,
        sender_id: input.sender_id,
        price: input.price,
        offer_count: offerCount,
      },
    });
    return this.toEntity(offer);
  }

  /**
   * pendingチェック・回数チェック・作成を1つのDBトランザクションで原子的に行う。
   */
  async createAtomically(input: SendPriceOfferInput): Promise<PriceOfferEntity> {
    const offer = await prisma.$transaction(async (tx) => {
      // 1. 保留中のオファーがないか確認（排他制御のためFOR UPDATEなどの意図だがPrismaでは通常クエリで行う）
      const pendingOffer = await tx.priceOffer.findFirst({
        where: { transaction_id: input.transaction_id, status: 'pending' },
      });
      if (pendingOffer) {
        throw new Error('PENDING_EXISTS');
      }

      // 2. 現在の回数を取得
      const currentCount = await tx.priceOffer.count({
        where: { transaction_id: input.transaction_id },
      });
      if (currentCount >= 3) {
        throw new Error('LIMIT_EXCEEDED');
      }

      // 3. 作成
      return await tx.priceOffer.create({
        data: {
          transaction_id: input.transaction_id,
          sender_id: input.sender_id,
          price: input.price,
          offer_count: currentCount + 1,
        },
      });
    });

    return this.toEntity(offer);
  }

  /**
   * 指定したIDのオファーを1件取得する。
   */
  async findById(id: string): Promise<PriceOfferEntity | null> {
    const offer = await prisma.priceOffer.findUnique({ where: { id } });
    if (!offer) return null;
    return this.toEntity(offer);
  }

  /**
   * 取引に紐づくすべてのオファーを取得する（送信日時の昇順 = 古い順）。
   */
  async findByTransactionId(transactionId: string): Promise<PriceOfferEntity[]> {
    const offers = await prisma.priceOffer.findMany({
      where: { transaction_id: transactionId },
      orderBy: { created_at: 'asc' },
    });
    return offers.map((o) => this.toEntity(o));
  }

  /**
   * 取引に紐づくオファーの総数を取得する。
   */
  async countByTransactionId(transactionId: string): Promise<number> {
    return await prisma.priceOffer.count({
      where: { transaction_id: transactionId },
    });
  }

  /**
   * 取引に紐づく保留中（pending）のオファーを取得する。
   * pendingのオファーは同時には最大1つしか存在しない前提。
   */
  async findPendingByTransactionId(transactionId: string): Promise<PriceOfferEntity | null> {
    const offer = await prisma.priceOffer.findFirst({
      where: {
        transaction_id: transactionId,
        status: 'pending',
      },
    });
    if (!offer) return null;
    return this.toEntity(offer);
  }

  /**
   * オファーのステータスを更新する（主に rejected 用）。
   * すでに回答済みでないか（pendingか）をチェックする楽観的ロックを適用。
   */
  async updateStatus(id: string, status: OfferStatus): Promise<PriceOfferEntity> {
    const result = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.priceOffer.updateMany({
        where: { id, status: 'pending' },
        data: { status },
      });

      if (updateResult.count === 0) {
        throw new Error('ALREADY_RESPONDED');
      }

      const updated = await tx.priceOffer.findUnique({ where: { id } });
      if (!updated) throw new Error('NOT_FOUND');
      return updated;
    });

    return this.toEntity(result);
  }

  /**
   * オファー承認時に、オファーのステータスと取引の確定価格（final_price）を原子的に更新する。
   * Prisma.$transaction を用いて整合性を担保する。同一オファーへの重複回答を防ぐため updateMany を使用。
   */
  async respondAtomically(
    offerId: string,
    status: 'accepted',
    transactionId: string,
    price: number,
  ): Promise<PriceOfferEntity> {
    const result = await prisma.$transaction(async (tx) => {
      // 1. オファーのステータスを accepted に更新（pendingの場合のみ）
      const updateResult = await tx.priceOffer.updateMany({
        where: { id: offerId, transaction_id: transactionId, status: 'pending' },
        data: { status },
      });

      if (updateResult.count === 0) {
        throw new Error('ALREADY_RESPONDED');
      }

      const updatedOffer = await tx.priceOffer.findUnique({ where: { id: offerId } });
      if (!updatedOffer) throw new Error('NOT_FOUND');

      // 2. 取引の final_price を承認された金額で更新
      await tx.transaction.update({
        where: { id: transactionId },
        data: { final_price: price },
      });

      return updatedOffer;
    });

    return this.toEntity(result);
  }

  /**
   * Prisma が返すモデルをドメイン層の PriceOfferEntity に変換する。
   */
  private toEntity(offer: PriceOffer): PriceOfferEntity {
    return {
      ...offer,
      status: offer.status.toString() as OfferStatus,
    };
  }
}
