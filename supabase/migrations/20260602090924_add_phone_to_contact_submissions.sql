/*
  # Add phone column to contact_submissions

  The contact form collects an optional phone number but the table
  doesn't have a matching column. This migration adds it.

  Changes:
  - `contact_submissions`: add nullable `phone` text column
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contact_submissions' AND column_name = 'phone'
  ) THEN
    ALTER TABLE contact_submissions ADD COLUMN phone text DEFAULT NULL;
  END IF;
END $$;
