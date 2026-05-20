-- ==========================================
-- Enum Types
-- ==========================================
-- Synced from backend/prisma/schema.prisma
-- Last updated: 2026-05-19

CREATE TYPE "UserStatus" AS ENUM ('active', 'warning', 'suspended');
CREATE TYPE "ItemStatus" AS ENUM ('available', 'matching', 'completed', 'canceled');
CREATE TYPE "ItemCondition" AS ENUM ('new', 'used_good', 'used_bad');
CREATE TYPE "TransactionStatus" AS ENUM ('proposing', 'scheduled', 'completed', 'canceled');
CREATE TYPE "ProposalStatus" AS ENUM ('pending', 'accepted', 'rejected');
CREATE TYPE "CancellationStatus" AS ENUM ('pending', 'accepted', 'rejected');
CREATE TYPE "OfferStatus" AS ENUM ('pending', 'accepted', 'rejected');
CREATE TYPE "EvaluationType" AS ENUM ('good', 'bad', 'cancel', 'no_show');
CREATE TYPE "NotificationType" AS ENUM ('action_required', 'info');

-- ==========================================
-- Tables
-- ==========================================

-- 1. Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR UNIQUE NOT NULL,
    nickname VARCHAR NOT NULL,
    profile_image_url VARCHAR,
    credit_score INT DEFAULT 100,
    status "UserStatus" DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Items
CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR NOT NULL,
    author VARCHAR,
    description TEXT,
    condition "ItemCondition" DEFAULT 'new',
    category VARCHAR,
    price INT DEFAULT 0,
    status "ItemStatus" DEFAULT 'available',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.1 Item Images
CREATE TABLE item_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    image_url VARCHAR NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Transactions
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    final_price INT,
    status "TransactionStatus" DEFAULT 'proposing',
    meeting_datetime TIMESTAMPTZ,
    meeting_place VARCHAR,
    seller_evaluated BOOLEAN DEFAULT false,
    buyer_evaluated BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Schedule Proposals
CREATE TABLE schedule_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status "ProposalStatus" DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.1 Schedule Candidates
CREATE TABLE schedule_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES schedule_proposals(id) ON DELETE CASCADE,
    proposed_datetime TIMESTAMPTZ NOT NULL,
    proposed_place VARCHAR NOT NULL,
    status "ProposalStatus" DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- 5. Price Offers（価格交渉: Take it or Leave it 方式 / 最大3回）
CREATE TABLE price_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    price INT NOT NULL CHECK (price >= 0),
    status "OfferStatus" DEFAULT 'pending',
    offer_count INT NOT NULL CHECK (offer_count BETWEEN 1 AND 3),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Messages
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Evaluations
CREATE TABLE evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    score_change INT NOT NULL,
    type "EvaluationType" NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR NOT NULL,
    type "NotificationType" NOT NULL,
    transaction_id UUID,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Cancellation Requests (Immediate cancellation history)
-- After backend cancellation APIs stabilize, rename this to CancellationEvent/Cancellation
CREATE TABLE cancellation_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL UNIQUE REFERENCES transactions(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT,
    status "CancellationStatus" DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Location Areas (Campus / Area master)
CREATE TABLE location_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campus VARCHAR NOT NULL,
    name VARCHAR NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Location Spots (Specific spot master)
CREATE TABLE location_spots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    area_id UUID NOT NULL REFERENCES location_areas(id) ON DELETE CASCADE,
    name VARCHAR NOT NULL,
    reference_image_url VARCHAR,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- RLS (Row Level Security) Policies
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE cancellation_requests ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------
-- 1. Users
-- 誰でも(ログインユーザーなら)他人のプロフィールを閲覧可能
CREATE POLICY "Users can view all users" ON users FOR SELECT USING (auth.role() = 'authenticated');
-- 自分のプロフィールのみ更新可能
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- ------------------------------------------
-- 2. Items
-- 誰でも出品リストを閲覧可能
CREATE POLICY "Users can view all items" ON items FOR SELECT USING (auth.role() = 'authenticated');
-- 自分が出品者となるアイテムのみ作成可能
CREATE POLICY "Users can insert own items" ON items FOR INSERT WITH CHECK (auth.uid() = seller_id);
-- 出品者のみ更新可能
CREATE POLICY "Sellers can update own items" ON items FOR UPDATE USING (auth.uid() = seller_id);

-- ------------------------------------------
-- 3. Transactions
-- 取引の当事者(出品者または受取者)のみ閲覧可能
CREATE POLICY "Parties can view their transactions" ON transactions FOR SELECT 
USING (auth.uid() = seller_id OR auth.uid() = buyer_id);
-- 受取者として取引を作成可能
CREATE POLICY "Buyers can insert transactions" ON transactions FOR INSERT 
WITH CHECK (auth.uid() = buyer_id);
-- 取引の当事者のみ更新可能
CREATE POLICY "Parties can update their transactions" ON transactions FOR UPDATE 
USING (auth.uid() = seller_id OR auth.uid() = buyer_id);

-- ------------------------------------------
-- 4. Schedule Proposals
-- 取引の当事者のみ閲覧可能
CREATE POLICY "Parties can view proposals" ON schedule_proposals FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM transactions t 
        WHERE t.id = schedule_proposals.transaction_id 
        AND (t.seller_id = auth.uid() OR t.buyer_id = auth.uid())
    )
);
-- 提案の送信者としてのみ作成可能
CREATE POLICY "Parties can insert proposals" ON schedule_proposals FOR INSERT 
WITH CHECK (auth.uid() = sender_id);
-- 提案の「受信側（相手）」のみ承認(更新)可能
CREATE POLICY "Receiver can update proposals" ON schedule_proposals FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM transactions t 
        WHERE t.id = schedule_proposals.transaction_id 
        AND (t.seller_id = auth.uid() OR t.buyer_id = auth.uid())
    )
    AND auth.uid() != sender_id
);

-- ------------------------------------------
-- 5. Price Offers
-- 取引の当事者のみ閲覧可能
CREATE POLICY "Parties can view price offers" ON price_offers FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM transactions t
        WHERE t.id = price_offers.transaction_id
        AND (t.seller_id = auth.uid() OR t.buyer_id = auth.uid())
    )
);
-- 取引の当事者のみオファーを送信可能
CREATE POLICY "Parties can insert price offers" ON price_offers FOR INSERT
WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
        SELECT 1 FROM transactions t
        WHERE t.id = price_offers.transaction_id
        AND (t.seller_id = auth.uid() OR t.buyer_id = auth.uid())
    )
);
-- オファーの受信側（送信者でない当事者）のみ承認/辞退できる
CREATE POLICY "Receiver can update price offers" ON price_offers FOR UPDATE
USING (
    auth.uid() != sender_id
    AND EXISTS (
        SELECT 1 FROM transactions t
        WHERE t.id = price_offers.transaction_id
        AND (t.seller_id = auth.uid() OR t.buyer_id = auth.uid())
    )
);

-- ------------------------------------------
-- 6. Messages
-- 取引の当事者のみメッセージを閲覧可能
CREATE POLICY "Parties can view messages" ON messages FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM transactions t 
        WHERE t.id = messages.transaction_id 
        AND (t.seller_id = auth.uid() OR t.buyer_id = auth.uid())
    )
);
-- 送信者としてメッセージを作成可能
CREATE POLICY "Parties can insert messages" ON messages FOR INSERT 
WITH CHECK (auth.uid() = sender_id);
-- ※ メッセージの更新・削除は不可とするためポリシーなし

-- ------------------------------------------
-- 7. Evaluations
-- 評価された対象者、または評価者は閲覧可能
CREATE POLICY "Target and reviewer can view evaluations" ON evaluations FOR SELECT 
USING (auth.uid() = target_user_id OR auth.uid() = reviewer_id);
-- 評価者として作成可能
CREATE POLICY "Reviewers can insert evaluations" ON evaluations FOR INSERT 
WITH CHECK (auth.uid() = reviewer_id);

-- ------------------------------------------
-- 8. Notifications
-- 自分の通知のみ閲覧可能
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT 
USING (auth.uid() = user_id);
-- 自分の通知のみ既読更新可能
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE 
USING (auth.uid() = user_id);

-- ------------------------------------------
-- 9. Cancellation History
-- 取引の当事者のみ閲覧可能
CREATE POLICY "Parties can view cancellation history" ON cancellation_requests FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM transactions t 
        WHERE t.id = cancellation_requests.transaction_id 
        AND (t.seller_id = auth.uid() OR t.buyer_id = auth.uid())
    )
);
-- キャンセル実行者としてのみ作成可能
CREATE POLICY "Parties can insert cancellation history" ON cancellation_requests FOR INSERT 
WITH CHECK (
    auth.uid() = requester_id
    AND EXISTS (
        SELECT 1 FROM transactions t 
        WHERE t.id = cancellation_requests.transaction_id 
        AND (t.seller_id = auth.uid() OR t.buyer_id = auth.uid())
    )
);

-- ------------------------------------------
-- 10. Item Images
-- 誰でも閲覧可能
CREATE POLICY "Users can view all item images" ON item_images FOR SELECT USING (auth.role() = 'authenticated');
-- 出品者のみ画像を追加・編集可能
CREATE POLICY "Sellers can manage item images" ON item_images FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM items i
        WHERE i.id = item_images.item_id
        AND i.seller_id = auth.uid()
    )
);

-- ------------------------------------------
-- 11. Schedule Candidates
-- 取引の当事者のみ閲覧可能
CREATE POLICY "Parties can view schedule candidates" ON schedule_candidates FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM schedule_proposals p
        JOIN transactions t ON t.id = p.transaction_id
        WHERE p.id = schedule_candidates.proposal_id
        AND (t.seller_id = auth.uid() OR t.buyer_id = auth.uid())
    )
);

-- ------------------------------------------
-- 12. Location Areas & Spots
-- 誰でも場所マスターを閲覧可能
CREATE POLICY "Users can view location areas" ON location_areas FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can view location spots" ON location_spots FOR SELECT USING (auth.role() = 'authenticated');

-- ==========================================
-- Triggers for updated_at
-- ==========================================
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_modtime BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_items_modtime BEFORE UPDATE ON items FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_transactions_modtime BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_schedule_proposals_modtime BEFORE UPDATE ON schedule_proposals FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_schedule_candidates_modtime BEFORE UPDATE ON schedule_candidates FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_price_offers_modtime BEFORE UPDATE ON price_offers FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_evaluations_modtime BEFORE UPDATE ON evaluations FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_notifications_modtime BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_cancellation_requests_modtime BEFORE UPDATE ON cancellation_requests FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_location_areas_modtime BEFORE UPDATE ON location_areas FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_location_spots_modtime BEFORE UPDATE ON location_spots FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- ==========================================
-- Auth Trigger (Auto-create public.users)
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, nickname)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'nickname', 'ゲストユーザー')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

