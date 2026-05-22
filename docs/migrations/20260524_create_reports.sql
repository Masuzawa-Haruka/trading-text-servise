-- Create support reports for transaction-related abuse reports.

CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reported_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason VARCHAR NOT NULL,
    detail TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT reports_reporter_not_reported CHECK (reporter_id <> reported_user_id)
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reporters can view own reports" ON reports;
CREATE POLICY "Reporters can view own reports" ON reports FOR SELECT
USING (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Parties can insert reports against counterparty" ON reports;
CREATE POLICY "Parties can insert reports against counterparty" ON reports FOR INSERT
WITH CHECK (
    auth.uid() = reporter_id
    AND reporter_id <> reported_user_id
    AND EXISTS (
        SELECT 1 FROM transactions t
        WHERE t.id = reports.transaction_id
        AND (
            (t.seller_id = auth.uid() AND t.buyer_id = reports.reported_user_id)
            OR (t.buyer_id = auth.uid() AND t.seller_id = reports.reported_user_id)
        )
    )
);

CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_reports_modtime ON reports;
CREATE TRIGGER update_reports_modtime
BEFORE UPDATE ON reports
FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();
