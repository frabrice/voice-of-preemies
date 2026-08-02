import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

export type UserRole = 'super_admin' | 'admin' | 'content_manager' | 'finance_manager' | 'database_manager' | 'support_agent' | 'event_coordinator';

export type Permission = 'website' | 'database' | 'contact' | 'donations' | 'events' | 'documents' | 'finance' | 'users' | 'settings' | 'trash' | 'subscribers' | 'forms';

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  content_manager: 'Content Manager',
  finance_manager: 'Finance Manager',
  database_manager: 'Database Manager',
  support_agent: 'Support Agent',
  event_coordinator: 'Event Coordinator',
};

export const ALL_PERMISSIONS: Permission[] = ['website', 'database', 'contact', 'donations', 'events', 'documents', 'finance', 'users', 'settings', 'trash', 'subscribers', 'forms'];

interface AdminAuthContextType {
  isAuthenticated: boolean;
  adminEmail: string;
  adminRole: UserRole;
  displayName: string;
  loading: boolean;
  can: (permission: Permission) => boolean;
  canCrud: (permission: Permission, action: 'view' | 'create' | 'edit' | 'delete') => boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  logActivity: (action: string, entityType: string, entityId?: string, details?: Record<string, unknown>) => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminRole, setAdminRole] = useState<UserRole>('admin');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<Record<string, { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }>>({});

  const loadUserRole = async (email: string) => {
    const { data } = await supabase.from('user_roles').select('role, display_name, status').eq('email', email).maybeSingle();
    if (data?.role) setAdminRole(data.role as UserRole);
    if (data?.display_name) setDisplayName(data.display_name);
    else setDisplayName(email.split('@')[0]);

    if (data?.role && data.role !== 'super_admin') {
      const { data: perms } = await supabase.from('role_permissions').select('page, can_view, can_create, can_edit, can_delete').eq('role', data.role);
      const map: Record<string, { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }> = {};
      (perms ?? []).forEach(p => { map[p.page] = { can_view: p.can_view, can_create: p.can_create, can_edit: p.can_edit, can_delete: p.can_delete }; });
      setPermissions(map);
    } else {
      setPermissions({});
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      const email = session?.user?.email ?? '';
      setAdminEmail(email);
      if (email) loadUserRole(email);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthenticated(!!session);
      const email = session?.user?.email ?? '';
      setAdminEmail(email);
      if (email) loadUserRole(email);
      else { setAdminRole('admin'); setDisplayName(''); setPermissions({}); }
    });

    return () => subscription.unsubscribe();
  }, []);

  const can = (permission: Permission) => {
    if (adminRole === 'super_admin') return true;
    return permissions[permission]?.can_view ?? false;
  };

  const canCrud = (permission: Permission, action: 'view' | 'create' | 'edit' | 'delete') => {
    if (adminRole === 'super_admin') return true;
    const p = permissions[permission];
    if (!p) return false;
    if (action === 'view') return p.can_view;
    if (action === 'create') return p.can_create;
    if (action === 'edit') return p.can_edit;
    if (action === 'delete') return p.can_delete;
    return false;
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return !error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const logActivity = async (action: string, entityType: string, entityId?: string, details?: Record<string, unknown>) => {
    try {
      await supabase.from('user_activity_log').insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        user_email: adminEmail,
        action,
        entity_type: entityType,
        entity_id: entityId,
        details: details ?? null,
      });
    } catch { /* best-effort */ }
  };

  if (loading) return null;

  return (
    <AdminAuthContext.Provider value={{ isAuthenticated, adminEmail, adminRole, displayName, loading, can, canCrud, login, logout, logActivity }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}
