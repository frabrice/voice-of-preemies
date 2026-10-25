/*
  # Admin user management hardening

  The dashboard's "Add User" form used to call the Supabase Admin API straight
  from the browser, which cannot work (it needs the secret service key). Users
  are now created, suspended, re-passworded and deleted by the
  `manage-admin-user` edge function. This migration makes those operations safe:

  - Deleting a user must not be blocked by rows that merely *reference* them
    (who created whom, who did what in the activity log), so those two foreign
    keys become ON DELETE SET NULL. The activity log keeps `user_email`, so the
    history stays readable.
  - `has_page_access(page)` lets later tables grant access to super admins plus
    any role the admin has granted that page to.
*/

ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_created_by_fkey;
ALTER TABLE user_roles
  ADD CONSTRAINT user_roles_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE user_activity_log DROP CONSTRAINT IF EXISTS user_activity_log_user_id_fkey;
ALTER TABLE user_activity_log
  ADD CONSTRAINT user_activity_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Super admin, or an active user whose role has been granted view access to `p_page`.
CREATE OR REPLACE FUNCTION has_page_access(p_page text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.status = 'active'
      AND (
        ur.role = 'super_admin'
        OR EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role = ur.role AND rp.page = p_page AND rp.can_view)
      )
  );
$$;
REVOKE ALL ON FUNCTION has_page_access(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION has_page_access(text) TO authenticated;
