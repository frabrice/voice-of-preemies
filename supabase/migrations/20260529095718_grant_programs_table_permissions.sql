/*
  # Grant table-level permissions on programs table

  1. Changes
    - Grant SELECT on programs to anon role (public website can read published programs)
    - Grant SELECT, INSERT, UPDATE, DELETE on programs to authenticated role (dashboard admin can manage)

  2. Why
    - RLS policies existed but were never evaluated because the anon/authenticated roles
      had no underlying table-level GRANT permissions
    - This caused the Programs page to appear empty in production
*/

GRANT SELECT ON programs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON programs TO authenticated;
