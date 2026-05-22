-- Add preferred handoff location text to items.
-- The campus itself remains constrained by the Campus enum; the detailed
-- location is text because users can choose "other" and enter a precise spot.

ALTER TABLE items
  ADD COLUMN IF NOT EXISTS handoff_location VARCHAR;
