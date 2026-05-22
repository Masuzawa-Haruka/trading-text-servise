/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { GetTransactionUseCase } from '../../src/usecases/GetTransactionUseCase';
import { ForbiddenError, NotFoundError } from '../../src/domain/errors';
import { TransactionEntity } from '../../src/domain/transaction';

const ids = {
  transaction: '11111111-1111-4111-8111-111111111111',
  item: '22222222-2222-4222-8222-222222222222',
  seller: '33333333-3333-4333-8333-333333333333',
  buyer: '44444444-4444-4444-8444-444444444444',
  outsider: '55555555-5555-4555-8555-555555555555',
};

test('GetTransactionUseCase returns the transaction for a participant', async () => {
  const transaction = createTransaction();
  const useCase = new GetTransactionUseCase(createRepository(transaction));

  const result = await useCase.execute(ids.transaction, ids.buyer);

  assert.deepEqual(result, transaction);
});

test('GetTransactionUseCase rejects non-participants', async () => {
  const useCase = new GetTransactionUseCase(createRepository(createTransaction()));

  await assert.rejects(
    useCase.execute(ids.transaction, ids.outsider),
    (error: unknown) => error instanceof ForbiddenError,
  );
});

test('GetTransactionUseCase returns NotFoundError when the transaction does not exist', async () => {
  const useCase = new GetTransactionUseCase(createRepository(null));

  await assert.rejects(
    useCase.execute(ids.transaction, ids.buyer),
    (error: unknown) => error instanceof NotFoundError,
  );
});

function createRepository(transaction: TransactionEntity | null) {
  return {
    findById: async () => transaction,
  } as any;
}

function createTransaction(): TransactionEntity {
  const now = new Date('2026-05-22T00:00:00.000Z');
  return {
    id: ids.transaction,
    item_id: ids.item,
    seller_id: ids.seller,
    buyer_id: ids.buyer,
    final_price: null,
    status: 'proposing',
    meeting_datetime: null,
    meeting_place: null,
    seller_evaluated: false,
    buyer_evaluated: false,
    created_at: now,
    updated_at: now,
  };
}
