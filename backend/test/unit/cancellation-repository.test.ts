import assert from 'node:assert/strict';
import test from 'node:test';
import { Prisma } from '@prisma/client';
import { CancellationRepository } from '../../src/infrastructure/repositories/CancellationRepository';

const ids = {
  transaction: '11111111-1111-4111-8111-111111111111',
  item: '22222222-2222-4222-8222-222222222222',
  requester: '33333333-3333-4333-8333-333333333333',
  reporter: '44444444-4444-4444-8444-444444444444',
  target: '55555555-5555-4555-8555-555555555555',
  cancellation: '66666666-6666-4666-8666-666666666666',
};

test('executeCancellationAtomically applies every side effect in one transaction', async () => {
  const { repository, tx, calls } = createRepositoryWithMockTx();

  const result = await repository.executeCancellationAtomically(
    ids.transaction,
    ids.item,
    ids.requester,
    '予定が合わなくなったため',
  );

  assert.equal(result.id, ids.cancellation);
  assert.equal(result.status, 'accepted');
  assert.deepEqual(calls, [
    'transaction.updateMany',
    'item.update',
    'cancellationRequest.create',
    'evaluation.create',
    'user.update',
  ]);
  assert.deepEqual(tx.transaction.updateManyCalls[0], {
    where: { id: ids.transaction, status: 'scheduled' },
    data: { status: 'canceled' },
  });
  assert.deepEqual(tx.item.updateCalls[0], {
    where: { id: ids.item },
    data: { status: 'available' },
  });
  assert.deepEqual(tx.cancellationRequest.createCalls[0].data, {
    transaction_id: ids.transaction,
    requester_id: ids.requester,
    reason: '予定が合わなくなったため',
    status: 'accepted',
  });
  assert.deepEqual(tx.evaluation.createCalls[0].data, {
    transaction_id: ids.transaction,
    target_user_id: ids.requester,
    reviewer_id: null,
    type: 'cancel',
    score_change: -10,
  });
  assert.deepEqual(tx.user.updateCalls[0], {
    where: { id: ids.requester },
    data: { credit_score: { decrement: 10 } },
  });
});

test('executeCancellationAtomically maps canceled optimistic-lock miss to ALREADY_CANCELED', async () => {
  const { repository, tx, calls } = createRepositoryWithMockTx({
    transactionUpdateCount: 0,
    existingTransactionStatus: 'canceled',
  });

  await assert.rejects(
    repository.executeCancellationAtomically(ids.transaction, ids.item, ids.requester),
    /ALREADY_CANCELED/,
  );
  assert.deepEqual(calls, ['transaction.updateMany', 'transaction.findUnique']);
  assert.equal(tx.item.updateCalls.length, 0);
  assert.equal(tx.evaluation.createCalls.length, 0);
  assert.equal(tx.user.updateCalls.length, 0);
});

test('executeCancellationAtomically maps non-scheduled optimistic-lock miss to INVALID_TRANSITION', async () => {
  const { repository, calls } = createRepositoryWithMockTx({
    transactionUpdateCount: 0,
    existingTransactionStatus: 'completed',
  });

  await assert.rejects(
    repository.executeCancellationAtomically(ids.transaction, ids.item, ids.requester),
    /INVALID_TRANSITION/,
  );
  assert.deepEqual(calls, ['transaction.updateMany', 'transaction.findUnique']);
});

test('executeCancellationAtomically converts only unique constraint errors to ALREADY_CANCELED', async () => {
  const uniqueError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'unit-test',
  });
  const { repository } = createRepositoryWithMockTx({
    cancellationCreateError: uniqueError,
  });

  await assert.rejects(
    repository.executeCancellationAtomically(ids.transaction, ids.item, ids.requester),
    /ALREADY_CANCELED/,
  );

  const databaseError = new Error('database unavailable');
  const failingRepository = createRepositoryWithMockTx({
    cancellationCreateError: databaseError,
  }).repository;

  await assert.rejects(
    failingRepository.executeCancellationAtomically(ids.transaction, ids.item, ids.requester),
    databaseError,
  );
});

test('executeNoShowAtomically applies reporter and target side effects', async () => {
  const { repository, tx, calls } = createRepositoryWithMockTx();

  await repository.executeNoShowAtomically(ids.transaction, ids.item, ids.reporter, ids.target);

  assert.deepEqual(calls, ['transaction.updateMany', 'item.update', 'evaluation.create', 'user.update']);
  assert.deepEqual(tx.evaluation.createCalls[0].data, {
    transaction_id: ids.transaction,
    target_user_id: ids.target,
    reviewer_id: ids.reporter,
    type: 'no_show',
    score_change: -30,
  });
  assert.deepEqual(tx.user.updateCalls[0], {
    where: { id: ids.target },
    data: { credit_score: { decrement: 30 } },
  });
});

test('executeNoShowAtomically stops side effects on optimistic-lock miss', async () => {
  const { repository, tx, calls } = createRepositoryWithMockTx({
    transactionUpdateCount: 0,
    existingTransactionStatus: 'proposing',
  });

  await assert.rejects(
    repository.executeNoShowAtomically(ids.transaction, ids.item, ids.reporter, ids.target),
    /INVALID_TRANSITION/,
  );
  assert.deepEqual(calls, ['transaction.updateMany', 'transaction.findUnique']);
  assert.equal(tx.item.updateCalls.length, 0);
  assert.equal(tx.evaluation.createCalls.length, 0);
  assert.equal(tx.user.updateCalls.length, 0);
});

function createRepositoryWithMockTx(options: {
  transactionUpdateCount?: number;
  existingTransactionStatus?: string | null;
  cancellationCreateError?: unknown;
} = {}) {
  const calls: string[] = [];
  const tx = createMockTx(calls, options);
  const db = {
    $transaction: async (callback: (transactionClient: typeof tx) => Promise<unknown>) => callback(tx),
    cancellationRequest: {
      findUnique: async () => null,
    },
  };

  return {
    repository: new CancellationRepository(db as any),
    tx,
    calls,
  };
}

function createMockTx(
  calls: string[],
  options: {
    transactionUpdateCount?: number;
    existingTransactionStatus?: string | null;
    cancellationCreateError?: unknown;
  },
) {
  const cancellationRequest = {
    id: ids.cancellation,
    transaction_id: ids.transaction,
    requester_id: ids.requester,
    reason: '予定が合わなくなったため',
    status: 'accepted',
    created_at: new Date('2026-05-22T00:00:00.000Z'),
    updated_at: new Date('2026-05-22T00:00:00.000Z'),
  };

  const tx = {
    transaction: {
      updateManyCalls: [] as unknown[],
      findUniqueCalls: [] as unknown[],
      updateMany: async (args: unknown) => {
        calls.push('transaction.updateMany');
        tx.transaction.updateManyCalls.push(args);
        return { count: options.transactionUpdateCount ?? 1 };
      },
      findUnique: async (args: unknown) => {
        calls.push('transaction.findUnique');
        tx.transaction.findUniqueCalls.push(args);
        const status = options.existingTransactionStatus ?? null;
        return status ? { status } : null;
      },
    },
    item: {
      updateCalls: [] as unknown[],
      update: async (args: unknown) => {
        calls.push('item.update');
        tx.item.updateCalls.push(args);
      },
    },
    cancellationRequest: {
      createCalls: [] as any[],
      create: async (args: any) => {
        calls.push('cancellationRequest.create');
        tx.cancellationRequest.createCalls.push(args);
        if (options.cancellationCreateError) {
          throw options.cancellationCreateError;
        }
        return cancellationRequest;
      },
    },
    evaluation: {
      createCalls: [] as any[],
      create: async (args: any) => {
        calls.push('evaluation.create');
        tx.evaluation.createCalls.push(args);
      },
    },
    user: {
      updateCalls: [] as unknown[],
      update: async (args: unknown) => {
        calls.push('user.update');
        tx.user.updateCalls.push(args);
      },
    },
  };

  return tx;
}
