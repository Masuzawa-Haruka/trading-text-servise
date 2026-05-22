/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { ForbiddenError, NotFoundError, ValidationError } from '../../src/domain/errors';
import { SubmitReportUseCase } from '../../src/usecases/SubmitReportUseCase';
import { TransactionEntity } from '../../src/domain/transaction';

const ids = {
  transaction: '11111111-1111-4111-8111-111111111111',
  item: '22222222-2222-4222-8222-222222222222',
  seller: '33333333-3333-4333-8333-333333333333',
  buyer: '44444444-4444-4444-8444-444444444444',
  outsider: '55555555-5555-4555-8555-555555555555',
};

test('SubmitReportUseCase creates a report when reporter is a transaction party and target is counterparty', async () => {
  let capturedInput: unknown;
  const useCase = new SubmitReportUseCase(
    {
      create: async (input) => {
        capturedInput = input;
        return {
          id: '66666666-6666-4666-8666-666666666666',
          ...input,
          created_at: new Date('2026-05-20T00:00:00.000Z'),
          updated_at: new Date('2026-05-20T00:00:00.000Z'),
        };
      },
    },
    createTransactionRepository(createTransaction()),
  );

  const report = await useCase.execute(
    {
      transaction_id: ids.transaction,
      reported_user_id: ids.seller,
      reason: 'fraud',
      detail: '代金トラブルがありました',
    },
    ids.buyer,
  );

  assert.equal(report.reporter_id, ids.buyer);
  assert.deepEqual(capturedInput, {
    transaction_id: ids.transaction,
    reporter_id: ids.buyer,
    reported_user_id: ids.seller,
    reason: 'fraud',
    detail: '代金トラブルがありました',
  });
});

test('SubmitReportUseCase rejects reports for missing transaction', async () => {
  const useCase = new SubmitReportUseCase(
    { create: async () => assert.fail('create should not be called') },
    createTransactionRepository(null),
  );

  await assert.rejects(
    () =>
      useCase.execute(
        {
          transaction_id: ids.transaction,
          reported_user_id: ids.seller,
          reason: 'fraud',
          detail: '代金トラブルがありました',
        },
        ids.buyer,
      ),
    NotFoundError,
  );
});

test('SubmitReportUseCase rejects reporters outside the transaction', async () => {
  const useCase = new SubmitReportUseCase(
    { create: async () => assert.fail('create should not be called') },
    createTransactionRepository(createTransaction()),
  );

  await assert.rejects(
    () =>
      useCase.execute(
        {
          transaction_id: ids.transaction,
          reported_user_id: ids.seller,
          reason: 'fraud',
          detail: '代金トラブルがありました',
        },
        ids.outsider,
      ),
    ForbiddenError,
  );
});

test('SubmitReportUseCase rejects target users outside the transaction counterparty', async () => {
  const useCase = new SubmitReportUseCase(
    { create: async () => assert.fail('create should not be called') },
    createTransactionRepository(createTransaction()),
  );

  await assert.rejects(
    () =>
      useCase.execute(
        {
          transaction_id: ids.transaction,
          reported_user_id: ids.outsider,
          reason: 'fraud',
          detail: '代金トラブルがありました',
        },
        ids.buyer,
      ),
    ValidationError,
  );
});

function createTransactionRepository(transaction: TransactionEntity | null) {
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

function createTransaction(): TransactionEntity {
  return {
    id: ids.transaction,
    item_id: ids.item,
    item_title: '統合テスト参考書',
    seller_id: ids.seller,
    buyer_id: ids.buyer,
    final_price: 1000,
    status: 'scheduled',
    meeting_datetime: null,
    meeting_place: null,
    seller_evaluated: false,
    buyer_evaluated: false,
    created_at: new Date('2026-05-20T00:00:00.000Z'),
    updated_at: new Date('2026-05-20T00:00:00.000Z'),
  };
}
