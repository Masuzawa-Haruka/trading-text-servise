# データベース定義

最終更新: 2026-05-26  
参照元: `backend/prisma/schema.prisma` / `docs/supabase_schema.sql`

## Enum

| Enum | 値 | 用途 |
| --- | --- | --- |
| `UserStatus` | `active`, `warning`, `suspended` | ユーザー状態 |
| `ItemStatus` | `available`, `matching`, `completed`, `canceled` | 出品状態 |
| `ItemCondition` | `new`, `used_good`, `used_bad` | 参考書の状態 |
| `Campus` | `toyonaka`, `suita`, `minoh` | キャンパス |
| `TransactionStatus` | `proposing`, `scheduled`, `completed`, `canceled` | 取引状態 |
| `ProposalStatus` | `pending`, `accepted`, `rejected` | 日程提案・候補の状態 |
| `CancellationStatus` | `pending`, `accepted`, `rejected` | キャンセル履歴の互換状態 |
| `OfferStatus` | `pending`, `accepted`, `rejected` | 価格オファー状態 |
| `EvaluationType` | `good`, `bad`, `cancel`, `no_show` | 評価・ペナルティ種別 |
| `NotificationType` | `action_required`, `info` | 通知種別 |

## 1. users

阪大生アカウント、プロフィール、信用スコアを管理します。

| カラム名 | 型 | 制約 / デフォルト | 説明 |
| --- | --- | --- | --- |
| `id` | UUID | PK, default `gen_random_uuid()` | ユーザーID |
| `email` | VARCHAR | Unique, Not Null | 大学メールアドレス |
| `nickname` | VARCHAR | Not Null | アプリ内での表示名 |
| `profile_image_url` | VARCHAR | Nullable | プロフィール画像URL |
| `credit_score` | INT | Default: `100` | 信用スコア |
| `status` | `UserStatus` | Default: `active` | ユーザー状態 |
| `created_at` | TIMESTAMPTZ | Default: `now()` | 作成日時 |
| `updated_at` | TIMESTAMPTZ | Default: `now()` / Prisma `@updatedAt` | 更新日時 |

補足:

- Supabase SQLでは `email` に `@ecs.osaka-u.ac.jp` ドメイン制約があります。

## 2. items

出品された参考書・教科書の情報を管理します。

| カラム名 | 型 | 制約 / デフォルト | 説明 |
| --- | --- | --- | --- |
| `id` | UUID | PK, default `gen_random_uuid()` | 出品ID |
| `seller_id` | UUID | FK `users.id`, Not Null | 出品者ID |
| `title` | VARCHAR | Not Null | 参考書タイトル |
| `author` | VARCHAR | Nullable | 著者名 |
| `description` | TEXT | Nullable | 商品説明 |
| `condition` | `ItemCondition` | Default: `new` | 商品状態 |
| `campus` | `Campus` | Default: `toyonaka`, Not Null | 受け渡しキャンパス |
| `handoff_location` | VARCHAR | Nullable | 受け渡し場所の補足 |
| `category` | VARCHAR | Nullable | 科目・カテゴリ |
| `price` | INT | Default: `0` | 価格 |
| `status` | `ItemStatus` | Default: `available` | 出品状態 |
| `created_at` | TIMESTAMPTZ | Default: `now()` | 作成日時 |
| `updated_at` | TIMESTAMPTZ | Default: `now()` / Prisma `@updatedAt` | 更新日時 |

## 3. item_images

1つの出品に紐づく画像を管理します。表示順 `0` がメイン画像です。

| カラム名 | 型 | 制約 / デフォルト | 説明 |
| --- | --- | --- | --- |
| `id` | UUID | PK, default `gen_random_uuid()` | 画像ID |
| `item_id` | UUID | FK `items.id`, Cascade, Not Null | 出品ID |
| `image_url` | VARCHAR | Not Null | 画像URL |
| `display_order` | INT | Default: `0`, Not Null | 表示順 |
| `created_at` | TIMESTAMPTZ | Default: `now()` | 作成日時 |

## 4. transactions

マッチング成立後の取引状態を管理します。

| カラム名 | 型 | 制約 / デフォルト | 説明 |
| --- | --- | --- | --- |
| `id` | UUID | PK, default `gen_random_uuid()` | 取引ID |
| `item_id` | UUID | FK `items.id`, Not Null | 対象の出品ID |
| `seller_id` | UUID | FK `users.id`, Not Null | 出品者ID |
| `buyer_id` | UUID | FK `users.id`, Not Null | 受取者ID |
| `final_price` | INT | Nullable | 承認された最終価格 |
| `status` | `TransactionStatus` | Default: `proposing` | 取引状態 |
| `meeting_datetime` | TIMESTAMPTZ | Nullable | 確定した待ち合わせ日時 |
| `meeting_place` | VARCHAR | Nullable | 確定した待ち合わせ場所 |
| `seller_evaluated` | BOOLEAN | Default: `false` | 出品者が評価済みか |
| `buyer_evaluated` | BOOLEAN | Default: `false` | 受取者が評価済みか |
| `created_at` | TIMESTAMPTZ | Default: `now()` | 作成日時 |
| `updated_at` | TIMESTAMPTZ | Default: `now()` / Prisma `@updatedAt` | 更新日時 |

## 5. schedule_proposals

日程調整提案の親レコードです。

| カラム名 | 型 | 制約 / デフォルト | 説明 |
| --- | --- | --- | --- |
| `id` | UUID | PK, default `gen_random_uuid()` | 提案ID |
| `transaction_id` | UUID | FK `transactions.id`, Not Null | 取引ID |
| `sender_id` | UUID | FK `users.id`, Not Null | 提案送信者ID |
| `status` | `ProposalStatus` | Default: `pending` | 提案状態 |
| `created_at` | TIMESTAMPTZ | Default: `now()` | 作成日時 |
| `updated_at` | TIMESTAMPTZ | Default: `now()` / Prisma `@updatedAt` | 更新日時 |

## 6. schedule_candidates

1つの提案に対して提示される日時・場所候補です。

| カラム名 | 型 | 制約 / デフォルト | 説明 |
| --- | --- | --- | --- |
| `id` | UUID | PK, default `gen_random_uuid()` | 候補ID |
| `proposal_id` | UUID | FK `schedule_proposals.id`, Cascade, Not Null | 親提案ID |
| `proposed_datetime` | TIMESTAMPTZ | Not Null | 候補日時 |
| `proposed_place` | VARCHAR | Not Null | 候補場所 |
| `status` | `ProposalStatus` | Default: `pending` | 候補状態 |
| `created_at` | TIMESTAMPTZ | Default: `now()` | 作成日時 |
| `updated_at` | TIMESTAMPTZ | Default: `now()` / Prisma `@updatedAt` | 更新日時 |

補足:

- `proposed_place` は将来的に `location_spot_id` FKへ移行予定です。

## 7. price_offers

Take it or Leave it 方式の価格交渉オファーを管理します。

| カラム名 | 型 | 制約 / デフォルト | 説明 |
| --- | --- | --- | --- |
| `id` | UUID | PK, default `gen_random_uuid()` | オファーID |
| `transaction_id` | UUID | FK `transactions.id`, Not Null | 取引ID |
| `sender_id` | UUID | FK `users.id`, Not Null | オファー送信者ID |
| `price` | INT | Not Null, Check `price >= 0` | 提案価格 |
| `status` | `OfferStatus` | Default: `pending` | オファー状態 |
| `offer_count` | INT | Not Null, Check `1..3` | 何回目のオファーか |
| `created_at` | TIMESTAMPTZ | Default: `now()` | 作成日時 |
| `updated_at` | TIMESTAMPTZ | Default: `now()` / Prisma `@updatedAt` | 更新日時 |

## 8. messages

日時・場所確定後の取引連絡ボードのメッセージを管理します。

| カラム名 | 型 | 制約 / デフォルト | 説明 |
| --- | --- | --- | --- |
| `id` | UUID | PK, default `gen_random_uuid()` | メッセージID |
| `transaction_id` | UUID | FK `transactions.id`, Not Null | 取引ID |
| `sender_id` | UUID | FK `users.id`, Not Null | 送信者ID |
| `content` | TEXT | Not Null | メッセージ本文 |
| `created_at` | TIMESTAMPTZ | Default: `now()` | 作成日時 |
| `updated_at` | TIMESTAMPTZ | Default: `now()` / Prisma `@updatedAt` | 更新日時 |

## 9. evaluations

相互評価とペナルティログを管理します。

| カラム名 | 型 | 制約 / デフォルト | 説明 |
| --- | --- | --- | --- |
| `id` | UUID | PK, default `gen_random_uuid()` | 評価ID |
| `transaction_id` | UUID | FK `transactions.id`, Not Null | 取引ID |
| `target_user_id` | UUID | FK `users.id`, Not Null | スコア変動対象ユーザーID |
| `reviewer_id` | UUID | FK `users.id`, Nullable | 評価者ID。システムペナルティ時はNull |
| `score_change` | INT | Not Null | スコア変動値 |
| `type` | `EvaluationType` | Not Null | 評価・ペナルティ種別 |
| `created_at` | TIMESTAMPTZ | Default: `now()` | 作成日時 |
| `updated_at` | TIMESTAMPTZ | Default: `now()` / Prisma `@updatedAt` | 更新日時 |

## 10. reports

取引に紐づく通報を管理します。

| カラム名 | 型 | 制約 / デフォルト | 説明 |
| --- | --- | --- | --- |
| `id` | UUID | PK, default `gen_random_uuid()` | 通報ID |
| `transaction_id` | UUID | FK `transactions.id`, Cascade, Not Null | 取引ID |
| `reporter_id` | UUID | FK `users.id`, Cascade, Not Null | 通報者ID |
| `reported_user_id` | UUID | FK `users.id`, Cascade, Not Null | 通報対象ユーザーID |
| `reason` | VARCHAR | Not Null | 通報理由 |
| `detail` | TEXT | Not Null | 通報詳細 |
| `evidence_image_urls` | TEXT[] | Default: `[]`, max 5 | 証拠画像URL |
| `created_at` | TIMESTAMPTZ | Default: `now()` | 作成日時 |
| `updated_at` | TIMESTAMPTZ | Default: `now()` / Prisma `@updatedAt` | 更新日時 |

制約:

- `reporter_id <> reported_user_id`
- Unique: `(transaction_id, reporter_id)`
- `evidence_image_urls` は最大5件

## 11. notifications

取引の進行状況やフォーム受信などをユーザーへ知らせる通知を管理します。

| カラム名 | 型 | 制約 / デフォルト | 説明 |
| --- | --- | --- | --- |
| `id` | UUID | PK, default `gen_random_uuid()` | 通知ID |
| `user_id` | UUID | FK `users.id`, Not Null | 通知を受け取るユーザーID |
| `actor_id` | UUID | FK `users.id`, Nullable | 通知を発生させたユーザーID |
| `title` | VARCHAR | Not Null | 通知タイトル |
| `type` | `NotificationType` | Not Null | 通知種別 |
| `transaction_id` | UUID | Nullable | 関連する取引ID |
| `is_read` | BOOLEAN | Default: `false` | 既読フラグ |
| `created_at` | TIMESTAMPTZ | Default: `now()` | 作成日時 |
| `updated_at` | TIMESTAMPTZ | Default: `now()` / Prisma `@updatedAt` | 更新日時 |

補足:

- Prisma schema上の `transaction_id` は現在relationを持たないUUIDです。

## 12. cancellation_requests

即時キャンセルの履歴を管理します。現状は旧キャンセル申請フローとの互換名を残しています。

| カラム名 | 型 | 制約 / デフォルト | 説明 |
| --- | --- | --- | --- |
| `id` | UUID | PK, default `gen_random_uuid()` | キャンセル履歴ID |
| `transaction_id` | UUID | FK `transactions.id`, Unique, Not Null | 取引ID |
| `requester_id` | UUID | FK `users.id`, Not Null | キャンセル実行者ID |
| `reason` | TEXT | Nullable | キャンセル理由 |
| `status` | `CancellationStatus` | Default: `pending` | 互換用ステータス |
| `created_at` | TIMESTAMPTZ | Default: `now()` | 作成日時 |
| `updated_at` | TIMESTAMPTZ | Default: `now()` / Prisma `@updatedAt` | 更新日時 |

補足:

- 新しい即時キャンセルでは、実行済み履歴として `accepted` を利用します。
- バックエンドのキャンセルAPIが安定した後、`cancellation_events` または `cancellations` へリネーム予定です。

## 13. location_areas

キャンパス単位で待ち合わせスポットを束ねるエリアマスターです。

| カラム名 | 型 | 制約 / デフォルト | 説明 |
| --- | --- | --- | --- |
| `id` | UUID | PK, default `gen_random_uuid()` | エリアID |
| `campus` | VARCHAR | Not Null | キャンパス名 |
| `name` | VARCHAR | Not Null | エリア名称 |
| `created_at` | TIMESTAMPTZ | Default: `now()` | 作成日時 |
| `updated_at` | TIMESTAMPTZ | Default: `now()` / Prisma `@updatedAt` | 更新日時 |

## 14. location_spots

エリア内の具体的な待ち合わせスポットを管理します。

| カラム名 | 型 | 制約 / デフォルト | 説明 |
| --- | --- | --- | --- |
| `id` | UUID | PK, default `gen_random_uuid()` | スポットID |
| `area_id` | UUID | FK `location_areas.id`, Cascade, Not Null | エリアID |
| `name` | VARCHAR | Not Null | スポット名 |
| `reference_image_url` | VARCHAR | Nullable | すれ違い防止用の参考画像URL |
| `created_at` | TIMESTAMPTZ | Default: `now()` | 作成日時 |
| `updated_at` | TIMESTAMPTZ | Default: `now()` / Prisma `@updatedAt` | 更新日時 |

## Storage Buckets

| Bucket | 用途 | 補足 |
| --- | --- | --- |
| `item-images` | 出品画像 | 1出品最大5枚 |
| `profile-images` | プロフィール画像 | ユーザー自身のフォルダ配下のみ更新・削除可能 |
| `report-evidence` | 通報証拠画像 | 1通報最大5枚 |

## 関連資料

- ER図: `marmaid.md`
- Supabase SQL: `docs/supabase_schema.sql`
- Prisma schema: `backend/prisma/schema.prisma`
