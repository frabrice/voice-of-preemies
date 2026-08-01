/*
  # Update peer_support_signups table schema

  1. Modified Columns
    - `email` - changed from NOT NULL to nullable (now optional)
    - `phone` - changed from nullable to NOT NULL (now required)
  2. New Columns
    - `relationship` (text, NOT NULL) - stores the user's relation to the preemie (Mother, Father, Brother, Sister, Grandparent, Other)
  3. Notes
    - Existing rows with NULL phone will be set to empty string before applying NOT NULL constraint
    - Existing rows will get 'Other' as default relationship value
*/

-- Backfill existing NULL phone values before making NOT NULL
UPDATE peer_support_signups SET phone = '' WHERE phone IS NULL;

-- Make email nullable
ALTER TABLE peer_support_signups ALTER COLUMN email DROP NOT NULL;

-- Make phone NOT NULL
ALTER TABLE peer_support_signups ALTER COLUMN phone SET NOT NULL;

-- Add relationship column with default for existing rows
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'peer_support_signups' AND column_name = 'relationship'
  ) THEN
    ALTER TABLE peer_support_signups ADD COLUMN relationship text NOT NULL DEFAULT 'Other';
  END IF;
END $$;
