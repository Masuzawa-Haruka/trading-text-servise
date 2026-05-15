/**
 * MessageRepository
 */
import { prisma } from '../../lib/prisma';
import { IMessageRepository } from '../../domain/repositories/IMessageRepository';
import { MessageEntity } from '../../domain/message';

export class MessageRepository implements IMessageRepository {
  async create(transactionId: string, senderId: string, content: string): Promise<MessageEntity> {
    const message = await prisma.message.create({
      data: {
        transaction_id: transactionId,
        sender_id: senderId,
        content: content,
      },
    });
    return message;
  }

  async findByTransactionId(transactionId: string): Promise<MessageEntity[]> {
    const messages = await prisma.message.findMany({
      where: { transaction_id: transactionId },
      orderBy: { created_at: 'asc' },
    });
    return messages;
  }
}
