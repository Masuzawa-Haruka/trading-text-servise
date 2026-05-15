-- Migration: price_offers テーブルを新規追加
-- 実行日: 2026-05-15
-- 対応PR: feature/transaction-api
-- 概要: Take it or Leave it 方式の価格交渉機能。1取引あたり最大3回のオファーを管理する。

-- 1. Enum 型を追加
CREATE TYPE offer_status AS ENUM ('pending', 'accepted', 'rejected');

-- 2. price_offers テーブルを追加
CREATE TABLE price_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    price INT NOT NULL CHECK (price >= 0),
    status offer_status DEFAULT 'pending',
    offer_count INT NOT NULL CHECK (offer_count BETWEEN 1 AND 3),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RLS を有効化
ALTER TABLE price_offers ENABLE ROW LEVEL SECURITY;

-- 4. RLS ポリシーを設定
-- 取引の当事者のみ閲覧可能
CREATE POLICY "Parties can view price offers" ON price_offers FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM transactions t
        WHERE t.id = price_offers.transaction_id
        AND (t.seller_id = auth.uid() OR t.buyer_id = auth.uid())
    )
);

-- 取引の当事者のみオファーを送信可能（自分が sender として作成）
CREATE POLICY "Parties can insert price offers" ON price_offers FOR INSERT
WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
        SELECT 1 FROM transactions t
        WHERE t.id = price_offers.transaction_id
        AND (t.seller_id = auth.uid() OR t.buyer_id = auth.uid())
    )
);

-- 受信側（送信者でない当事者）のみ承認/辞退できる
CREATE POLICY "Receiver can update price offers" ON price_offers FOR UPDATE
USING (
    auth.uid() != sender_id
    AND EXISTS (
        SELECT 1 FROM transactions t
        WHERE t.id = price_offers.transaction_id
        AND (t.seller_id = auth.uid() OR t.buyer_id = auth.uid())
    )
);

-- 5. updated_at 自動更新トリガーを追加
CREATE TRIGGER update_price_offers_modtime
    BEFORE UPDATE ON price_offers
    FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
