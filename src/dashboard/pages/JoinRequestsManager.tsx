import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import Drawer from '../components/Drawer';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  Search, Trash2, Mail, Phone, Heart, Stethoscope, Lightbulb,
  HandHeart, Users, Building2, UserPlus,
} from 'lucide-react';

interface JoinRequest {
  id: string;
  role: string;
  full_name: string;
  email: string;
  phone: string;
  organization: string | null;
  expertise: string | null;
  motivation: string | null;
  how_heard: string | null;
  status: string;
  created_at: string;
}

const STATUSES = ['pending', 'contacted', 'approved', 'declined'];
const STATUS_CLR: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  contacted: 'bg-blue-100 text-blue-700',
  approved: 'bg-emerald-100 text-emerald-700',
  declined: 'bg-slate-100 text-slate-500',
};

const ROLE_META: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; accent: string }> = {
  'Parent / Family':            { icon: Heart,       color: 'bg-rose-50 text-rose-600',    accent: '#E8644A' },
  'Healthcare Professional':    { icon: Stethoscope, color: 'bg-teal-50 text-teal-600',    accent: '#0A6070' },
  'Advisor / Expert':           { icon: Lightbulb,   color: 'bg-amber-50 text-amber-600',  accent: '#C68A1D' },
  'Volunteer':                  { icon: HandHeart,   color: 'bg-emerald-50 text-emerald-600', accent: '#2D8A5F' },
  'Other Supporter':            { icon: Users,       color: 'bg-sky-50 text-sky-600',      accent: '#2572A8' },
};

const font = { fontFamily: 'Plus Jakarta Sans, sans-serif' };
const serif = { fontFamily: 'Cormorant Garamond, serif' };

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function RoleBadge({ role }: { role: string }) {
  const meta = ROLE_META[role] ?? { icon: Users, color: 'bg-slate-50 text-slate-600', accent: '#64748B' };
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${meta.color}`} style={font}>
      <Icon className="w-3 h-3" />{role}
    </span>
  );
}

export default function JoinRequestsManager() {
  const [items, setItems] = useState<JoinRequest[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [selected, setSelected] = useState<JoinRequest | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from('join_requests')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    setItems(data ?? []);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('join_requests').update({ status }).eq('id', id);
    load();
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : null);
  };

  const doDelete = async () => {
    if (!deleteId) return;
    await supabase.from('join_requests').update({ deleted_at: new Date().toISOString() }).eq('id', deleteId);
    setDeleteId(null);
    setSelected(null);
    load();
  };

  const filtered = items.filter(v => {
    const q = search.toLowerCase();
    const matchSearch =
      v.full_name.toLowerCase().includes(q) ||
      v.email.toLowerCase().includes(q) ||
      (v.organization ?? '').toLowerCase().includes(q);
    const matchStatus = filterStatus === 'all' || v.status === filterStatus;
    const matchRole = filterRole === 'all' || v.role === filterRole;
    return matchSearch && matchStatus && matchRole;
  });

  const pendingCount = items.filter(v => v.status === 'pending').length;
  const approvedCount = items.filter(v => v.status === 'approved').length;
  const roles = [...new Set(items.map(v => v.role))];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold text-[#0f172a]" style={serif}>Community Signups</h1>
          <p className="text-[11px] text-[#64748B] mt-0.5 flex items-center gap-2 flex-wrap" style={font}>
            {items.length} total
            {pendingCount > 0 && <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">{pendingCount} pending</span>}
            {approvedCount > 0 && <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">{approvedCount} approved</span>}
            <span>-- click a row to view</span>
          </p>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-50 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email, organization..." className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-[12px] focus:outline-none focus:border-[#0A6070] bg-white" style={font} />
          </div>
          <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-[12px] focus:outline-none focus:border-[#0A6070] bg-white" style={font}>
            <option value="all">All Roles</option>
            {roles.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-[12px] focus:outline-none focus:border-[#0A6070] bg-white" style={font}>
            <option value="all">All Status</option>
            {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-50 bg-slate-50/60">
                {['Name', 'Role', 'Email', 'Phone', 'Date', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest" style={font}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(v => (
                <tr key={v.id} className="hover:bg-slate-50/60 transition-colors cursor-pointer group" onClick={() => setSelected(v)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                        style={{ background: ROLE_META[v.role]?.accent ?? '#64748B' }}
                      >
                        {v.full_name.charAt(0)}
                      </div>
                      <p className="text-[12px] font-semibold text-[#1e293b]" style={font}>{v.full_name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3"><RoleBadge role={v.role} /></td>
                  <td className="px-4 py-3 text-[11px] text-[#64748B] max-w-[160px] truncate" style={font}>{v.email}</td>
                  <td className="px-4 py-3 text-[11px] text-[#64748B] whitespace-nowrap" style={font}>{v.phone}</td>
                  <td className="px-4 py-3 text-[11px] text-[#64748B] whitespace-nowrap" style={font}>{fmtDate(v.created_at)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${STATUS_CLR[v.status] ?? 'bg-slate-100 text-slate-500'}`} style={font}>
                      {v.status.charAt(0).toUpperCase() + v.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setDeleteId(v.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-[#94A3B8] hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-[12px] text-[#94A3B8]" style={font}>No community signups found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail drawer */}
      {selected && (
        <Drawer
          title={selected.full_name}
          subtitle={`Joined ${fmtDate(selected.created_at)}`}
          onClose={() => setSelected(null)}
          width="md"
          footer={
            <div className="flex items-center justify-between">
              <button onClick={() => setDeleteId(selected.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-100 text-[12px] font-bold text-red-500 hover:bg-red-50 transition-colors" style={font}>
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
              <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${STATUS_CLR[selected.status] ?? 'bg-slate-100 text-slate-500'}`} style={font}>
                {selected.status.charAt(0).toUpperCase() + selected.status.slice(1)}
              </span>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Avatar + contact */}
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
                style={{ background: `linear-gradient(135deg, ${ROLE_META[selected.role]?.accent ?? '#64748B'}, ${ROLE_META[selected.role]?.accent ?? '#64748B'}cc)` }}
              >
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[15px] font-bold text-[#0f172a]" style={font}>{selected.full_name}</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  <a href={`mailto:${selected.email}`} className="flex items-center gap-1 text-[11px] text-[#0A6070] hover:underline" style={font}><Mail className="w-3 h-3" />{selected.email}</a>
                  <a href={`tel:${selected.phone}`} className="flex items-center gap-1 text-[11px] text-[#0A6070] hover:underline" style={font}><Phone className="w-3 h-3" />{selected.phone}</a>
                </div>
              </div>
            </div>

            {/* Role badge */}
            <div>
              <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1.5" style={font}>Role</p>
              <RoleBadge role={selected.role} />
            </div>

            {/* Org + Expertise */}
            {(selected.organization || selected.expertise) && (
              <div className="grid grid-cols-2 gap-3">
                {selected.organization && (
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1 flex items-center gap-1" style={font}><Building2 className="w-3 h-3" />Organization</p>
                    <p className="text-[12px] text-[#334155]" style={font}>{selected.organization}</p>
                  </div>
                )}
                {selected.expertise && (
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1" style={font}>Expertise</p>
                    <p className="text-[12px] text-[#334155]" style={font}>{selected.expertise}</p>
                  </div>
                )}
              </div>
            )}

            {/* Motivation */}
            {selected.motivation && (
              <div>
                <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1.5" style={font}>Message</p>
                <p className="text-[13px] text-[#334155] leading-relaxed whitespace-pre-wrap bg-slate-50 rounded-xl p-3" style={font}>{selected.motivation}</p>
              </div>
            )}

            {/* How heard */}
            {selected.how_heard && (
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1" style={font}>How They Heard About Us</p>
                <p className="text-[12px] text-[#334155]" style={font}>{selected.how_heard}</p>
              </div>
            )}

            {/* Status buttons */}
            <div>
              <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2" style={font}>Update Status</p>
              <div className="flex gap-2 flex-wrap">
                {STATUSES.map(s => (
                  <button
                    key={s}
                    onClick={() => updateStatus(selected.id, s)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                      selected.status === s ? 'bg-[#0A6070] text-white' : 'border border-slate-200 text-[#64748B] hover:bg-slate-50'
                    }`}
                    style={font}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Drawer>
      )}

      {deleteId && (
        <ConfirmDialog
          message="Move this signup to Trash? You can restore it later."
          onConfirm={doDelete}
          onCancel={() => setDeleteId(null)}
          confirmLabel="Move to Trash"
        />
      )}
    </div>
  );
}
