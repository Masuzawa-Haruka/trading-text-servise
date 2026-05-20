-- Staging differential migration to add item_images, schedule_candidates, and location tables with proper RLS.
-- This file is created to safely update existing DBs to match the latest schema.

-- ==========================================
-- 1. Items update & Item Images
-- ==========================================
ALTER TABLE items ADD COLUMN IF NOT EXISTS author VARCHAR;

CREATE TABLE IF NOT EXISTS item_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    image_url VARCHAR NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE item_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all item images" ON item_images;
CREATE POLICY "Users can view all item images" ON item_images FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Sellers can manage item images" ON item_images;
CREATE POLICY "Sellers can manage item images" ON item_images FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM items i
        WHERE i.id = item_images.item_id
        AND i.seller_id = auth.uid()
    )
);

-- ==========================================
-- 2. Schedule Candidates & Schedule Proposals Cleanup
-- ==========================================
CREATE TABLE IF NOT EXISTS schedule_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES schedule_proposals(id) ON DELETE CASCADE,
    proposed_datetime TIMESTAMPTZ NOT NULL,
    proposed_place VARCHAR NOT NULL,
    status "ProposalStatus" DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Remove deprecated columns from parent table if they exist
ALTER TABLE schedule_proposals DROP COLUMN IF EXISTS proposed_datetime;
ALTER TABLE schedule_proposals DROP COLUMN IF EXISTS proposed_place;

-- Trigger for schedule_candidates
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_schedule_candidates_modtime ON schedule_candidates;
CREATE TRIGGER update_schedule_candidates_modtime
BEFORE UPDATE ON schedule_candidates
FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();

ALTER TABLE schedule_candidates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Parties can view schedule candidates" ON schedule_candidates;
CREATE POLICY "Parties can view schedule candidates" ON schedule_candidates FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM schedule_proposals p
        JOIN transactions t ON t.id = p.transaction_id
        WHERE p.id = schedule_candidates.proposal_id
        AND (t.seller_id = auth.uid() OR t.buyer_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "Sender can insert schedule candidates" ON schedule_candidates;
CREATE POLICY "Sender can insert schedule candidates" ON schedule_candidates FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM schedule_proposals p
        JOIN transactions t ON t.id = p.transaction_id
        WHERE p.id = schedule_candidates.proposal_id
        AND p.sender_id = auth.uid()
        AND (t.seller_id = auth.uid() OR t.buyer_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "Receiver can update schedule candidates" ON schedule_candidates;
CREATE POLICY "Receiver can update schedule candidates" ON schedule_candidates FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM schedule_proposals p
        JOIN transactions t ON t.id = p.transaction_id
        WHERE p.id = schedule_candidates.proposal_id
        AND (t.seller_id = auth.uid() OR t.buyer_id = auth.uid())
        AND auth.uid() != p.sender_id
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM schedule_proposals p
        JOIN transactions t ON t.id = p.transaction_id
        WHERE p.id = schedule_candidates.proposal_id
        AND (t.seller_id = auth.uid() OR t.buyer_id = auth.uid())
        AND auth.uid() != p.sender_id
    )
);

-- ==========================================
-- 3. Location Master Tables (Campus & Spots)
-- ==========================================
CREATE TABLE IF NOT EXISTS location_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campus VARCHAR NOT NULL,
    name VARCHAR NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS location_spots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    area_id UUID NOT NULL REFERENCES location_areas(id) ON DELETE CASCADE,
    name VARCHAR NOT NULL,
    reference_image_url VARCHAR,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Triggers for location tables
DROP TRIGGER IF EXISTS update_location_areas_modtime ON location_areas;
CREATE TRIGGER update_location_areas_modtime
BEFORE UPDATE ON location_areas
FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();

DROP TRIGGER IF EXISTS update_location_spots_modtime ON location_spots;
CREATE TRIGGER update_location_spots_modtime
BEFORE UPDATE ON location_spots
FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();

ALTER TABLE location_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_spots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view location areas" ON location_areas;
CREATE POLICY "Users can view location areas" ON location_areas FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can view location spots" ON location_spots;
CREATE POLICY "Users can view location spots" ON location_spots FOR SELECT USING (auth.role() = 'authenticated');
