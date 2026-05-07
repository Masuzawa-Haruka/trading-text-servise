# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

阪大生（大阪大学）限定の参考書受け渡しマッチングアプリ。
不要になった参考書を譲りたい出品者と、必要としている受取者をマッチングし、手渡しでの受け渡しをサポートする。

## Tech Stack

- **Frontend**: Next.js 15 (App Router, TypeScript, Tailwind CSS)
- **Backend / DB**: Supabase (PostgreSQL, Auth, Realtime)
- **Auth**: Supabase Auth（阪大メール @osaka-u.ac.jp ドメイン制限）
- **Hosting**: Vercel（予定）

## Commands

```bash
# 開発サーバーの起動
npm run dev

# 型チェック
npx tsc --noEmit

# ビルド確認
npm run build

# Supabase型定義の生成（Supabase CLIが必要）
npx supabase gen types typescript --project-id <project-id> > src/types/supabase.ts
```

## Directory Structure

```
src/
├── app/                    # Next.js App Router のページ・レイアウト
│   ├── (auth)/             # 認証ページ群（login, signup）
│   ├── (app)/              # 認証済みユーザー向けページ
│   └── layout.tsx
├── lib/
│   └── supabase/
│       ├── client.ts       # ブラウザ用 Supabase クライアント
│       └── server.ts       # Server Component / Route Handler 用クライアント
├── middleware.ts            # 認証チェック・セッション維持
└── types/
    └── supabase.ts         # Supabase 自動生成型定義（生成後に配置）
docs/
├── spec.md                 # 仕様書
├── databese.md             # DB テーブル定義
└── ui.png                  # UIデザイン参考
```

## Environment Variables

`.env.local` に以下を設定:
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase Anon Key

どちらも Supabase ダッシュボードの **Project Settings > API** から取得できる。

## Auth Notes

- Supabase Auth のメールドメイン制限で `@osaka-u.ac.jp` のみを許可する（ダッシュボードで設定）。
- `src/middleware.ts` がすべてのリクエストでセッションをリフレッシュし、未認証ユーザーを `/login` にリダイレクトする。
- `/login` と `/auth/**` は認証不要のパブリックルート。

## Git

### ブランチ運用

- ブランチは `feature/○○` の形式で命名する（○○は作業内容）
  - ✅ `feature/top-page`
  - ❌ `feature/mori`（作業者名はNG）
  - ❌ `top-page`（`feature/` プレフィックス必須）
- 派生元ブランチは `develop`
- ブランチ操作には `git switch` を使わず、必ず `git checkout` を使うこと。

### commit → push → PR フロー

コードをコミットして push する際は以下の手順を自動で実行すること:

1. コミット（既存のコミット規約に従う）
2. `git push`（初回は `-u origin <branch>`）
3. **初回 push 時のみ**、`gh pr create --base develop` で PR を自動作成（必ず `develop` をベースにすること）
4. **PR の merge・ブランチ削除はユーザーが行う。Claude は PR 作成までで止めること。**
