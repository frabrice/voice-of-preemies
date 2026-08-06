/*
  # Add flyer and VIP plan to upcoming_highlights

  ## Changes
  - `flyer_url` (text, default '') — an uploaded flyer image (Cloudinary),
    downloadable from the public Publications page.
  - `plan` (text, default '') — short "VIP" (Voice of Preemies) plan describing
    what the organization will specifically do to mark the day/week.
*/

ALTER TABLE upcoming_highlights ADD COLUMN IF NOT EXISTS flyer_url text DEFAULT '';
ALTER TABLE upcoming_highlights ADD COLUMN IF NOT EXISTS plan text DEFAULT '';
