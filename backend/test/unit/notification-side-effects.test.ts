/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { RespondPriceOfferUseCase } from '../../src/usecases/RespondPriceOfferUseCase';
import { SendMessageUseCase } from '../../src/usecases/SendMessageUseCase';
import { SendPriceOfferUseCase } from '../../src/usecases/SendPriceOfferUseCase';
import { SendScheduleProposalUseCase } from '../../src/usecases/SendScheduleProposalUseCase';
import { SubmitEvaluationUseCase } from '../../src/usecases/SubmitEvaluationUseCase';
import { CreateNotificationInput } from '../../src/domain/notification';
import { TransactionEntity } from '../../src/domain/transaction';

const ids = {
  transaction: '11111111-1111-4111-8111-111111111111',
  item: '22222222-2222-4222-8222-222222222222',
  seller: '33333333-3333-4333-8333-333333333333',
  buyer: '44444444-4444-4444-8444-444444444444',
};

const offerId = '77777777-7777-4777-8777-777777777777';

test('SendMessageUseCase creates a notification for the counterparty', async () => {
  const notifications: unknown[] = [];
  const useCase = new SendMessageUseCase(
    {
      create: async (transactionId, senderId, content) => ({
        id: '55555555-5555-4555-8555-555555555555',
        transaction_id: transactionId,
        sender_id: senderId,
        content,
        created_at: new Date('2026-05-24T00:00:00.000Z'),
        updated_at: new Date('2026-05-24T00:00:00.000Z'),
      }),
      findByTransactionId: async () => assert.fail('not used'),
    },
    createTransactionRepository(createTransaction({ status: 'scheduled' })),
    createNotificationRepository(notifications),
  );

  await useCase.execute({
    transaction_id: ids.transaction,
    sender_id: ids.buyer,
    content: 'よろしくお願いします',
  });

  assert.deepEqual(notifications, [
    {
      user_id: ids.seller,
      actor_id: ids.buyer,
      title: '取引メッセージが届きました',
      type: 'info',
      transaction_id: ids.transaction,
    },
  ]);
});

test('SendScheduleProposalUseCase creates an action-required notification for the counterparty', async () => {
  const notifications: unknown[] = [];
  const useCase = new SendScheduleProposalUseCase(
    {
      replaceProposalsAtomically: async () => undefined,
    } as any,
    createTransactionRepository(createTransaction({ status: 'proposing' })),
    createNotificationRepository(notifications),
  );

  await useCase.execute({
    transaction_id: ids.transaction,
    sender_id: ids.seller,
    candidates: [
      {
        proposed_datetime: '2026-05-25T10:00:00.000Z',
        proposed_place: '総合図書館前',
      },
    ],
  });

  assert.deepEqual(notifications, [
    {
      user_id: ids.buyer,
      actor_id: ids.seller,
      title: '日程提案が届いています',
      type: 'action_required',
      transaction_id: ids.transaction,
    },
  ]);
});

test('SendPriceOfferUseCase creates an action-required notification for the counterparty', async () => {
  const notifications: unknown[] = [];
  const useCase = new SendPriceOfferUseCase(
    {
      create: async () => assert.fail('not used'),
      createAtomically: async (input) => ({
        id: offerId,
        ...input,
        status: 'pending',
        offer_count: 1,
        created_at: new Date('2026-05-24T00:00:00.000Z'),
        updated_at: new Date('2026-05-24T00:00:00.000Z'),
      }),
      findById: async () => assert.fail('not used'),
      findByTransactionId: async () => assert.fail('not used'),
      countByTransactionId: async () => assert.fail('not used'),
      findPendingByTransactionId: async () => assert.fail('not used'),
      updateStatus: async () => assert.fail('not used'),
      respondAtomically: async () => assert.fail('not used'),
    },
    createTransactionRepository(createTransaction({ status: 'proposing' })),
    createNotificationRepository(notifications),
  );

  await useCase.execute({
    transaction_id: ids.transaction,
    sender_id: ids.buyer,
    price: 300,
  });

  assert.deepEqual(notifications, [
    {
      user_id: ids.seller,
      actor_id: ids.buyer,
      title: '価格提案が届いています',
      type: 'action_required',
      transaction_id: ids.transaction,
    },
  ]);
});

test('RespondPriceOfferUseCase creates a notification for the offer sender when accepted', async () => {
  const notifications: unknown[] = [];
  const useCase = new RespondPriceOfferUseCase(
    {
      create: async () => assert.fail('not used'),
      createAtomically: async () => assert.fail('not used'),
      findById: async () => ({
        id: offerId,
        transaction_id: ids.transaction,
        sender_id: ids.buyer,
        price: 300,
        status: 'pending',
        offer_count: 1,
        created_at: new Date('2026-05-24T00:00:00.000Z'),
        updated_at: new Date('2026-05-24T00:00:00.000Z'),
      }),
      findByTransactionId: async () => assert.fail('not used'),
      countByTransactionId: async () => assert.fail('not used'),
      findPendingByTransactionId: async () => assert.fail('not used'),
      updateStatus: async () => assert.fail('not used'),
      respondAtomically: async () => ({
        id: offerId,
        transaction_id: ids.transaction,
        sender_id: ids.buyer,
        price: 300,
        status: 'accepted',
        offer_count: 1,
        created_at: new Date('2026-05-24T00:00:00.000Z'),
        updated_at: new Date('2026-05-24T00:00:00.000Z'),
      }),
    },
    createTransactionRepository(createTransaction({ status: 'proposing' })),
    createNotificationRepository(notifications),
  );

  await useCase.execute(offerId, { status: 'accepted' }, ids.seller);

  assert.deepEqual(notifications, [
    {
      user_id: ids.buyer,
      actor_id: ids.seller,
      title: '価格提案が承認されました',
      type: 'info',
      transaction_id: ids.transaction,
    },
  ]);
});

test('SubmitEvaluationUseCase asks the counterparty to submit evaluation when only one side has evaluated', async () => {
  const notifications: unknown[] = [];
  const useCase = new SubmitEvaluationUseCase(
    {
      findByTransactionId: async () => assert.fail('not used'),
      findVisibleReceivedByUserId: async () => assert.fail('not used'),
      submitEvaluationAtomically: async () => ({
        id: '55555555-5555-4555-8555-555555555555',
        transaction_id: ids.transaction,
        target_user_id: ids.seller,
        reviewer_id: ids.buyer,
        score_change: 10,
        type: 'good',
        created_at: new Date('2026-05-24T00:00:00.000Z'),
        updated_at: new Date('2026-05-24T00:00:00.000Z'),
      }),
    },
    createTransactionRepository(createTransaction({ status: 'scheduled' })),
    createNotificationRepository(notifications),
  );

  await useCase.execute({ transaction_id: ids.transaction, type: 'good' }, ids.buyer);

  assert.deepEqual(notifications, [
    {
      user_id: ids.seller,
      actor_id: ids.buyer,
      title: '取引評価を送信してください',
      type: 'action_required',
      transaction_id: ids.transaction,
    },
  ]);
});

test('notification creation failure does not fail the primary message action', async () => {
  const useCase = new SendMessageUseCase(
    {
      create: async (transactionId, senderId, content) => ({
        id: '55555555-5555-4555-8555-555555555555',
        transaction_id: transactionId,
        sender_id: senderId,
        content,
        created_at: new Date('2026-05-24T00:00:00.000Z'),
        updated_at: new Date('2026-05-24T00:00:00.000Z'),
      }),
      findByTransactionId: async () => assert.fail('not used'),
    },
    createTransactionRepository(createTransaction({ status: 'scheduled' })),
    {
      create: async () => {
        throw new Error('notification insert failed');
      },
      findByUserId: async () => assert.fail('not used'),
      countUnreadByUserId: async () => assert.fail('not used'),
      markRead: async () => assert.fail('not used'),
    } as any,
  );

  const message = await withoutConsoleError(() =>
    useCase.execute({
      transaction_id: ids.transaction,
      sender_id: ids.buyer,
      content: '通知が落ちても本文は送れる',
    }),
  );

  assert.equal(message.content, '通知が落ちても本文は送れる');
});

function createTransactionRepository(transaction: TransactionEntity) {
  return {
    create: async () => assert.fail('not used'),
    createAtomically: async () => assert.fail('not used'),
    findByItemId: async () => assert.fail('not used'),
    findByUserId: async () => assert.fail('not used'),
    findById: async () => transaction,
    findByItemAndBuyer: async () => assert.fail('not used'),
    update: async () => assert.fail('not used'),
    updateWithItemSync: async () => assert.fail('not used'),
  };
}

function createNotificationRepository(notifications: unknown[]) {
  return {
    create: async (input: CreateNotificationInput) => {
      notifications.push(input);
      return {
        id: '66666666-6666-4666-8666-666666666666',
        user_id: input.user_id,
        actor_id: input.actor_id ?? null,
        title: input.title,
        type: input.type,
        transaction_id: input.transaction_id ?? null,
        is_read: false,
        created_at: new Date('2026-05-24T00:00:00.000Z'),
        updated_at: new Date('2026-05-24T00:00:00.000Z'),
      };
    },
    findByUserId: async () => assert.fail('not used'),
    countUnreadByUserId: async () => assert.fail('not used'),
    markRead: async () => assert.fail('not used'),
  };
}

function createTransaction(overrides: Partial<TransactionEntity> = {}): TransactionEntity {
  return {
    id: ids.transaction,
    item_id: ids.item,
    item_title: '通知テスト参考書',
    seller_id: ids.seller,
    buyer_id: ids.buyer,
    final_price: 1000,
    status: 'scheduled',
    meeting_datetime: null,
    meeting_place: null,
    seller_evaluated: false,
    buyer_evaluated: false,
    created_at: new Date('2026-05-24T00:00:00.000Z'),
    updated_at: new Date('2026-05-24T00:00:00.000Z'),
    ...overrides,
  };
}

async function withoutConsoleError<T>(callback: () => Promise<T>): Promise<T> {
  const original = console.error;
  console.error = () => undefined;
  try {
    return await callback();
  } finally {
    console.error = original;
  }
}
