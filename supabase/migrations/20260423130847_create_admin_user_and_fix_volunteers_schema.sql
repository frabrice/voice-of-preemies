/*
  # Fix schema and create admin user

  1. Volunteers table - add missing columns that the app expects
     - `skills` (text) - alias via view or add column
     - `motivation` (text)
  
  2. Resources table - the app uses `url` but DB has `file_url`
     - Add `url` column that mirrors file_url usage
*/

-- Add skills column to volunteers if not exists (app uses 'skills', DB has 'role_interest')
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'volunteers' AND column_name = 'skills'
  ) THEN
    ALTER TABLE volunteers ADD COLUMN skills text DEFAULT '';
  END IF;
END $$;

-- Add motivation column to volunteers if not exists (app uses 'motivation', DB has 'experience')
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'volunteers' AND column_name = 'motivation'
  ) THEN
    ALTER TABLE volunteers ADD COLUMN motivation text DEFAULT '';
  END IF;
END $$;

-- Add url column to resources if not exists (app uses 'url', DB has 'file_url')
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'resources' AND column_name = 'url'
  ) THEN
    ALTER TABLE resources ADD COLUMN url text DEFAULT '';
  END IF;
END $$;
