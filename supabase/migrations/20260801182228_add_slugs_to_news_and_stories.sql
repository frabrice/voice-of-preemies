/*
  # Add slugs to news_articles, stories, and events

  ## Why
  News articles, Stories, and Events only ever appeared as truncated cards on
  the aggregated /publications page — no way to click through and read the
  full piece, even though full long-form content already exists and is
  editable in the dashboard (`news_articles.content`, `stories.full_story`,
  `events.description`). Events specifically are used as after-the-fact
  recaps of things the org held, not a forward-looking calendar — so they get
  the same article treatment as News/Stories. This adds the same `slug`
  pattern already used by `programs` so each gets its own detail page
  (`/news/:slug`, `/stories/:slug`, `/events/:slug`).

  ## Changes
  - `news_articles`: add `slug` (text, unique, not null)
  - `stories`: add `slug` (text, unique, not null)
  - `events`: add `slug` (text, unique, not null)
  All defensive (IF NOT EXISTS) like the existing
  `20260528100816_add_program_detail_columns.sql` pattern — safe to run
  even where rows already exist (none do yet on this fresh project).
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'news_articles' AND column_name = 'slug'
  ) THEN
    ALTER TABLE news_articles ADD COLUMN slug text;
  END IF;
END $$;

UPDATE news_articles SET slug = id::text WHERE slug IS NULL;
ALTER TABLE news_articles ALTER COLUMN slug SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'news_articles_slug_key') THEN
    ALTER TABLE news_articles ADD CONSTRAINT news_articles_slug_key UNIQUE (slug);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stories' AND column_name = 'slug'
  ) THEN
    ALTER TABLE stories ADD COLUMN slug text;
  END IF;
END $$;

UPDATE stories SET slug = id::text WHERE slug IS NULL;
ALTER TABLE stories ALTER COLUMN slug SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stories_slug_key') THEN
    ALTER TABLE stories ADD CONSTRAINT stories_slug_key UNIQUE (slug);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'slug'
  ) THEN
    ALTER TABLE events ADD COLUMN slug text;
  END IF;
END $$;

UPDATE events SET slug = id::text WHERE slug IS NULL;
ALTER TABLE events ALTER COLUMN slug SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'events_slug_key') THEN
    ALTER TABLE events ADD CONSTRAINT events_slug_key UNIQUE (slug);
  END IF;
END $$;
