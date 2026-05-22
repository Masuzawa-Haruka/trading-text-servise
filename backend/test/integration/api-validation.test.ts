import assert from 'node:assert/strict';
import test, { beforeEach, afterEach } from 'node:test';
import jwt from 'jsonwebtoken';
import { authenticateToken, AuthRequest, extractBearerToken } from '../../src/middleware/auth';
import { ItemController } from '../../src/interfaces/controllers/ItemController';
import { ScheduleProposalController } from '../../src/interfaces/controllers/ScheduleProposalController';
import { CancellationController } from '../../src/interfaces/controllers/CancellationController';

const JWT_SECRET = 'integration-test-secret';
const AUTH_USER_ID = '11111111-1111-4111-8111-111111111111';
const TRANSACTION_ID = '22222222-2222-4222-8222-222222222222';
const PROPOSAL_ID = '33333333-3333-4333-8333-333333333333';
const CANDIDATE_ID = '44444444-4444-4444-8444-444444444444';

let previousJwtSecret: string | undefined;

beforeEach(() => {
  previousJwtSecret = process.env.SUPABASE_JWT_SECRET;
  process.env.SUPABASE_JWT_SECRET = JWT_SECRET;
});

afterEach(() => {
  if (previousJwtSecret === undefined) {
    delete process.env.SUPABASE_JWT_SECRET;
    return;
  }
  process.env.SUPABASE_JWT_SECRET = previousJwtSecret;
});

test('POST /api/items rejects non-string optional fields before usecase execution', async () => {
  let called = false;
  const handler = createItemHandler({
    execute: async () => {
      called = true;
      throw new Error('should not be called');
    },
  });

  const response = await request(handler, {
    token: authToken(),
    body: {
      title: '線形代数',
      author: { name: 'bad' },
      condition: 'used_good',
    },
  });

  assert.equal(response.status, 400);
  assert.deepEqual(response.body, { error: 'author は文字列で指定してください' });
  assert.equal(called, false);
});

test('authenticateToken rejects non-Osaka University email domains', async () => {
  const req = {
    headers: {
      authorization: `Bearer ${authToken({ email: 'student@example.com' })}`,
    },
    body: {},
    params: {},
  } as AuthRequest;
  const res = createMockResponse();

  let authenticated = false;
  authenticateToken(req, res as any, () => {
    authenticated = true;
  });

  assert.equal(authenticated, false);
  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.body, { error: '大阪大学のメールアドレスで認証してください' });
});

test('authenticateToken accepts Supabase JWTs for Osaka University email domains', async () => {
  const req = {
    headers: {
      authorization: `Bearer ${authToken({ email: 'student@osaka-u.ac.jp' })}`,
    },
    body: {},
    params: {},
  } as AuthRequest;
  const res = createMockResponse();

  let authenticated = false;
  authenticateToken(req, res as any, () => {
    authenticated = true;
  });

  assert.equal(authenticated, true);
  assert.equal(req.user?.id, AUTH_USER_ID);
  assert.equal(req.user?.email, 'student@osaka-u.ac.jp');
});

test('extractBearerToken normalizes string headers and rejects malformed values', () => {
  const token = authToken();

  assert.equal(extractBearerToken(`Bearer ${token}`), token);
  assert.equal(extractBearerToken([`Bearer ${token}`]), token);
  assert.equal(extractBearerToken('Basic abc'), undefined);
  assert.equal(extractBearerToken('Bearer'), undefined);
  assert.equal(extractBearerToken('Bearer a b'), undefined);
  assert.equal(extractBearerToken(undefined), undefined);
});

test('POST /api/items rejects invalid image_urls elements before usecase execution', async () => {
  let called = false;
  const handler = createItemHandler({
    execute: async () => {
      called = true;
      throw new Error('should not be called');
    },
  });

  const response = await request(handler, {
    token: authToken(),
    body: {
      title: 'ミクロ経済学',
      condition: 'used_good',
      campus: 'toyonaka',
      handoff_location: '総合図書館前',
      image_urls: ['https://example.com/a.jpg', '   '],
    },
  });

  assert.equal(response.status, 400);
  assert.deepEqual(response.body, { error: 'image_urls の各要素は空でない文字列で指定してください' });
  assert.equal(called, false);
});

test('POST /api/items trims optional strings and image URLs before create usecase', async () => {
  let capturedInput: unknown;
  const handler = createItemHandler({
    execute: async (input: unknown) => {
      capturedInput = input;
      return {
        id: '55555555-5555-4555-8555-555555555555',
        seller_id: AUTH_USER_ID,
        title: '線形代数',
        author: '石村園子',
        description: undefined,
        condition: 'used_good',
        campus: 'toyonaka',
        handoff_location: '総合図書館前',
        category: '数学',
        price: 0,
        status: 'available',
        images: [],
        created_at: new Date('2026-05-20T00:00:00.000Z'),
        updated_at: new Date('2026-05-20T00:00:00.000Z'),
      };
    },
  });

  const response = await request(handler, {
    token: authToken(),
    body: {
      title: ' 線形代数 ',
      author: ' 石村園子 ',
      description: '   ',
      condition: 'used_good',
      campus: 'toyonaka',
      handoff_location: ' 総合図書館前 ',
      category: ' 数学 ',
      price: 0,
      image_urls: [' https://example.com/a.jpg '],
    },
  });

  assert.equal(response.status, 201);
  assert.deepEqual(capturedInput, {
    seller_id: AUTH_USER_ID,
    title: '線形代数',
    author: '石村園子',
    description: undefined,
    condition: 'used_good',
    campus: 'toyonaka',
    handoff_location: '総合図書館前',
    category: '数学',
    price: 0,
    image_urls: ['https://example.com/a.jpg'],
  });
});

test('PATCH /api/schedule-proposals/:id/respond rejects invalid accepted candidate_id before usecase execution', async () => {
  let called = false;
  const handler = createScheduleProposalHandler({
    execute: async () => {
      called = true;
      throw new Error('should not be called');
    },
  });

  const response = await request(handler, {
    params: { id: PROPOSAL_ID },
    token: authToken(),
    body: {
      status: 'accepted',
      candidate_id: 'not-a-uuid',
    },
  });

  assert.equal(response.status, 400);
  assert.deepEqual(response.body, { error: '無効な candidate_id 形式です' });
  assert.equal(called, false);
});

test('PATCH /api/schedule-proposals/:id/respond passes valid accepted candidate_id to usecase', async () => {
  let capturedArgs: unknown;
  const handler = createScheduleProposalHandler({
    execute: async (...args: unknown[]) => {
      capturedArgs = args;
      return {
        id: PROPOSAL_ID,
        transaction_id: TRANSACTION_ID,
        sender_id: '66666666-6666-4666-8666-666666666666',
        status: 'accepted',
        candidates: [],
        created_at: new Date('2026-05-20T00:00:00.000Z'),
        updated_at: new Date('2026-05-20T00:00:00.000Z'),
      };
    },
  });

  const response = await request(handler, {
    params: { id: PROPOSAL_ID },
    token: authToken(),
    body: {
      status: 'accepted',
      candidate_id: CANDIDATE_ID,
    },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(capturedArgs, [
    PROPOSAL_ID,
    { status: 'accepted', candidate_id: CANDIDATE_ID },
    AUTH_USER_ID,
  ]);
});

test('POST /api/cancellations/execute rejects invalid reason before usecase execution', async () => {
  let called = false;
  const handler = createCancellationHandler({
    execute: async () => {
      called = true;
      throw new Error('should not be called');
    },
  });

  const response = await request(handler, {
    token: authToken(),
    body: {
      transaction_id: TRANSACTION_ID,
      reason: { text: 'bad' },
    },
  });

  assert.equal(response.status, 400);
  assert.deepEqual(response.body, { error: '理由は文字列で指定してください' });
  assert.equal(called, false);
});

function createItemHandler(createItemUseCase: { execute: (...args: any[]) => Promise<unknown> }): TestHandler {
  const controller = new ItemController(
    createItemUseCase as any,
    { execute: async () => [] } as any,
    { execute: async () => null } as any,
    { execute: async () => null } as any,
  );

  return controller.createItem as unknown as TestHandler;
}

function createScheduleProposalHandler(
  respondScheduleProposalUseCase: { execute: (...args: any[]) => Promise<unknown> },
): TestHandler {
  const controller = new ScheduleProposalController(
    { execute: async () => undefined } as any,
    respondScheduleProposalUseCase as any,
    { execute: async () => [] } as any,
  );

  return controller.respondToProposal.bind(controller) as unknown as TestHandler;
}

function createCancellationHandler(
  executeCancellationUseCase: { execute: (...args: any[]) => Promise<unknown> },
): TestHandler {
  const controller = new CancellationController(
    executeCancellationUseCase as any,
    { execute: async () => undefined } as any,
  );

  return controller.executeCancellation.bind(controller) as unknown as TestHandler;
}

function authToken(options: { email?: string } = {}): string {
  return jwt.sign(
    {
      sub: AUTH_USER_ID,
      email: options.email ?? 'test@osaka-u.ac.jp',
      role: 'authenticated',
      aud: 'authenticated',
    },
    JWT_SECRET,
  );
}

type TestHandler = (req: AuthRequest, res: MockResponse) => Promise<void>;

type MockResponse = {
  statusCode: number;
  body: unknown;
  status(code: number): MockResponse;
  json(payload: unknown): MockResponse;
};

async function request(
  handler: TestHandler,
  options: {
    token?: string;
    body?: unknown;
    params?: Record<string, string>;
  },
): Promise<{ status: number; body: unknown }> {
  const req = {
    headers: {
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body,
    params: options.params ?? {},
  } as AuthRequest;
  const res = createMockResponse();

  let authenticated = false;
  authenticateToken(req, res as any, () => {
    authenticated = true;
  });
  if (!authenticated) {
    return { status: res.statusCode, body: res.body };
  }

  await handler(req, res);
  return { status: res.statusCode, body: res.body };
}

function createMockResponse(): MockResponse {
  return {
    statusCode: 200,
    body: undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
}
