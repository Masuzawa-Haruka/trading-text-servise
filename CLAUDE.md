# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A Model Context Protocol (MCP) server that exposes a single tool (`get_figma_file`) for fetching Figma file structure and design data via the Figma REST API. Intended to be used with AI agents (e.g., Claude via Cursor).

## Commands

```bash
# Run the MCP server directly
npx tsx index.ts

# Type-check without emitting
npx tsc --noEmit
```

## Environment

Requires `FIGMA_PERSONAL_ACCESS_TOKEN` to be set. The server authenticates all Figma API requests with this token.

## Architecture

The entire server is in [index.ts](index.ts) (~65 lines):

1. An MCP `Server` instance is created with stdio transport.
2. A `ListToolsRequestSchema` handler returns the single `get_figma_file` tool definition.
3. A `CallToolRequestSchema` handler executes the tool: it calls `GET https://api.figma.com/v1/files/{fileKey}` via axios and returns `figmaData.document` as a JSON string.
4. Errors are returned as MCP responses with `isError: true` rather than thrown.

## TypeScript Config

Module system is `nodenext` (ESM). Strict mode is on. When adding imports, use `.js` extensions for local relative imports (required by `nodenext` resolution).

## Git

### Branching

- Work must be split **by feature** (one feature per branch).
- Do not mix unrelated changes in a single branch/PR.

ブランチ操作には `git switch` を使わず、必ず `git checkout` を使うこと。

### ブランチ運用

- ブランチは `feature/○○` の形式で命名する（○○は作業内容）
  - ✅ `feature/top-page`
  - ❌ `feature/mori`（作業者名はNG）
  - ❌ `top-page`（`feature/` プレフィックス必須）
- 派生元ブランチは `develop`

### commit → push → PR フロー

コードをコミットして push する際は以下の手順を自動で実行すること:

1. コミット（既存のコミット規約に従う）
2. `git push`（初回は `-u origin <branch>`）
3. **初回 push 時のみ**、`gh pr create --base develop` で PR を自動作成（必ず `develop` をベースにすること）
4. **PR の merge・ブランチ削除はユーザーが行う。Claude は PR 作成までで止めること。**
