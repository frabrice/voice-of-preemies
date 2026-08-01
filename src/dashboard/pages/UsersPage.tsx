import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAdminAuth, UserRole, ROLE_LABELS } from '../../contexts/AdminAuthContext';
import { Users as UsersIcon, UserPlus, Shield, Activity, Lock, Eye, EyeOff, AlertCircle, Check, X } from 'lucide-react';
import TabBar from '../components/TabBar';
import { EmptyState, SearchInput, fmtDateTime, inp, Lbl, StatusBadge } from '../components/shared';

const tabs = [
  { id: 'users', label: 'Users', icon: UsersIcon },
  { id: 'add', label: 'Add User', icon: UserPlus },
  { id: 'roles', label: 'Roles & Permissions', icon: Shield },
  { id: 'activity', label: 'Activity Log', icon: Activity },
];

const ALL_ROLES: UserRole[] = ['super_admin', 'admin', 'content_manager', 'finance_manager', 'database_manager', 'support_agent', 'event_coordinator'];
const ALL_PAGES = ['website', 'database', 'contact', 'donations', 'events', 'documents', 'finance', 'users', 'settings', 'trash', 'subscribers'];

function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    supabase.from('user_roles').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      setUsers(data ?? []);
      setLoading(false);
    });
  }, []);

  const updateRole = async (id: string, role: string) => {
    await supabase.from('user_roles').update({ role }).eq('id', id);
    setUsers(u => u.map(x => x.id === id ? { ...x, role } : x));
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    await supabase.from('user_roles').update({ status: newStatus }).eq('id', id);
    setUsers(u => u.map(x => x.id === id ? { ...x, status: newStatus } : x));
  };

  const filtered = users.filter(u => u.email?.toLowerCase().includes(search.toLowerCase()) || u.display_name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-3">
      <SearchInput value={search} onChange={setSearch} placeholder="Search users..." />
      {loading ? <p className="text-[12px] text-[#94A3B8] text-center py-8">Loading...</p> : filtered.length === 0 ? <EmptyState icon={UsersIcon} message="No users found." /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            <thead>
              <tr className="border-b border-slate-100 text-left text-[10px] text-[#94A3B8] uppercase tracking-wider">
                <th className="py-2 px-2">Name</th>
                <th className="py-2 px-2">Email</th>
                <th className="py-2 px-2">Role</th>
                <th className="py-2 px-2">Status</th>
                <th className="py-2 px-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-2.5 px-2 font-semibold text-[#1e293b]">{u.display_name ?? u.email?.split('@')[0]}</td>
                  <td className="py-2.5 px-2 text-[#64748B]">{u.email}</td>
                  <td className="py-2.5 px-2">
                    <select value={u.role ?? 'admin'} onChange={e => updateRole(u.id, e.target.value)} className="text-[11px] rounded-lg border border-slate-200 px-2 py-1">
                      {ALL_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                    </select>
                  </td>
                  <td className="py-2.5 px-2"><StatusBadge status={u.status ?? 'active'} /></td>
                  <td className="py-2.5 px-2">
                    <button onClick={() => toggleStatus(u.id, u.status)} className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200">
                      {u.status === 'active' ? 'Suspend' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AddUserTab() {
  const { logActivity } = useAdminAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('content_manager');
  const [showPw, setShowPw] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true); setMsg(null);
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email, password,
        email_confirm: true,
        user_metadata: { display_name: name },
      });
      if (error) { setMsg({ type: 'error', text: error.message }); setBusy(false); return; }
      const userId = data.user?.id;
      if (userId) {
        await supabase.from('user_roles').insert({
          user_id: userId, email, role, display_name: name, status: 'active', created_by: (await supabase.auth.getUser()).data.user?.id,
        });
      }
      await logActivity('create_user', 'user', userId, { email, role });
      setMsg({ type: 'success', text: `User ${email} created successfully.` });
      setName(''); setEmail(''); setPassword(''); setRole('content_manager');
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message ?? 'Failed to create user.' });
    }
    setBusy(false);
  };

  return (
    <div className="max-w-md space-y-3">
      {msg && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-semibold ${msg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          {msg.type === 'success' ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
          {msg.text}
        </div>
      )}
      <div><Lbl t="Display Name" /><input value={name} onChange={e => setName(e.target.value)} className={inp} placeholder="Jane Doe" /></div>
      <div><Lbl t="Email" /><input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inp} placeholder="jane@voiceofpreemies.org" /></div>
      <div>
        <Lbl t="Password" />
        <div className="relative">
          <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className={inp} placeholder="••••••••" />
          <button onClick={() => setShowPw(p => !p)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#94A3B8] hover:text-[#64748B]">
            {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
      <div><Lbl t="Role" /><select value={role} onChange={e => setRole(e.target.value as UserRole)} className={inp}>{ALL_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select></div>
      <button onClick={submit} disabled={busy || !email || !password} className="w-full px-3 py-2 rounded-xl bg-[#0A6070] text-white text-[12px] font-semibold disabled:opacity-50">
        {busy ? 'Creating...' : 'Create User'}
      </button>
    </div>
  );
}

function RolesTab() {
  const [perms, setPerms] = useState<Record<string, Record<string, { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }>>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('role_permissions').select('*').then(({ data }) => {
      const map: Record<string, Record<string, any>> = {};
      (data ?? []).forEach(p => {
        if (!map[p.role]) map[p.role] = {};
        map[p.role][p.page] = { can_view: p.can_view, can_create: p.can_create, can_edit: p.can_edit, can_delete: p.can_delete };
      });
      setPerms(map);
      setLoading(false);
    });
  }, []);

  const toggle = async (role: string, page: string, field: 'can_view' | 'can_create' | 'can_edit' | 'can_delete') => {
    const current = perms[role]?.[page]?.[field] ?? false;
    const newVal = !current;
    const row = perms[role]?.[page] ?? { can_view: false, can_create: false, can_edit: false, can_delete: false };
    const updated = { ...row, [field]: newVal };
    setPerms(p => ({ ...p, [role]: { ...(p[role] ?? {}), [page]: updated } }));

    const { data: existing } = await supabase.from('role_permissions').select('id').eq('role', role).eq('page', page).maybeSingle();
    if (existing) await supabase.from('role_permissions').update({ [field]: newVal }).eq('id', existing.id);
    else await supabase.from('role_permissions').insert({ role, page, ...updated });
  };

  if (loading) return <p className="text-[12px] text-[#94A3B8] text-center py-8">Loading...</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        <thead>
          <tr className="border-b border-slate-100 text-left text-[9px] text-[#94A3B8] uppercase tracking-wider">
            <th className="py-2 px-2 sticky left-0 bg-white">Role</th>
            {ALL_PAGES.map(pg => <th key={pg} className="py-2 px-1 text-center">{pg}</th>)}
          </tr>
        </thead>
        <tbody>
          {ALL_ROLES.filter(r => r !== 'super_admin').map(role => (
            <tr key={role} className="border-b border-slate-50">
              <td className="py-2 px-2 font-bold text-[#1e293b] sticky left-0 bg-white whitespace-nowrap">{ROLE_LABELS[role]}</td>
              {ALL_PAGES.map(page => (
                <td key={page} className="py-1.5 px-1 text-center">
                  <button
                    onClick={() => toggle(role, page, 'can_view')}
                    className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${perms[role]?.[page]?.can_view ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-300'}`}
                  >
                    {perms[role]?.[page]?.can_view ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                  </button>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[10px] text-[#94A3B8] mt-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Super Admin always has full access to all pages. Toggle a cell to grant/revoke view access for that role.</p>
    </div>
  );
}

function ActivityLogTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('user_activity_log').select('*').order('created_at', { ascending: false }).limit(50).then(({ data }) => {
      setLogs(data ?? []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-2">
      {loading ? <p className="text-[12px] text-[#94A3B8] text-center py-8">Loading...</p> : logs.length === 0 ? <EmptyState icon={Activity} message="No activity logged yet." /> : (
        logs.map(l => (
          <div key={l.id} className="bg-white rounded-xl border border-slate-100 p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-600 flex-shrink-0">
                {l.user_email?.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-[#1e293b] truncate" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  <span className="capitalize">{l.action.replace(/_/g, ' ')}</span> · {l.entity_type}
                </p>
                <p className="text-[10px] text-[#94A3B8]">{l.user_email} · {fmtDateTime(l.created_at)}</p>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default function UsersPage() {
  const { adminRole } = useAdminAuth();
  const [active, setActive] = useState('users');

  if (adminRole !== 'super_admin') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-3">
          <Lock className="w-5 h-5 text-red-500" />
        </div>
        <p className="text-[14px] font-bold text-[#1e293b]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Super Admin Only</p>
        <p className="text-[11px] text-[#94A3B8] mt-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>User management is restricted to Super Admin accounts.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-lg font-bold text-[#0f172a]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Users</h1>
        <p className="text-[11px] text-[#64748B] mt-0.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Create accounts, manage roles, and view activity logs.</p>
      </div>
      <TabBar tabs={tabs} active={active} onChange={setActive} />
      <div className="bg-white/60 rounded-2xl border border-slate-100 shadow-sm p-4">
        {active === 'users' && <UsersTab />}
        {active === 'add' && <AddUserTab />}
        {active === 'roles' && <RolesTab />}
        {active === 'activity' && <ActivityLogTab />}
      </div>
    </div>
  );
}
