## テーブル定義（updated_at 追加版）

（※下書き：必要な箇所に `updated_at` を追加し、上と同じ形式で表にしました）

### 1. Users（ユーザーテーブル）

阪大生アカウントと信用スコアを管理します。

| カラム名 | 型 | 制約 / デフォルト | 説明 |
| --- | --- | --- | --- |
| `id` | UUID | PK | ユーザーID |
| `email` | String | Unique | 大学メールアドレス（登録制限に使用） |
| `nickname` | String | Not Null | アプリ内での表示名 |
| `profile_image_url` | String | Nullable | アイコン等のプロフィール画像URL |
| `credit_score` | Int | Default: 100（上限150） | 信用スコア |
| `status` | Enum | Default: 'active' | active(通常), warning(警告), suspended(停止) |
| `created_at` | DateTime |  | アカウント作成日時 |
| `updated_at` | DateTime |  | アカウント更新日時 |

### 2. Items（出品・参考書テーブル）

教科書の情報と、現在の募集状態を管理します。削除時は `status` を `canceled` に変更して対応します。

| カラム名 | 型 | 制約 / デフォルト | 説明 |
| --- | --- | --- | --- |
| `id` | UUID | PK | 出品アイテムID |
| `seller_id` | UUID | FK (Users) | 出品者のユーザーID |
| `title` | String | Not Null | 参考書のタイトル |
| `description` | Text | Nullable | 商品の詳細説明（書き込み有無など） |
| `condition` | Enum | Not Null | new(新品), used_good(目立った傷なし), used_bad(傷や書き込みあり) |
| `category` | String | Nullable | 科目・カテゴリ（検索用） |
| `price` | Int | Default: 0 | 価格（0円推奨） |
| `image_url` | String | Nullable | 表紙などの画像URL |
| `status` | Enum | Default: 'available' | available(募集中), matching(マッチング中・他者遮断), completed(取引完了), canceled(出品取消) |
| `created_at` | DateTime |  | 出品日時 |
| `updated_at` | DateTime |  | 出品情報の更新日時 |

### 3. Transactions（取引・マッチングテーブル）★最重要

取引の状態を中央で管理します。マッチング成立時は日時未定のため、日時は `Nullable` にしています。

| カラム名 | 型 | 制約 / デフォルト | 説明 |
| --- | --- | --- | --- |
| `id` | UUID | PK | 取引ID |
| `item_id` | UUID | FK (Items) | 対象の参考書ID |
| `seller_id` | UUID | FK (Users) | 出品者のID |
| `buyer_id` | UUID | FK (Users) | 購入者（受け取り側）のID |
| `final_price` | Int | Nullable | 取引成立時点の価格スナップショット |
| `status` | Enum | Default: 'proposing' | proposing(日程提案中), scheduled(日時確定/ボード解放), completed(完了), canceled(中止) |
| `meeting_datetime` | DateTime | Nullable | 確定した待ち合わせ日時（提案承認後にUPDATE） |
| `meeting_place` | String | Nullable | 確定した待ち合わせ場所（提案承認後にUPDATE） |
| `seller_evaluated` | Boolean | Default: false | 出品者が評価を済ませたか（ダブルブラインド用） |
| `buyer_evaluated` | Boolean | Default: false | 購入者が評価を済ませたか（ダブルブラインド用） |
| `created_at` | DateTime |  | マッチング成立日時 |
| `updated_at` | DateTime |  | ステータス等の更新日時 |

### 4. Schedule_Proposals（日程調整フォームテーブル）

最大5つ送られる候補日を管理します。

| カラム名 | 型 | 制約 / デフォルト | 説明 |
| --- | --- | --- | --- |
| `id` | UUID | PK | 提案ID |
| `transaction_id` | UUID | FK (Transactions) | 紐づく取引ID |
| `sender_id` | UUID | FK (Users) | 提案を送信したユーザーID |
| `proposed_datetime` | DateTime | Not Null | 候補の日時 |
| `proposed_place` | String | Not Null | 候補の場所（テキストまたは固定値） |
| `status` | Enum | Default: 'pending' | pending(未回答), accepted(承認), rejected(拒否) |
| `created_at` | DateTime |  | 提案の送信日時 |
| `updated_at` | DateTime |  | 承認状態等の更新日時 |

### 4. Price_Offers（価格交渉オファーテーブル）

Take it or Leave it 方式の価格交渉を管理します。1取引あたり最大3回まで価格提案が可能です。

| カラム名 | 型 | 制約 / デフォルト | 説明 |
| --- | --- | --- | --- |
| `id` | UUID | PK | オファーID |
| `transaction_id` | UUID | FK (Transactions) | 紐づく取引ID |
| `sender_id` | UUID | FK (Users) | オファーを送信したユーザーID |
| `price` | Int | Not Null | 提案価格（0円可） |
| `status` | Enum | Default: 'pending' | pending(未回答), accepted(承認), rejected(辞退) |
| `offer_count` | Int | Not Null | 何回目のオファーか（1〜3）。3回目は受信側に承認/辞退の2択のみ表示 |
| `created_at` | DateTime |  | オファー送信日時 |
| `updated_at` | DateTime |  | ステータス更新日時 |

### 5. Messages（取引連絡ボードテーブル）

日時が確定した（`Transactions.status == 'scheduled'`）後のみ、書き込み・表示を許可するテーブルです。

| カラム名 | 型 | 制約 | 説明 |
| --- | --- | --- | --- |
| `id` | UUID | PK | メッセージID |
| `transaction_id` | UUID | FK (Transactions) | 紐づく取引ID |
| `sender_id` | UUID | FK (Users) | 送信者のユーザーID |
| `content` | Text | Not Null | メッセージ内容 |
| `created_at` | DateTime |  | 送信日時 |
| `updated_at` | DateTime |  | メッセージの更新日時（編集機能を付けない場合は不要でも可） |

### 6. Evaluations（相互評価・ペナルティログテーブル）

スコアの増減履歴を保存します。現在のスコア自体は `Users.credit_score` を更新しますが、ログとしてここに記録を残します。

| カラム名 | 型 | 制約 | 説明 |
| --- | --- | --- | --- |
| `id` | UUID | PK | 評価・ペナルティID |
| `transaction_id` | UUID | FK (Transactions) | 紐づく取引ID |
| `target_user_id` | UUID | FK (Users) | 点数を増減される対象のユーザーID |
| `reviewer_id` | UUID / Null | FK (Users) | 評価を付けたユーザーID（システムペナルティ時はNull） |
| `score_change` | Int | Not Null | +10, -10, -30 など |
| `type` | Enum | Not Null | good(+10), bad(-10), cancel(-10), no_show(-30:ドタキャン) |
| `created_at` | DateTime |  | 評価・ペナルティ発生日時 |
| `updated_at` | DateTime |  | 更新日時 |

### 7. Notifications（通知・受信箱テーブル）

取引の進行状況や、フォームが届いたことなどをユーザーに知らせます。

| カラム名 | 型 | 制約 | 説明 |
| --- | --- | --- | --- |
| `id` | UUID | PK | 通知ID |
| `user_id` | UUID | FK (Users) | 通知を受け取るユーザーID |
| `actor_id` | UUID | FK (Users) / Nullable | 通知を引き起こしたユーザーID（システム通知時はNull） |
| `title` | String | Not Null | 通知タイトル（例：「日程の提案が届きました」） |
| `type` | Enum | Not Null | action_required(要対応), info(お知らせ)など |
| `transaction_id` | UUID | Nullable | タップした時に該当の取引画面へ飛ばすためのID |
| `is_read` | Boolean | Default: false | 既読フラグ |
| `created_at` | DateTime |  | 通知発生日時 |
| `updated_at` | DateTime |  | 既読フラグ等の更新日時 |

df