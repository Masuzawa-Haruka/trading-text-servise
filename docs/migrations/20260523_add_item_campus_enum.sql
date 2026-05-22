-- Add campus enum to items so listing location stays constrained to Osaka University campuses.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Campus') THEN
    CREATE TYPE "Campus" AS ENUM ('toyonaka', 'suita', 'minoh');
  END IF;
END;
$$;

ALTER TABLE items
  ADD COLUMN IF NOT EXISTS campus "Campus" NOT NULL DEFAULT 'toyonaka';
