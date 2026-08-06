/*
  # Broaden special_days into date-range upcoming_highlights

  ## Purpose
  The original `special_days` table only supported a single date, but upcoming
  items vary — an awareness day (1 day), an awareness week (World Breastfeeding
  Week, 7 days), or an upcoming program/training (e.g. 2-3 days). Renamed and
  widened to support an optional date range.

  ## Changes
  - Table renamed: `special_days` -> `upcoming_highlights` (existing RLS
    policies remain attached across the rename; nothing to recreate).
  - Column renamed: `date` -> `start_date`.
  - New column: `end_date` (date, nullable) — null means a single-day item;
    set means the item runs from start_date through end_date inclusive.
*/

ALTER TABLE special_days RENAME TO upcoming_highlights;
ALTER TABLE upcoming_highlights RENAME COLUMN date TO start_date;
ALTER TABLE upcoming_highlights ADD COLUMN IF NOT EXISTS end_date date;
