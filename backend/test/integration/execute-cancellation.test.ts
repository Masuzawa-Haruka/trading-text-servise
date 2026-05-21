import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test, { after, before } from 'node:test';
import jwt from 'jsonwebtoken';
import { CancellationController } from '../../src/interfaces/controllers/CancellationController';
import { authenticateToken, AuthRequest } from '../../src/middleware/auth';
import { CancellationRepository } from '../../src/infrastructure/repositories/CancellationRepository';
import { TransactionRepository } from '../../src/infrastructure/repositories/TransactionRepository';
import { ExecuteCancellationUseCase } from '../../src/usecases/ExecuteCancellationUseCase';
import { ReportNoShowUseCase } from '../../src/usecases/ReportNoShowUseCase';
import { prisma } from '../../src/lib/prisma';

const JWT_SECRET = 'execute-cancellation-test-secret';

let previousJwtSecret: string | undefined;

before(() => {
  previousJwtSecret = process.env.SUPABASE_JWT_SECRET;
  process.env.SUPABASE_JWT_SECRET = JWT_SECRET;
});

after(async () => {
  if (previousJwtSecret === undefined) {
    delete process.env.SUPABASE_JWT_SECRET;
  } else {
    process.env.SUPABASE_JWT_SECRET = previousJwtSecret;
  }
  await prisma.$disconnect();
});

test('POST /api/cancellations/execute atomically cancels scheduled transaction and applies penalty', async () => {
  const scenario = await seedScheduledTransaction();

  try {
    const response = await requestExecuteCancellation({
      requesterId: scenario.buyerId,
      transactionId: scenario.transactionId,
      reason: '受け渡しに行けなくなったため',
    });

    assert.equal(response.status, 201);
    assert.equal(response.body.transaction_id, scenario.transactionId);
    assert.equal(response.body.requester_id, scenario.buyerId);
    assert.equal(response.body.status, 'accepted');
    assert.equal(response.body.reason, '受け渡しに行けなくなったため');

    const [transaction, item, cancellationRequest, evaluations, buyer, seller] = await Promise.all([
      prisma.transaction.findUniqueOrThrow({ where: { id: scenario.transactionId } }),
      prisma.item.findUniqueOrThrow({ where: { id: scenario.itemId } }),
      prisma.cancellationRequest.findUniqueOrThrow({ where: { transaction_id: scenario.transactionId } }),
      prisma.evaluation.findMany({ where: { transaction_id: scenario.transactionId } }),
      prisma.user.findUniqueOrThrow({ where: { id: scenario.buyerId } }),
      prisma.user.findUniqueOrThrow({ where: { id: scenario.sellerId } }),
    ]);

    assert.equal(transaction.status, 'canceled');
    assert.equal(item.status, 'available');
    assert.equal(cancellationRequest.status, 'accepted');
    assert.equal(cancellationRequest.requester_id, scenario.buyerId);
    assert.equal(cancellationRequest.reason, '受け渡しに行けなくなったため');
    assert.equal(evaluations.length, 1);
    assert.equal(evaluations[0].target_user_id, scenario.buyerId);
    assert.equal(evaluations[0].reviewer_id, null);
    assert.equal(evaluations[0].type, 'cancel');
    assert.equal(evaluations[0].score_change, -10);
    assert.equal(buyer.credit_score, 90);
    assert.equal(seller.credit_score, 100);
  } finally {
    await cleanupScenario(scenario);
  }
});

test('POST /api/cancellations/execute returns 409 on duplicate execution without duplicating side effects', async () => {
  const scenario = await seedScheduledTransaction();

  try {
    const first = await requestExecuteCancellation({
      requesterId: scenario.buyerId,
      transactionId: scenario.transactionId,
      reason: '初回キャンセル',
    });
    const second = await withoutConsoleError(() =>
      requestExecuteCancellation({
        requesterId: scenario.buyerId,
        transactionId: scenario.transactionId,
        reason: '重複キャンセル',
      }),
    );

    assert.equal(first.status, 201);
    assert.equal(second.status, 409);
    assert.deepEqual(second.body, { error: 'この取引はすでにキャンセル済みです' });

    const [cancellationCount, evaluationCount, buyer] = await Promise.all([
      prisma.cancellationRequest.count({ where: { transaction_id: scenario.transactionId } }),
      prisma.evaluation.count({ where: { transaction_id: scenario.transactionId } }),
      prisma.user.findUniqueOrThrow({ where: { id: scenario.buyerId } }),
    ]);

    assert.equal(cancellationCount, 1);
    assert.equal(evaluationCount, 1);
    assert.equal(buyer.credit_score, 90);
  } finally {
    await cleanupScenario(scenario);
  }
});

type Scenario = {
  sellerId: string;
  buyerId: string;
  itemId: string;
  transactionId: string;
};

async function seedScheduledTransaction(): Promise<Scenario> {
  const scenario = {
    sellerId: randomUUID(),
    buyerId: randomUUID(),
    itemId: randomUUID(),
    transactionId: randomUUID(),
  };

  await prisma.$executeRaw`
    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    )
    VALUES
      (
        ${scenario.sellerId}::uuid,
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        ${`execute-cancel-seller-${scenario.sellerId}@osaka-u.ac.jp`},
        '$2a$10$executecanceltestexecutecanceltestexecutecanceltest12',
        NOW(),
        '{}'::jsonb,
        '{"nickname":"キャンセル統合テスト 出品者"}'::jsonb,
        NOW(),
        NOW()
      ),
      (
        ${scenario.buyerId}::uuid,
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        ${`execute-cancel-buyer-${scenario.buyerId}@osaka-u.ac.jp`},
        '$2a$10$executecanceltestexecutecanceltestexecutecanceltest12',
        NOW(),
        '{}'::jsonb,
        '{"nickname":"キャンセル統合テスト 購入者"}'::jsonb,
        NOW(),
        NOW()
      )
    ON CONFLICT (id) DO NOTHING
  `;

  await prisma.$executeRaw`
    INSERT INTO users (id, email, nickname, credit_score, status, created_at, updated_at)
    VALUES
      (
        ${scenario.sellerId}::uuid,
        ${`execute-cancel-seller-${scenario.sellerId}@osaka-u.ac.jp`},
        'キャンセル統合テスト 出品者',
        100,
        'active',
        NOW(),
        NOW()
      ),
      (
        ${scenario.buyerId}::uuid,
        ${`execute-cancel-buyer-${scenario.buyerId}@osaka-u.ac.jp`},
        'キャンセル統合テスト 購入者',
        100,
        'active',
        NOW(),
        NOW()
      )
    ON CONFLICT (id) DO UPDATE
    SET
      email = EXCLUDED.email,
      nickname = EXCLUDED.nickname,
      credit_score = EXCLUDED.credit_score,
      status = EXCLUDED.status,
      updated_at = NOW()
  `;

  await prisma.$executeRaw`
    INSERT INTO items (id, seller_id, title, condition, status, price, created_at, updated_at)
    VALUES (
      ${scenario.itemId}::uuid,
      ${scenario.sellerId}::uuid,
      'キャンセル統合テスト参考書',
      'used_good',
      'matching',
      1000,
      NOW(),
      NOW()
    )
  `;

  await prisma.$executeRaw`
    INSERT INTO transactions (
      id,
      item_id,
      seller_id,
      buyer_id,
      status,
      meeting_datetime,
      meeting_place,
      created_at,
      updated_at
    )
    VALUES (
      ${scenario.transactionId}::uuid,
      ${scenario.itemId}::uuid,
      ${scenario.sellerId}::uuid,
      ${scenario.buyerId}::uuid,
      'scheduled',
      ${new Date('2026-05-22T12:00:00+09:00')},
      '豊中キャンパス 総合図書館前',
      NOW(),
      NOW()
    )
  `;

  return scenario;
}

async function cleanupScenario(scenario: Scenario): Promise<void> {
  await prisma.evaluation.deleteMany({ where: { transaction_id: scenario.transactionId } });
  await prisma.cancellationRequest.deleteMany({ where: { transaction_id: scenario.transactionId } });
  await prisma.transaction.deleteMany({ where: { id: scenario.transactionId } });
  await prisma.item.deleteMany({ where: { id: scenario.itemId } });
  await prisma.user.deleteMany({ where: { id: { in: [scenario.sellerId, scenario.buyerId] } } });
  await prisma.$executeRaw`
    DELETE FROM auth.users
    WHERE id IN (${scenario.sellerId}::uuid, ${scenario.buyerId}::uuid)
  `;
}

async function requestExecuteCancellation(options: {
  requesterId: string;
  transactionId: string;
  reason?: string;
}): Promise<{ status: number; body: any }> {
  const req = {
    headers: {
      authorization: `Bearer ${authToken(options.requesterId)}`,
    },
    body: {
      transaction_id: options.transactionId,
      ...(options.reason !== undefined && { reason: options.reason }),
    },
    params: {},
  } as AuthRequest;
  const res = createMockResponse();

  let authenticated = false;
  authenticateToken(req, res as any, () => {
    authenticated = true;
  });
  if (!authenticated) {
    return { status: res.statusCode, body: res.body };
  }

  const controller = createCancellationController();
  await controller.executeCancellation(req, res as any);
  return { status: res.statusCode, body: res.body };
}

function createCancellationController(): CancellationController {
  const cancellationRepository = new CancellationRepository();
  const transactionRepository = new TransactionRepository();
  return new CancellationController(
    new ExecuteCancellationUseCase(cancellationRepository, transactionRepository),
    new ReportNoShowUseCase(cancellationRepository, transactionRepository),
  );
}

function authToken(userId: string): string {
  return jwt.sign(
    {
      sub: userId,
      email: `execute-cancel-${userId}@osaka-u.ac.jp`,
      role: 'authenticated',
      aud: 'authenticated',
    },
    JWT_SECRET,
  );
}

type MockResponse = {
  statusCode: number;
  body: any;
  status(code: number): MockResponse;
  json(payload: any): MockResponse;
};

function createMockResponse(): MockResponse {
  return {
    statusCode: 200,
    body: undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.body = payload;
      return this;
    },
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
