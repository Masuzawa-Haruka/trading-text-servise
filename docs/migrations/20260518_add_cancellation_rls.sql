-- Add immediate cancellation history schema and RLS policies.
-- This file is used by backend/scratch/run_migration.js.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CancellationStatus') THEN
        CREATE TYPE "CancellationStatus" AS ENUM ('pending', 'accepted', 'rejected');
    END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS cancellation_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL UNIQUE REFERENCES transactions(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT,
    status "CancellationStatus" DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_cancellation_requests_modtime ON cancellation_requests;
CREATE TRIGGER update_cancellation_requests_modtime
BEFORE UPDATE ON cancellation_requests
FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();

ALTER TABLE cancellation_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Parties can view cancellation history" ON cancellation_requests;
CREATE POLICY "Parties can view cancellation history" ON cancellation_requests
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM transactions t
        WHERE t.id = cancellation_requests.transaction_id
          AND (t.seller_id = auth.uid() OR t.buyer_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "Parties can insert cancellation history" ON cancellation_requests;
CREATE POLICY "Parties can insert cancellation history" ON cancellation_requests
FOR INSERT
WITH CHECK (
    auth.uid() = requester_id
    AND EXISTS (
        SELECT 1
        FROM transactions t
        WHERE t.id = cancellation_requests.transaction_id
          AND (t.seller_id = auth.uid() OR t.buyer_id = auth.uid())
    )
);
