import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import Drawer from '../components/Drawer';
import ConfirmDialog from '../components/ConfirmDialog';
import { Plus, Pencil, Trash2, Search, Mail, ExternalLink, Users, ClipboardList, MapPin, Phone, ChevronDown } from 'lucide-react';
import { ImageUploadField } from '../components/UploadField';

// ── Team member types ─────────────────────────────────────────────────────────
interface Member { id: string; name: string; role: string; bio: string; image_url: string; email: string; sort_order: number; active: boolean; }
type Form = Omit<Member, 'id'>;
type Mode = 'view' | 'add' | 'edit';

const EMPTY: Form = { name: '', role: '', bio: '', image_url: '', email: '', sort_order: 0, active: true };
const inp = 'w-full px-3 py-2.5 border border-slate-200 rounded-xl text-[13px] text-[#0f172a] focus:outline-none focus:border-[#0A6070] focus:ring-2 focus:ring-[#0A6070]/10 transition-all bg-white';
const Lbl = ({ t }: { t: string }) => <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-1.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{t}</label>;

// ── Application types ─────────────────────────────────────────────────────────
interface Application {
  id: string;
  title: string;
  full_name: string;
  country: string;
  phone: string;
  email: string;
  profile_picture_url: string;
  bio: string;
  status: 'pending' | 'reviewed' | 'accepted' | 'declined';
  created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  reviewed: 'Reviewed',
  accepted: 'Accepted',
  declined: 'Declined',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  reviewed: 'bg-blue-100 text-blue-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  declined: 'bg-rose-100 text-rose-700',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Applications panel ────────────────────────────────────────────────────────
function ApplicationsTab() {
  const [items, setItems] = useState<Application[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selected, setSelected] = useState<Application | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('team_applications')
      .select('*')
      .order('created_at', { ascending: false });
    setItems(data ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter(a => {
    const q = search.toLowerCase();
    const matchesSearch = !q || a.full_name.toLowerCase().includes(q) || a.country.toLowerCase().includes(q) || a.email.toLowerCase().includes(q);
    const matchesStatus = filterStatus === 'all' || a.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  async function updateStatus(id: string, status: string) {
    setUpdatingStatus(true);
    await supabase.from('team_applications').update({ status }).eq('id', id);
    setUpdatingStatus(false);
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status: status as Application['status'] } : null);
    load();
  }

  async function doDelete() {
    if (!deleteId) return;
    await supabase.from('team_applications').delete().eq('id', deleteId);
    setDeleteId(null);
    if (selected?.id === deleteId) setSelected(null);
    load();
  }

  return (
    <div>
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Filters */}
        <div className="px-4 py-3 border-b border-slate-50 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, country, email…"
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-[12px] focus:outline-none focus:border-[#0A6070] bg-white"
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            />
          </div>
          <div className="relative">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="pl-3 pr-8 py-2 border border-slate-200 rounded-xl text-[12px] focus:outline-none focus:border-[#0A6070] bg-white appearance-none"
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="reviewed">Reviewed</option>
              <option value="accepted">Accepted</option>
              <option value="declined">Declined</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#94A3B8] pointer-events-none" />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-50 bg-slate-50/60">
                {['Applicant', 'Country', 'Contact', 'Status', 'Submitted', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest whitespace-nowrap" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(a => (
                <tr
                  key={a.id}
                  className="hover:bg-slate-50/60 transition-colors cursor-pointer group"
                  onClick={() => setSelected(a)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {a.profile_picture_url ? (
                        <img src={a.profile_picture_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0 ring-1 ring-slate-100" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
                          {a.full_name.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-[12px] font-semibold text-[#1e293b] truncate" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                          {a.title} {a.full_name}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-[#64748B] whitespace-nowrap" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{a.country || '—'}</td>
                  <td className="px-4 py-3">
                    <p className="text-[11px] text-[#64748B] max-w-[160px] truncate" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{a.email}</p>
                    {a.phone && <p className="text-[10px] text-[#94A3B8] mt-0.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{a.phone}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${STATUS_COLORS[a.status] ?? 'bg-slate-100 text-slate-500'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                      {STATUS_LABELS[a.status] ?? a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-[#94A3B8] whitespace-nowrap" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{formatDate(a.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setDeleteId(a.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-[#94A3B8] hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-[12px] text-[#94A3B8]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    {search || filterStatus !== 'all' ? 'No applications match your filter.' : 'No applications yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Application detail drawer */}
      {selected && (
        <Drawer
          title={`${selected.title} ${selected.full_name}`}
          subtitle={`Application · ${formatDate(selected.created_at)}`}
          onClose={() => setSelected(null)}
          width="md"
          footer={
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => setDeleteId(selected.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-100 text-[12px] font-bold text-red-500 hover:bg-red-50 transition-colors"
                style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#64748B]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Status:</span>
                <div className="relative">
                  <select
                    value={selected.status}
                    onChange={e => updateStatus(selected.id, e.target.value)}
                    disabled={updatingStatus}
                    className={`pl-3 pr-8 py-1.5 border border-slate-200 rounded-xl text-[12px] font-bold focus:outline-none focus:border-[#0A6070] bg-white appearance-none cursor-pointer ${STATUS_COLORS[selected.status]}`}
                    style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                  >
                    <option value="pending">Pending</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="accepted">Accepted</option>
                    <option value="declined">Declined</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" />
                </div>
              </div>
            </div>
          }
        >
          <div className="space-y-5">
            {/* Photo + name */}
            <div className="flex items-start gap-4">
              {selected.profile_picture_url ? (
                <img src={selected.profile_picture_url} alt="" className="w-20 h-20 rounded-2xl object-cover flex-shrink-0 ring-2 ring-slate-100" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white text-3xl font-bold flex-shrink-0">
                  {selected.full_name.charAt(0)}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[16px] font-bold text-[#0f172a]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  {selected.title} {selected.full_name}
                </p>
                <span className={`mt-1 inline-block text-[10px] px-2.5 py-0.5 rounded-full font-bold ${STATUS_COLORS[selected.status]}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  {STATUS_LABELS[selected.status]}
                </span>
                {selected.profile_picture_url && (
                  <a href={selected.profile_picture_url} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-1 text-[11px] text-[#0A6070] hover:underline" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    <ExternalLink className="w-3 h-3" /> View full photo
                  </a>
                )}
              </div>
            </div>

            {/* Details */}
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-[#94A3B8] flex-shrink-0" />
                <p className="text-[13px] text-[#334155]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.country || '—'}</p>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#94A3B8] flex-shrink-0" />
                <p className="text-[13px] text-[#334155]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.phone || '—'}</p>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#94A3B8] flex-shrink-0" />
                <a href={`mailto:${selected.email}`} className="text-[13px] text-[#0A6070] hover:underline truncate" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  {selected.email}
                </a>
              </div>
            </div>

            {/* Bio */}
            {selected.bio && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Short Bio</p>
                <p className="text-[13px] text-[#334155] leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.bio}</p>
              </div>
            )}

            {/* Submitted date */}
            <div className="pt-2 border-t border-slate-50">
              <p className="text-[11px] text-[#94A3B8]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Submitted {formatDate(selected.created_at)}</p>
            </div>
          </div>
        </Drawer>
      )}

      {deleteId && (
        <ConfirmDialog
          message="Delete this application permanently? This cannot be undone."
          onConfirm={doDelete}
          onCancel={() => setDeleteId(null)}
          confirmLabel="Delete"
        />
      )}
    </div>
  );
}

// ── Main TeamManager ──────────────────────────────────────────────────────────
export default function TeamManager() {
  const [tab, setTab] = useState<'team' | 'applications'>('team');
  const [pendingCount, setPendingCount] = useState(0);

  // Team state
  const [items, setItems] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<Mode | null>(null);
  const [selected, setSelected] = useState<Member | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadTeam = async () => {
    const { data } = await supabase.from('team_members').select('*').is('deleted_at', null).order('sort_order');
    setItems(data ?? []);
  };

  const loadPendingCount = async () => {
    const { count } = await supabase.from('team_applications').select('id', { count: 'exact', head: true }).eq('status', 'pending');
    setPendingCount(count ?? 0);
  };

  useEffect(() => { loadTeam(); loadPendingCount(); }, []);

  const openView = (m: Member) => { setSelected(m); setMode('view'); };
  const openAdd = () => { setForm(EMPTY); setSelected(null); setMode('add'); };
  const openEdit = (m: Member) => {
    setForm({ name: m.name, role: m.role, bio: m.bio, image_url: m.image_url, email: m.email, sort_order: m.sort_order, active: m.active });
    setSelected(m); setMode('edit');
  };
  const close = () => { setMode(null); setSelected(null); };

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    if (mode === 'edit' && selected) {
      await supabase.from('team_members').update({ ...form, updated_at: new Date().toISOString() }).eq('id', selected.id);
    } else {
      await supabase.from('team_members').insert(form);
    }
    setSaving(false); close(); loadTeam();
  };

  const toggleActive = async (m: Member, e?: React.MouseEvent) => {
    e?.stopPropagation();
    await supabase.from('team_members').update({ active: !m.active }).eq('id', m.id);
    loadTeam();
    if (selected?.id === m.id) setSelected({ ...m, active: !m.active });
  };

  const doDelete = async () => {
    if (!deleteId) return;
    await supabase.from('team_members').update({ deleted_at: new Date().toISOString() }).eq('id', deleteId);
    setDeleteId(null); close(); loadTeam();
  };

  const filtered = items.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold text-[#0f172a]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Team</h1>
          <p className="text-[11px] text-[#64748B] mt-0.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Manage your team members and review applications
          </p>
        </div>
        {tab === 'team' && (
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0A6070] text-white text-[12px] font-bold shadow-sm hover:shadow-md hover:bg-[#084F5C] transition-all"
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          >
            <Plus className="w-3.5 h-3.5" /> Add Member
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 border-b border-slate-100">
        <button
          onClick={() => setTab('team')}
          className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold border-b-2 -mb-px transition-colors ${
            tab === 'team'
              ? 'border-[#0A6070] text-[#0A6070]'
              : 'border-transparent text-[#64748B] hover:text-[#0f172a]'
          }`}
          style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
        >
          <Users className="w-4 h-4" />
          Our Team
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${tab === 'team' ? 'bg-[#0A6070]/10 text-[#0A6070]' : 'bg-slate-100 text-[#94A3B8]'}`}>
            {items.length}
          </span>
        </button>
        <button
          onClick={() => { setTab('applications'); loadPendingCount(); }}
          className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold border-b-2 -mb-px transition-colors ${
            tab === 'applications'
              ? 'border-[#0A6070] text-[#0A6070]'
              : 'border-transparent text-[#64748B] hover:text-[#0f172a]'
          }`}
          style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
        >
          <ClipboardList className="w-4 h-4" />
          Applications
          {pendingCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-700">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* Tab content */}
      {tab === 'team' && (
        <>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search team…"
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-[12px] focus:outline-none focus:border-[#0A6070] bg-white"
                  style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-50 bg-slate-50/60">
                    {['Member', 'Role', 'Email', 'Status', 'Order', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50/60 transition-colors cursor-pointer group" onClick={() => openView(m)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {m.image_url ? (
                            <img src={m.image_url} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                              {m.name.charAt(0)}
                            </div>
                          )}
                          <span className="text-[12px] font-semibold text-[#1e293b]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{m.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-[#64748B]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{m.role}</td>
                      <td className="px-4 py-3 text-[11px] text-[#64748B] max-w-[160px] truncate" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{m.email || '—'}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={e => toggleActive(m, e)}
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${m.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                          style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                        >
                          {m.active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-[#64748B]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{m.sort_order}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                          <button onClick={() => openEdit(m)} className="p-1.5 rounded-lg hover:bg-slate-100 text-[#94A3B8] hover:text-[#0A6070]"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setDeleteId(m.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-[#94A3B8] hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-[12px] text-[#94A3B8]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                        No members found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {mode === 'view' && selected && (
            <Drawer
              title={selected.name}
              subtitle={selected.role}
              onClose={close}
              width="md"
              footer={
                <div className="flex items-center justify-between">
                  <button onClick={() => setDeleteId(selected.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-100 text-[12px] font-bold text-red-500 hover:bg-red-50 transition-colors" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                  <button onClick={() => openEdit(selected)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0A6070] text-white text-[12px] font-bold shadow-sm hover:shadow-md hover:bg-[#084F5C] transition-all" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                </div>
              }
            >
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  {selected.image_url ? (
                    <img src={selected.image_url} alt="" className="w-16 h-16 rounded-2xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                      {selected.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="text-[15px] font-bold text-[#0f172a]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.name}</p>
                    <p className="text-[12px] text-[#64748B] mt-0.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.role}</p>
                    <span className={`mt-1 inline-block text-[10px] px-2 py-0.5 rounded-full font-bold ${selected.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                      {selected.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                {selected.email && (
                  <a href={`mailto:${selected.email}`} className="flex items-center gap-1.5 text-[12px] text-[#0A6070] hover:underline" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    <Mail className="w-3.5 h-3.5" />{selected.email}
                  </a>
                )}
                {selected.bio && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Bio</p>
                    <p className="text-[13px] text-[#334155] leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.bio}</p>
                  </div>
                )}
                {selected.image_url && (
                  <a href={selected.image_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-[#0A6070] hover:underline" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    <ExternalLink className="w-3 h-3" /> View photo
                  </a>
                )}
              </div>
            </Drawer>
          )}

          {(mode === 'add' || mode === 'edit') && (
            <Drawer
              title={mode === 'add' ? 'Add Team Member' : 'Edit Member'}
              subtitle={mode === 'edit' ? selected?.name : undefined}
              onClose={close}
              width="md"
              footer={
                <div className="flex gap-2 justify-end">
                  <button onClick={close} className="px-4 py-2 rounded-xl border border-slate-200 text-[12px] font-bold text-[#64748B] hover:bg-slate-50 transition-colors" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Cancel</button>
                  <button onClick={save} disabled={saving || !form.name.trim()} className="px-5 py-2 rounded-xl bg-[#0A6070] text-white text-[12px] font-bold disabled:opacity-50 shadow-sm hover:shadow-md hover:bg-[#084F5C] transition-all" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    {saving ? 'Saving…' : mode === 'add' ? 'Add Member' : 'Save Changes'}
                  </button>
                </div>
              }
            >
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><Lbl t="Name *" /><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inp} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
                  <div><Lbl t="Role" /><input value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className={inp} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
                </div>
                <div><Lbl t="Email" /><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inp} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
                <ImageUploadField label="Photo" value={form.image_url} onChange={url => setForm({ ...form, image_url: url })} folder="voice-of-preemies/team" />
                <div><Lbl t="Bio" /><textarea rows={4} value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} className={inp + ' resize-none'} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
                <div><Lbl t="Sort Order" /><input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })} className={inp} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} className="w-4 h-4 rounded accent-[#0A6070]" />
                  <span className="text-[12px] text-[#334155]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Active member</span>
                </label>
              </div>
            </Drawer>
          )}

          {deleteId && (
            <ConfirmDialog
              message="Move this team member to Trash? You can restore them later."
              onConfirm={doDelete}
              onCancel={() => setDeleteId(null)}
              confirmLabel="Move to Trash"
            />
          )}
        </>
      )}

      {tab === 'applications' && <ApplicationsTab />}
    </div>
  );
}
