/*
  # Add photo gallery to news articles and events

  1. Changes
    - `news_articles.gallery_urls` (text[], default '{}') — additional photos beyond the main cover image
    - `events.gallery_urls` (text[], default '{}') — photos from the event, beyond the main cover image
*/

ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS gallery_urls text[] NOT NULL DEFAULT '{}';
ALTER TABLE events ADD COLUMN IF NOT EXISTS gallery_urls text[] NOT NULL DEFAULT '{}';
