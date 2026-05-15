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
   * 新しいオファーを作成する。
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
   */
  async updateStatus(id: string, status: OfferStatus): Promise<PriceOfferEntity> {
    const offer = await prisma.priceOffer.update({
      where: { id },
      data: { status },
    });
    return this.toEntity(offer);
  }

  /**
   * オファー承認時に、オファーのステータスと取引の確定価格（final_price）を原子的に更新する。
   * Prisma.$transaction を用いて整合性を担保する。
   */
  async respondAtomically(
    offerId: string,
    status: 'accepted',
    transactionId: string,
    price: number,
  ): Promise<PriceOfferEntity> {
    const result = await prisma.$transaction(async (tx) => {
      // 1. オファーのステータスを accepted に更新
      const updatedOffer = await tx.priceOffer.update({
        where: { id: offerId },
        data: { status },
      });

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
