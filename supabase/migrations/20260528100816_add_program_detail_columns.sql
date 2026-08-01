/*
  # Add detail columns to programs table

  1. New Columns
    - `slug` (text, unique, not null) - URL-friendly identifier for routing
    - `tagline` (text, nullable) - Evocative subtitle displayed under the title
    - `long_description` (text, nullable) - Extended content for the detail page
    - `icon_name` (text, nullable) - Lucide icon name for visual identity

  2. Notes
    - Existing rows get a slug generated from their id (temporary, editable later)
    - Unique constraint on slug ensures no duplicates
*/

-- Add columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'programs' AND column_name = 'slug'
  ) THEN
    ALTER TABLE programs ADD COLUMN slug text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'programs' AND column_name = 'tagline'
  ) THEN
    ALTER TABLE programs ADD COLUMN tagline text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'programs' AND column_name = 'long_description'
  ) THEN
    ALTER TABLE programs ADD COLUMN long_description text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'programs' AND column_name = 'icon_name'
  ) THEN
    ALTER TABLE programs ADD COLUMN icon_name text;
  END IF;
END $$;

-- Backfill existing rows with a slug from their id
UPDATE programs SET slug = id::text WHERE slug IS NULL;

-- Now make slug NOT NULL and UNIQUE
ALTER TABLE programs ALTER COLUMN slug SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'programs_slug_key'
  ) THEN
    ALTER TABLE programs ADD CONSTRAINT programs_slug_key UNIQUE (slug);
  END IF;
END $$;
