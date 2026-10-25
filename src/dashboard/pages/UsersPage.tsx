import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAdminAuth, UserRole, ROLE_LABELS } from '../../contexts/AdminAuthContext';
import { Users as UsersIcon, UserPlus, Shield, Activity, Lock, Eye, EyeOff, AlertCircle, Check, X, KeyRound, Trash2, Copy, Wand2, Loader2, Ban, RotateCcw } from 'lucide-react';
import TabBar from '../components/TabBar';
import ConfirmDialog from '../components/ConfirmDialog';
import { EmptyState, SearchInput, fmtDateTime, inp, Lbl, StatusBadge, callAdminFunction } from '../components/shared';

const font = { fontFamily: 'Plus Jakarta Sans, sans-serif' };

const tabs = [
  { id: 'users', label: 'Users', icon: UsersIcon },
  { id: 'add', label: 'Add User', icon: UserPlus },
  { id: 'roles', label: 'Roles & Permissions', icon: Shield },
  { id: 'activity', label: 'Activity Log', icon: Activity },
];

const ALL_ROLES: UserRole[] = ['super_admin', 'admin', 'content_manager', 'finance_manager', 'database_manager', 'support_agent', 'event_coordinator'];
const ALL_PAGES = ['website', 'database', 'contact', 'donations', 'events', 'documents', 'finance', 'users', 'settings', 'trash', 'subscribers', 'forms', 'consultations', 'homecare'];

interface UserRow {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  role: UserRole;
  status: 'active' | 'suspended';
  created_at: string;
  last_sign_in_at: string | null;
}

type Notice = { type: 'success' | 'error'; text: string } | null;
type PermMap = Record<string, Record<string, { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }>>;
interface LogRow { id: string; user_email: string | null; action: string; entity_type: string; details: Record<string, string> | null; created_at: string }

function NoticeBar({ msg, onClose }: { msg: Notice; onClose?: () => void }) {
  if (!msg) return null;
  return (
    <div className={`flex items-start gap-2 px-3 py-2 rounded-xl text-[11px] font-semibold ${msg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`} style={font} role="status">
      {msg.type === 'success' ? <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />}
      <span className="flex-1">{msg.text}</span>
      {onClose && <button onClick={onClose} aria-label="Dismiss"><X className="w-3 h-3 opacity-60" /></button>}
    </div>
  );
}

function generatePassword(): string {
  // No look-alike characters (0/O, 1/l/I), so it is easy to read out over the phone.
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = new Uint32Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => chars[b % chars.length]).join('');
}

function PasswordField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(true);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(value); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch { /* clipboard blocked */ }
  };
  return (
    <div>
      <div className="relative">
        <input type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)} className={`${inp} pr-20 font-mono`} placeholder={placeholder ?? 'At least 8 characters'} autoComplete="new-password" />
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center">
          <button type="button" onClick={() => setShow(s => !s)} className="p-1.5 text-[#94A3B8] hover:text-[#64748B]" aria-label={show ? 'Hide password' : 'Show password'}>
            {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
          <button type="button" onClick={copy} disabled={!value} className="p-1.5 text-[#94A3B8] hover:text-[#0A6070] disabled:opacity-40" aria-label="Copy password">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
      <button type="button" onClick={() => onChange(generatePassword())} className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-[#0A6070] hover:underline" style={font}>
        <Wand2 className="w-3 h-3" /> Generate a strong password
      </button>
    </div>
  );
}

function ResetPasswordDialog({ user, onClose, onDone }: { user: UserRow; onClose: () => void; onDone: (msg: Notice) => void }) {
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    setBusy(true); setError('');
    const { error: err } = await callAdminFunction('manage-admin-user', { action: 'set_password', userId: user.user_id, password: pw });
    setBusy(false);
    if (err) { setError(err); return; }
    onDone({ type: 'success', text: `New password set for ${user.email}. Share it with them privately.` });
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 space-y-3">
        <h3 className="text-[15px] font-bold text-[#0f172a]" style={font}>Set a new password</h3>
        <p className="text-[11px] text-[#64748B]" style={font}>For {user.display_name || user.email}. Their old password stops working straight away.</p>
        {error && <NoticeBar msg={{ type: 'error', text: error }} />}
        <PasswordField value={pw} onChange={setPw} />
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-[12px] font-semibold text-[#64748B] hover:bg-slate-50" style={font}>Cancel</button>
          <button onClick={submit} disabled={busy || pw.length < 8} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0A6070] text-white text-[12px] font-semibold disabled:opacity-50" style={font}>
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save password
          </button>
        </div>
      </div>
    </div>
  );
}

function UsersTab({ refreshKey }: { refreshKey: number }) {
  const { adminEmail } = useAdminAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState<Notice>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [resetFor, setResetFor] = useState<UserRow | null>(null);
  const [deleteFor, setDeleteFor] = useState<UserRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await callAdminFunction<{ users: UserRow[] }>('manage-admin-user', { action: 'list' });
    if (error || !data) {
      // Fall back to the plain table so the list still shows if the function is unreachable.
      const { data: rows } = await supabase.from('user_roles').select('*').order('created_at', { ascending: false });
      setUsers(((rows ?? []) as UserRow[]).map(r => ({ ...r, last_sign_in_at: null })));
      if (error) setNotice({ type: 'error', text: error });
    } else {
      setUsers(data.users);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const act = async (u: UserRow, payload: Record<string, unknown>, success: string) => {
    setBusyId(u.user_id); setNotice(null);
    const { error } = await callAdminFunction('manage-admin-user', { ...payload, userId: u.user_id });
    setBusyId(null);
    if (error) { setNotice({ type: 'error', text: error }); return false; }
    setNotice({ type: 'success', text: success });
    await load();
    return true;
  };

  const filtered = users.filter(u => `${u.email} ${u.display_name ?? ''}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-3">
      <NoticeBar msg={notice} onClose={() => setNotice(null)} />
      <SearchInput value={search} onChange={setSearch} placeholder="Search users..." />
      {loading ? <p className="text-[12px] text-[#94A3B8] text-center py-8">Loading...</p> : filtered.length === 0 ? <EmptyState icon={UsersIcon} message="No users found." /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]" style={font}>
            <thead>
              <tr className="border-b border-slate-100 text-left text-[10px] text-[#94A3B8] uppercase tracking-wider">
                <th className="py-2 px-2">Name</th>
                <th className="py-2 px-2">Email</th>
                <th className="py-2 px-2">Role</th>
                <th className="py-2 px-2">Status</th>
                <th className="py-2 px-2">Last sign-in</th>
                <th className="py-2 px-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => {
                const isMe = u.email === adminEmail;
                const busy = busyId === u.user_id;
                return (
                  <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-2.5 px-2 font-semibold text-[#1e293b]">{u.display_name || u.email?.split('@')[0]}{isMe && <span className="ml-1.5 text-[9px] font-bold text-[#0A6070] bg-[#0A6070]/10 px-1.5 py-0.5 rounded-full">You</span>}</td>
                    <td className="py-2.5 px-2 text-[#64748B]">{u.email}</td>
                    <td className="py-2.5 px-2">
                      <select
                        value={u.role}
                        disabled={busy}
                        onChange={e => act(u, { action: 'set_role', role: e.target.value }, `${u.display_name || u.email} is now ${ROLE_LABELS[e.target.value as UserRole]}.`)}
                        className="text-[11px] rounded-lg border border-slate-200 px-2 py-1 bg-white"
                      >
                        {ALL_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                      </select>
                    </td>
                    <td className="py-2.5 px-2"><StatusBadge status={u.status ?? 'active'} /></td>
                    <td className="py-2.5 px-2 text-[#64748B] whitespace-nowrap">{u.last_sign_in_at ? fmtDateTime(u.last_sign_in_at) : 'Never'}</td>
                    <td className="py-2.5 px-2">
                      <div className="flex items-center justify-end gap-1">
                        {busy && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#94A3B8]" />}
                        <button onClick={() => setResetFor(u)} disabled={busy} title="Set a new password" className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#0A6070] hover:bg-slate-100 disabled:opacity-50"><KeyRound className="w-3.5 h-3.5" /></button>
                        {!isMe && (
                          <>
                            <button
                              onClick={() => act(u, { action: 'set_status', status: u.status === 'active' ? 'suspended' : 'active' }, u.status === 'active' ? `${u.email} was suspended and can no longer sign in.` : `${u.email} can sign in again.`)}
                              disabled={busy}
                              title={u.status === 'active' ? 'Suspend (block sign-in)' : 'Reactivate'}
                              className="p-1.5 rounded-lg text-[#94A3B8] hover:text-amber-600 hover:bg-amber-50 disabled:opacity-50"
                            >
                              {u.status === 'active' ? <Ban className="w-3.5 h-3.5" /> : <RotateCcw className="w-3.5 h-3.5" />}
                            </button>
                            <button onClick={() => setDeleteFor(u)} disabled={busy} title="Delete user" className="p-1.5 rounded-lg text-[#94A3B8] hover:text-red-500 hover:bg-red-50 disabled:opacity-50"><Trash2 className="w-3.5 h-3.5" /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {resetFor && <ResetPasswordDialog user={resetFor} onClose={() => setResetFor(null)} onDone={m => { setResetFor(null); setNotice(m); }} />}
      {deleteFor && (
        <ConfirmDialog
          message={`Delete ${deleteFor.display_name || deleteFor.email}? They will lose access immediately. This cannot be undone.`}
          onCancel={() => setDeleteFor(null)}
          onConfirm={async () => { const u = deleteFor; setDeleteFor(null); await act(u, { action: 'delete' }, `${u.email} was deleted.`); }}
        />
      )}
    </div>
  );
}

function AddUserTab({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('super_admin');
  const [sendEmail, setSendEmail] = useState(true);
  const [msg, setMsg] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true); setMsg(null);
    const { data, error } = await callAdminFunction<{ emailSent: boolean }>('manage-admin-user', {
      action: 'create', email, password, displayName: name, role, sendEmail,
    });
    setBusy(false);
    if (error || !data) { setMsg({ type: 'error', text: error ?? 'Could not create the user.' }); return; }
    setMsg({
      type: 'success',
      text: sendEmail
        ? data.emailSent
          ? `${email} can now sign in. We also emailed them their sign-in details.`
          : `${email} can now sign in, but the welcome email could not be sent. Please share the password with them yourself.`
        : `${email} can now sign in. Share the password with them privately.`,
    });
    setName(''); setEmail(''); setPassword(''); setRole('super_admin');
    onCreated();
  };

  return (
    <div className="max-w-md space-y-3">
      <NoticeBar msg={msg} onClose={() => setMsg(null)} />
      <div><Lbl t="Full name" /><input value={name} onChange={e => setName(e.target.value)} className={inp} placeholder="Jane Doe" autoComplete="off" /></div>
      <div><Lbl t="Email" /><input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inp} placeholder="jane@example.com" autoComplete="off" /></div>
      <div><Lbl t="Password" /><PasswordField value={password} onChange={setPassword} /></div>
      <div>
        <Lbl t="Role" />
        <select value={role} onChange={e => setRole(e.target.value as UserRole)} className={inp}>{ALL_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select>
        <p className="text-[10px] text-[#94A3B8] mt-1" style={font}>{role === 'super_admin' ? 'Super Admins can see and do everything, including managing users.' : 'This role only sees the pages you tick for it under Roles & Permissions.'}</p>
      </div>
      <label className="flex items-start gap-2 text-[12px] text-[#334155] cursor-pointer" style={font}>
        <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} className="mt-0.5 accent-[#0A6070]" />
        <span>Email them their sign-in details<span className="block text-[10px] text-[#94A3B8]">Includes the temporary password. They can change it from the key icon in the left menu.</span></span>
      </label>
      <button onClick={submit} disabled={busy || !email || !name || password.length < 8} className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#0A6070] text-white text-[12px] font-semibold disabled:opacity-50" style={font}>
        {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} {busy ? 'Creating...' : 'Create User'}
      </button>
    </div>
  );
}

function RolesTab() {
  const [perms, setPerms] = useState<PermMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('role_permissions').select('*').then(({ data }) => {
      const map: PermMap = {};
      (data ?? []).forEach(p => {
        if (!map[p.role]) map[p.role] = {};
        map[p.role][p.page] = { can_view: p.can_view, can_create: p.can_create, can_edit: p.can_edit, can_delete: p.can_delete };
      });
      setPerms(map);
      setLoading(false);
    });
  }, []);

  // Granting "view" for a page grants full use of it; the dashboard only distinguishes visible from hidden.
  const toggle = async (role: string, page: string) => {
    const on = !(perms[role]?.[page]?.can_view ?? false);
    const row = { can_view: on, can_create: on, can_edit: on, can_delete: on };
    setPerms(p => ({ ...p, [role]: { ...(p[role] ?? {}), [page]: row } }));
    const { error } = await supabase.from('role_permissions').upsert({ role, page, ...row }, { onConflict: 'role,page' });
    if (error) setPerms(p => ({ ...p, [role]: { ...(p[role] ?? {}), [page]: { ...row, can_view: !on, can_create: !on, can_edit: !on, can_delete: !on } } }));
  };

  if (loading) return <p className="text-[12px] text-[#94A3B8] text-center py-8">Loading...</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px]" style={font}>
        <thead>
          <tr className="border-b border-slate-100 text-left text-[9px] text-[#94A3B8] uppercase tracking-wider">
            <th className="py-2 px-2 sticky left-0 bg-white">Role</th>
            {ALL_PAGES.map(pg => <th key={pg} className="py-2 px-1 text-center">{pg === 'homecare' ? 'home care' : pg}</th>)}
          </tr>
        </thead>
        <tbody>
          {ALL_ROLES.filter(r => r !== 'super_admin').map(role => (
            <tr key={role} className="border-b border-slate-50">
              <td className="py-2 px-2 font-bold text-[#1e293b] sticky left-0 bg-white whitespace-nowrap">{ROLE_LABELS[role]}</td>
              {ALL_PAGES.map(page => (
                <td key={page} className="py-1.5 px-1 text-center">
                  <button
                    onClick={() => toggle(role, page)}
                    aria-label={`${ROLE_LABELS[role]} ${page}`}
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
      <p className="text-[10px] text-[#94A3B8] mt-2" style={font}>Super Admin always has full access to every page. Tick a cell to let that role use the page. Changes apply the next time the person signs in.</p>
    </div>
  );
}

function ActivityLogTab({ refreshKey }: { refreshKey: number }) {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('user_activity_log').select('*').order('created_at', { ascending: false }).limit(50).then(({ data }) => {
      setLogs((data ?? []) as LogRow[]);
      setLoading(false);
    });
  }, [refreshKey]);

  const detail = (l: LogRow) => {
    const d = l.details;
    if (!d) return '';
    if (l.action === 'change_role') return ` (${d.email}: ${d.from} → ${d.to})`;
    return d.email ? ` (${d.email})` : '';
  };

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
                <p className="text-[12px] font-semibold text-[#1e293b] truncate" style={font}>
                  <span className="capitalize">{l.action.replace(/_/g, ' ')}</span> · {l.entity_type}{detail(l)}
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
  const [refreshKey, setRefreshKey] = useState(0);

  if (adminRole !== 'super_admin') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-3">
          <Lock className="w-5 h-5 text-red-500" />
        </div>
        <p className="text-[14px] font-bold text-[#1e293b]" style={font}>Super Admin Only</p>
        <p className="text-[11px] text-[#94A3B8] mt-1" style={font}>User management is restricted to Super Admin accounts.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-lg font-bold text-[#0f172a]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Users</h1>
        <p className="text-[11px] text-[#64748B] mt-0.5" style={font}>Create accounts, manage roles, and view activity logs.</p>
      </div>
      <TabBar tabs={tabs} active={active} onChange={setActive} />
      <div className="bg-white/60 rounded-2xl border border-slate-100 shadow-sm p-4">
        {active === 'users' && <UsersTab refreshKey={refreshKey} />}
        {active === 'add' && <AddUserTab onCreated={() => setRefreshKey(k => k + 1)} />}
        {active === 'roles' && <RolesTab />}
        {active === 'activity' && <ActivityLogTab refreshKey={refreshKey} />}
      </div>
    </div>
  );
}
