-- Add evidence image URLs to support reports.

ALTER TABLE reports
ADD COLUMN IF NOT EXISTS evidence_image_urls TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reports_evidence_image_urls_limit'
  ) THEN
    ALTER TABLE reports
      ADD CONSTRAINT reports_evidence_image_urls_limit
      CHECK (cardinality(evidence_image_urls) <= 5);
  END IF;
END;
$$;
