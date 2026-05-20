import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test, { after, before } from 'node:test';
import { Pool, PoolClient } from 'pg';

const connectionString = process.env.STAGING_DATABASE_URL;

if (process.env.RUN_STAGING_RLS_TESTS !== '1') {
  throw new Error('RUN_STAGING_RLS_TESTS=1 を指定して実行してください');
}

if (!connectionString) {
  throw new Error('STAGING_DATABASE_URL を指定してください');
}

const pool = new Pool({ connectionString });
const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const ids = {
  seller: randomUUID(),
  buyer: randomUUID(),
  outsider: randomUUID(),
  item: randomUUID(),
  itemImage: randomUUID(),
  transaction: randomUUID(),
  cancellationTransaction: randomUUID(),
  proposal: randomUUID(),
  candidate: randomUUID(),
};

let client: PoolClient;

before(async () => {
  client = await pool.connect();
  await client.query('BEGIN');
  await seedScenario(client);
});

after(async () => {
  if (client) {
    await client.query('ROLLBACK');
    client.release();
  }
  await pool.end();
});

test('ステージングDBで主要テーブルのRLSが有効になっている', async () => {
  const result = await client.query<{ relname: string; relrowsecurity: boolean }>(
    `
      SELECT relname, relrowsecurity
      FROM pg_class
      WHERE relname = ANY($1::text[])
      ORDER BY relname
    `,
    [[
      'items',
      'item_images',
      'transactions',
      'schedule_proposals',
      'schedule_candidates',
      'cancellation_requests',
    ]],
  );

  const rlsByTable = new Map(result.rows.map((row) => [row.relname, row.relrowsecurity]));

  for (const table of [
    'items',
    'item_images',
    'transactions',
    'schedule_proposals',
    'schedule_candidates',
    'cancellation_requests',
  ]) {
    assert.equal(rlsByTable.get(table), true, `${table} のRLSが有効であること`);
  }
});

test('schedule_candidates のSELECT/INSERT/UPDATEポリシーが存在する', async () => {
  const result = await client.query<{ policyname: string; cmd: string }>(
    `
      SELECT policyname, cmd
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'schedule_candidates'
      ORDER BY policyname
    `,
  );

  const policies = new Map(result.rows.map((row) => [row.policyname, row.cmd]));

  assert.equal(policies.get('Parties can view schedule candidates'), 'SELECT');
  assert.equal(policies.get('Sender can insert schedule candidates'), 'INSERT');
  assert.equal(policies.get('Receiver can update schedule candidates'), 'UPDATE');
});

test('schedule_candidates は当事者のみ閲覧できる', async () => {
  assert.equal(await countAs(ids.seller, 'SELECT COUNT(*) FROM schedule_candidates WHERE id = $1', [ids.candidate]), 1);
  assert.equal(await countAs(ids.buyer, 'SELECT COUNT(*) FROM schedule_candidates WHERE id = $1', [ids.candidate]), 1);
  assert.equal(await countAs(ids.outsider, 'SELECT COUNT(*) FROM schedule_candidates WHERE id = $1', [ids.candidate]), 0);
});

test('schedule_candidates は提案送信者のみ作成できる', async () => {
  await assertAllowed(async () => {
    await execAs(
      ids.seller,
      `
        INSERT INTO schedule_candidates (proposal_id, proposed_datetime, proposed_place)
        VALUES ($1, '2026-05-22T12:15:00+09:00', '豊中キャンパス 総合図書館前')
      `,
      [ids.proposal],
    );
  });

  await assertDenied(async () => {
    await execAs(
      ids.buyer,
      `
        INSERT INTO schedule_candidates (proposal_id, proposed_datetime, proposed_place)
        VALUES ($1, '2026-05-22T12:30:00+09:00', '豊中キャンパス 総合図書館前')
      `,
      [ids.proposal],
    );
  });
});

test('schedule_candidates は提案受信者のみ更新できる', async () => {
  assert.equal(
    await rowCountAs(ids.buyer, 'UPDATE schedule_candidates SET status = $1 WHERE id = $2', ['accepted', ids.candidate]),
    1,
  );

  assert.equal(
    await rowCountAs(ids.seller, 'UPDATE schedule_candidates SET status = $1 WHERE id = $2', ['rejected', ids.candidate]),
    0,
  );

  assert.equal(
    await rowCountAs(ids.outsider, 'UPDATE schedule_candidates SET status = $1 WHERE id = $2', ['rejected', ids.candidate]),
    0,
  );
});

test('item_images は認証ユーザーが閲覧でき、出品者のみ作成できる', async () => {
  assert.equal(await countAs(ids.buyer, 'SELECT COUNT(*) FROM item_images WHERE id = $1', [ids.itemImage]), 1);

  await assertAllowed(async () => {
    await execAs(
      ids.seller,
      `
        INSERT INTO item_images (item_id, image_url, display_order)
        VALUES ($1, 'https://example.com/allowed.jpg', 1)
      `,
      [ids.item],
    );
  });

  await assertDenied(async () => {
    await execAs(
      ids.buyer,
      `
        INSERT INTO item_images (item_id, image_url, display_order)
        VALUES ($1, 'https://example.com/denied.jpg', 2)
      `,
      [ids.item],
    );
  });
});

test('cancellation_requests は当事者のみ作成・閲覧できる', async () => {
  await assertAllowed(async () => {
    await execAs(
      ids.buyer,
      `
        INSERT INTO cancellation_requests (transaction_id, requester_id, reason, status)
        VALUES ($1, $2, 'RLS test cancellation', 'accepted')
      `,
      [ids.cancellationTransaction, ids.buyer],
    );
  });

  assert.equal(
    await countAs(ids.seller, 'SELECT COUNT(*) FROM cancellation_requests WHERE transaction_id = $1', [
      ids.cancellationTransaction,
    ]),
    1,
  );
  assert.equal(
    await countAs(ids.outsider, 'SELECT COUNT(*) FROM cancellation_requests WHERE transaction_id = $1', [
      ids.cancellationTransaction,
    ]),
    0,
  );

  await assertDenied(async () => {
    await execAs(
      ids.outsider,
      `
        INSERT INTO cancellation_requests (transaction_id, requester_id, reason, status)
        VALUES ($1, $2, 'RLS test outsider cancellation', 'accepted')
      `,
      [ids.transaction, ids.outsider],
    );
  });
});

async function seedScenario(db: PoolClient): Promise<void> {
  await db.query(
    `
      INSERT INTO users (id, email, nickname)
      VALUES
        ($1, $4, 'RLS seller'),
        ($2, $5, 'RLS buyer'),
        ($3, $6, 'RLS outsider')
    `,
    [
      ids.seller,
      ids.buyer,
      ids.outsider,
      `rls-seller-${runId}@example.com`,
      `rls-buyer-${runId}@example.com`,
      `rls-outsider-${runId}@example.com`,
    ],
  );

  await db.query(
    `
      INSERT INTO items (id, seller_id, title, author, condition, category, price, status)
      VALUES ($1, $2, 'RLS test item', 'RLS author', 'used_good', '数学', 0, 'available')
    `,
    [ids.item, ids.seller],
  );

  await db.query(
    `
      INSERT INTO item_images (id, item_id, image_url, display_order)
      VALUES ($1, $2, 'https://example.com/seed.jpg', 0)
    `,
    [ids.itemImage, ids.item],
  );

  await db.query(
    `
      INSERT INTO transactions (id, item_id, seller_id, buyer_id, status)
      VALUES
        ($1, $3, $4, $5, 'proposing'),
        ($2, $3, $4, $5, 'scheduled')
    `,
    [ids.transaction, ids.cancellationTransaction, ids.item, ids.seller, ids.buyer],
  );

  await db.query(
    `
      INSERT INTO schedule_proposals (id, transaction_id, sender_id, status)
      VALUES ($1, $2, $3, 'pending')
    `,
    [ids.proposal, ids.transaction, ids.seller],
  );

  await db.query(
    `
      INSERT INTO schedule_candidates (id, proposal_id, proposed_datetime, proposed_place, status)
      VALUES ($1, $2, '2026-05-22T12:15:00+09:00', '豊中キャンパス 総合図書館前', 'pending')
    `,
    [ids.candidate, ids.proposal],
  );
}

async function countAs(userId: string, sql: string, params: unknown[] = []): Promise<number> {
  const result = await execAs<{ count: string }>(userId, sql, params);
  return Number(result.rows[0]?.count ?? 0);
}

async function rowCountAs(userId: string, sql: string, params: unknown[] = []): Promise<number> {
  const result = await execAs(userId, sql, params);
  return result.rowCount ?? 0;
}

async function execAs<T extends Record<string, unknown> = Record<string, unknown>>(
  userId: string,
  sql: string,
  params: unknown[] = [],
) {
  await client.query('SAVEPOINT rls_test_step');
  try {
    await client.query('SET ROLE authenticated');
    await client.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [userId]);
    await client.query(`SELECT set_config('request.jwt.claim.role', 'authenticated', true)`);
    const result = await client.query<T>(sql, params);
    await client.query('RESET ROLE');
    await client.query('RELEASE SAVEPOINT rls_test_step');
    return result;
  } catch (error) {
    await client.query('ROLLBACK TO SAVEPOINT rls_test_step');
    await client.query('RESET ROLE');
    throw error;
  }
}

async function assertAllowed(operation: () => Promise<void>): Promise<void> {
  await operation();
}

async function assertDenied(operation: () => Promise<void>): Promise<void> {
  await assert.rejects(operation, (error: unknown) => {
    return error instanceof Error && /row-level security|permission denied/i.test(error.message);
  });
}
