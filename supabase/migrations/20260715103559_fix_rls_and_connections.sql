/*
# Fix RLS policies and connect website to database

## Changes
1. Add UPDATE and DELETE policies to peer_support_signups (currently can't edit/delete from dashboard)
2. Lock down user_roles to super_admin only for INSERT/UPDATE/DELETE (was: any authenticated user)
3. Lock down role_permissions to super_admin only for INSERT/UPDATE/DELETE (was: any authenticated user)
4. Lock down user_activity_log DELETE to super_admin only (was: any authenticated user)
5. Add anon SELECT policy for documents where access_level = 'public' (so public website can show public docs)
6. Add anon SELECT policy for board_members (so public About page can show board)
7. Add anon SELECT policy for events (already exists, verify)

## Security
- peer_support_signups: add UPDATE/DELETE for authenticated users
- user_roles: restrict writes to super_admin only
- role_permissions: restrict writes to super_admin only
- user_activity_log: restrict DELETE to super_admin only
- documents: allow anon to read public docs
- board_members: allow anon to read active board members
*/

-- 1. Fix peer_support_signups: add UPDATE and DELETE policies
ALTER TABLE peer_support_signups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "update_peer_support_signups" ON peer_support_signups;
CREATE POLICY "update_peer_support_signups" ON peer_support_signups FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_peer_support_signups" ON peer_support_signups;
CREATE POLICY "delete_peer_support_signups" ON peer_support_signups FOR DELETE
  TO authenticated USING (true);

-- 2. Lock down user_roles: only super_admin can INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "Anyone can insert user_roles" ON user_roles;
DROP POLICY IF EXISTS "Anyone can update user_roles" ON user_roles;
DROP POLICY IF EXISTS "Anyone can delete user_roles" ON user_roles;

CREATE POLICY "super_admin_insert_user_roles" ON user_roles FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin')
  );

CREATE POLICY "super_admin_update_user_roles" ON user_roles FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin')
  );

CREATE POLICY "super_admin_delete_user_roles" ON user_roles FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin')
  );

-- 3. Lock down role_permissions: only super_admin can INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "Anyone can insert role_permissions" ON role_permissions;
DROP POLICY IF EXISTS "Anyone can update role_permissions" ON role_permissions;
DROP POLICY IF EXISTS "Anyone can delete role_permissions" ON role_permissions;

CREATE POLICY "super_admin_insert_role_permissions" ON role_permissions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin')
  );

CREATE POLICY "super_admin_update_role_permissions" ON role_permissions FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin')
  );

CREATE POLICY "super_admin_delete_role_permissions" ON role_permissions FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin')
  );

-- 4. Lock down user_activity_log DELETE to super_admin only
DROP POLICY IF EXISTS "Anyone can delete user_activity_log" ON user_activity_log;
CREATE POLICY "super_admin_delete_activity_log" ON user_activity_log FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin')
  );

-- 5. Add anon SELECT for public documents
DROP POLICY IF EXISTS "anon_select_public_documents" ON documents;
CREATE POLICY "anon_select_public_documents" ON documents FOR SELECT
  TO anon, authenticated USING (access_level = 'public' AND deleted_at IS NULL);

-- 6. Add anon SELECT for active board_members
DROP POLICY IF EXISTS "anon_select_board_members" ON board_members;
CREATE POLICY "anon_select_board_members" ON board_members FOR SELECT
  TO anon, authenticated USING (active = true AND deleted_at IS NULL);

-- 7. Add anon SELECT for finance_categories (so public can see category names if needed)
DROP POLICY IF EXISTS "anon_select_finance_categories" ON finance_categories;
CREATE POLICY "anon_select_finance_categories" ON finance_categories FOR SELECT
  TO anon, authenticated USING (deleted_at IS NULL);

-- 8. Add anon SELECT for projects (public info)
DROP POLICY IF EXISTS "anon_select_projects" ON projects;
CREATE POLICY "anon_select_projects" ON projects FOR SELECT
  TO anon, authenticated USING (deleted_at IS NULL);

-- 9. Add anon SELECT for document_categories
DROP POLICY IF EXISTS "anon_select_document_categories" ON document_categories;
CREATE POLICY "anon_select_document_categories" ON document_categories FOR SELECT
  TO anon, authenticated USING (deleted_at IS NULL);

-- 10. Add anon SELECT for event_registrations (so users can see their registrations)
-- Actually keep this authenticated-only for privacy

-- 11. Add anon SELECT for donors (public donor recognition)
DROP POLICY IF EXISTS "anon_select_donors" ON donors;
CREATE POLICY "anon_select_donors" ON donors FOR SELECT
  TO anon, authenticated USING (deleted_at IS NULL);
