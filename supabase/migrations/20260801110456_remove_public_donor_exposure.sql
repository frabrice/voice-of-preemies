/*
  # Remove public read access to donors table

  ## Summary
  The `anon_select_donors` policy (added in 20260715103559_fix_rls_and_connections.sql)
  made the entire `donors` table — including donor_email, donor_phone, and internal
  notes — readable by anyone on the internet using only the public anon key. It was
  added for a "public donor recognition" feature that was never built; nothing in the
  app queries `donors` from the public (unauthenticated) side. This removes that
  policy so only authenticated dashboard users can read donor records, matching every
  other PII-bearing table in the schema.

  ## Security
  - Drops anon SELECT access to `donors`
  - Authenticated (dashboard) SELECT/INSERT/UPDATE/DELETE policies are untouched
*/

DROP POLICY IF EXISTS "anon_select_donors" ON donors;
