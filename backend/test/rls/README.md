# Staging RLS tests

ステージングDBの Row Level Security を直接検証するテストです。

## 実行方法

```bash
cd backend
STAGING_DATABASE_URL="postgresql://..." npm run test:rls:staging
```

## 前提

- `STAGING_DATABASE_URL` は Supabase のステージングDBへ接続できる Postgres 接続文字列を指定してください。
- ステージングDBには `docs/migrations/20260520_add_item_images_and_schedule_candidates.sql` 適用後のスキーマが必要です。
- テストは `BEGIN` したトランザクション内で seed データを作成し、最後に `ROLLBACK` します。
- `authenticated` ロールに切り替え、`request.jwt.claim.sub` / `request.jwt.claim.role` を設定して RLS の挙動を検証します。

## 検証内容

- 主要テーブルで RLS が有効になっていること
- `schedule_candidates` の SELECT / INSERT / UPDATE ポリシーが存在すること
- `schedule_candidates` を当事者だけが閲覧でき、提案送信者だけが作成でき、受信側だけが更新できること
- `item_images` を認証ユーザーが閲覧でき、出品者だけが作成できること
- `cancellation_requests` を取引当事者だけが作成・閲覧できること
