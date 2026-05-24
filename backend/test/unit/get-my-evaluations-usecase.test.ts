/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { GetMyEvaluationsUseCase } from '../../src/usecases/GetMyEvaluationsUseCase';
import { ReceivedEvaluationEntity } from '../../src/domain/evaluation';

const userId = '11111111-1111-4111-8111-111111111111';

test('GetMyEvaluationsUseCase returns visible received evaluations for the authenticated user', async () => {
  const now = new Date('2026-05-24T00:00:00.000Z');
  const visibleEvaluations: ReceivedEvaluationEntity[] = [
    {
      id: '22222222-2222-4222-8222-222222222222',
      transaction_id: '33333333-3333-4333-8333-333333333333',
      target_user_id: userId,
      reviewer_id: '44444444-4444-4444-8444-444444444444',
      score_change: 10,
      type: 'good',
      item_title: '線形代数',
      created_at: now,
      updated_at: now,
    },
  ];
  let capturedUserId: string | null = null;
  const useCase = new GetMyEvaluationsUseCase({
    findByTransactionId: async () => assert.fail('not used'),
    findVisibleReceivedByUserId: async (inputUserId) => {
      capturedUserId = inputUserId;
      return visibleEvaluations;
    },
    submitEvaluationAtomically: async () => assert.fail('not used'),
  });

  const result = await useCase.execute(userId);

  assert.equal(capturedUserId, userId);
  assert.deepEqual(result, visibleEvaluations);
});
