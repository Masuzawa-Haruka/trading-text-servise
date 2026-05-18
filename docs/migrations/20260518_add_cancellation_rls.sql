-- Add RLS policies for immediate cancellation history.
-- This file is used by backend/scratch/run_migration.js.

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
