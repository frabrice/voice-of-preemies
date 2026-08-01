/*
  # Add soft delete support to all managed tables

  Adds a `deleted_at` timestamp column (nullable) to every content table.
  When a record is "deleted" from the dashboard, this column is set to the
  current timestamp instead of removing the row. NULL means active/not deleted.

  Tables updated:
  - news_articles
  - stories
  - programs
  - team_members
  - partners
  - events
  - resources
  - volunteers
  - contact_submissions
  - donation_records
  - site_stats
*/

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'news_articles' AND column_name = 'deleted_at') THEN
    ALTER TABLE news_articles ADD COLUMN deleted_at timestamptz DEFAULT NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stories' AND column_name = 'deleted_at') THEN
    ALTER TABLE stories ADD COLUMN deleted_at timestamptz DEFAULT NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'programs' AND column_name = 'deleted_at') THEN
    ALTER TABLE programs ADD COLUMN deleted_at timestamptz DEFAULT NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'team_members' AND column_name = 'deleted_at') THEN
    ALTER TABLE team_members ADD COLUMN deleted_at timestamptz DEFAULT NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partners' AND column_name = 'deleted_at') THEN
    ALTER TABLE partners ADD COLUMN deleted_at timestamptz DEFAULT NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'deleted_at') THEN
    ALTER TABLE events ADD COLUMN deleted_at timestamptz DEFAULT NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resources' AND column_name = 'deleted_at') THEN
    ALTER TABLE resources ADD COLUMN deleted_at timestamptz DEFAULT NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'volunteers' AND column_name = 'deleted_at') THEN
    ALTER TABLE volunteers ADD COLUMN deleted_at timestamptz DEFAULT NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contact_submissions' AND column_name = 'deleted_at') THEN
    ALTER TABLE contact_submissions ADD COLUMN deleted_at timestamptz DEFAULT NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'donation_records' AND column_name = 'deleted_at') THEN
    ALTER TABLE donation_records ADD COLUMN deleted_at timestamptz DEFAULT NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_stats' AND column_name = 'deleted_at') THEN
    ALTER TABLE site_stats ADD COLUMN deleted_at timestamptz DEFAULT NULL;
  END IF;
END $$;
