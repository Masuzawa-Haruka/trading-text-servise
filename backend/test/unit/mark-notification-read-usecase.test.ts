/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { NotFoundError } from '../../src/domain/errors';
import { MarkNotificationReadUseCase } from '../../src/usecases/MarkNotificationReadUseCase';

const ids = {
  user: '11111111-1111-4111-8111-111111111111',
  notification: '22222222-2222-4222-8222-222222222222',
};

test('MarkNotificationReadUseCase marks a user-owned notification as read', async () => {
  let capturedArgs: unknown[] | null = null;
  const now = new Date('2026-05-24T00:00:00.000Z');
  const useCase = new MarkNotificationReadUseCase({
    findByUserId: async () => assert.fail('not used'),
    countUnreadByUserId: async () => assert.fail('not used'),
    markRead: async (...args) => {
      capturedArgs = args;
      return {
        id: ids.notification,
        user_id: ids.user,
        actor_id: null,
        title: '日程が確定しました',
        type: 'info',
        transaction_id: null,
        is_read: true,
        created_at: now,
        updated_at: now,
      };
    },
  });

  const result = await useCase.execute(ids.user, ids.notification);

  assert.deepEqual(capturedArgs, [ids.user, ids.notification]);
  assert.equal(result.is_read, true);
});

test('MarkNotificationReadUseCase hides notifications that are not owned by the user', async () => {
  const useCase = new MarkNotificationReadUseCase({
    findByUserId: async () => assert.fail('not used'),
    countUnreadByUserId: async () => assert.fail('not used'),
    markRead: async () => null,
  });

  await assert.rejects(
    () => useCase.execute(ids.user, ids.notification),
    (error: unknown) => error instanceof NotFoundError,
  );
});
