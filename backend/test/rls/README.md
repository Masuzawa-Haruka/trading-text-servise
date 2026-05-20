# Staging RLS tests

ステージングDBの Row Level Security を直接検証するテストです。

## 実行方法

テストの誤実行を防ぐためのガードフラグ `RUN_STAGING_RLS_TESTS=1` および接続先環境変数 `STAGING_DATABASE_URL` を指定して実行します。

```bash
cd backend
RUN_STAGING_RLS_TESTS=1 STAGING_DATABASE_URL="postgresql://..." npm run test:rls:staging
```

> [!NOTE]
> `npm run test:rls:staging` コマンド自体の内部定義でも `RUN_STAGING_RLS_TESTS=1` が付与されていますが、明示的に付与して実行することで確実な起動を保証できます。

---

## 前提条件

### 1. スキーマの適用
ステージングDBには、最新の日程候補モデルおよび画像管理に対応した以下のマイグレーションファイルが適用されている必要があります。
*   マイグレーションファイルパス (リポジトリルート基準): `docs/migrations/20260520_add_item_images_and_schedule_candidates.sql`
*   `backend` ディレクトリからの相対パス: `../docs/migrations/20260520_add_item_images_and_schedule_candidates.sql`

#### スキーマ適用の手順:
リポジトリに用意されている専用マイグレーションランナーを用いて安全に適用できます。
```bash
# backend ディレクトリにて実行
node scratch/run_migration_20260520.js
```

### 2. テストの安全設計
*   **非破壊的実行 (オートロールバック)**: テストは `BEGIN` したトランザクション内で一時的にシードデータを作成し、アサーション完了後に必ず `ROLLBACK` します。ステージング環境内の既存のデータを破壊・変更・汚染することはありません。
*   **ロールベース検証**: テスト用コネクションを一時的に `authenticated` ロールに切り替え、`request.jwt.claim.sub` および `request.jwt.claim.role` を設定した上で、本番同様の RLS 防護ポリシーの挙動を直接 SQL レベルで検証します。

---

## 検証対象・セキュリティ項目

- 主要テーブル (`items`, `item_images`, `transactions`, `schedule_proposals`, `schedule_candidates`, `cancellation_requests`) で RLS が有効になっていること
- `schedule_candidates` の SELECT / INSERT / UPDATE ポリシーが正しく登録されていること
- 日程候補 (`schedule_candidates`) を当事者だけが閲覧でき、提案送信者だけが作成でき、受信側だけが更新できること
- 出品画像 (`item_images`) を認証ユーザーが閲覧でき、出品者だけが追加・削除できること
- 即時キャンセル履歴 (`cancellation_requests`) を取引当事者だけが作成・閲覧できること
