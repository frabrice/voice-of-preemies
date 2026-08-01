/*
  # Make email nullable on join_requests

  Parents and family members may not have email addresses.
  This migration makes the email column nullable so phone-only signups are possible.

  1. Modified Tables
    - `join_requests`
      - `email` changed from NOT NULL to nullable
*/

ALTER TABLE join_requests ALTER COLUMN email DROP NOT NULL;
