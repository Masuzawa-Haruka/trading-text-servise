# trading-text-servise

大学内で参考書・教科書を譲渡・取引するためのWebアプリです。

## 概要

大阪大学の学生向けに、不要になった教科書や参考書を出品し、学内で受け渡しできるサービスです。

主な機能:

- ユーザー登録・ログイン
- 参考書の出品
- 商品画像のアップロード
- 取引マッチング
- 日程調整
- メッセージ
- 評価・通報
- 通知

## 技術スタック

- Frontend: Next.js / TypeScript
- Backend: Node.js / Express / TypeScript
- Database: PostgreSQL / Supabase
- ORM: Prisma
- Storage: Supabase Storage

## 開発環境の起動

### Backend

```bash
cd backend
npm install
npm run dev
Frontend
bash

cd frontend
npm install
npm run dev
ブラウザで以下にアクセスします。

txt

http://localhost:3000
Mock Authでのローカル確認
Supabase Authを使わずに画面確認する場合:

bash

cd backend
npm run dev:mock
別ターミナルで:

bash

cd frontend
npm run dev:mock
ドキュメント
仕様: docs/spec.md
DB定義: docs/databese.md
Supabase schema: docs/supabase_schema.sql
ER図: docs/database-er-latest.png
注意
.env やAPIキーなどの秘密情報はGitHubにアップロードしないでください。
