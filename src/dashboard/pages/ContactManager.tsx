import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import Drawer from '../components/Drawer';
import ConfirmDialog from '../components/ConfirmDialog';
import { Search, Trash2, Eye, Mail, Phone, Clock, Heart, Stethoscope, HandHeart, Users } from 'lucide-react';

// ── Shared ────────────────────────────────────────────────────────────────────
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

type ActiveTab = 'messages' | 'support';

// ── Contact Messages Tab ───────────────────────────────────────────────────────
interface Contact { id: string; name: string; email: string; phone: string; subject: string; message: string; status: string; created_at: string; }
const CONTACT_STATUSES = ['unread', 'read', 'replied'];
const statusClr = (s: string) => s === 'unread' ? 'bg-red-100 text-red-700' : s === 'replied' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700';

function MessagesTab() {
  const [items, setItems] = useState<Contact[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Contact | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const load = async () => { const { data } = await supabase.from('contact_submissions').select('*').is('deleted_at', null).order('created_at', { ascending: false }); setItems(data ?? []); };
  useEffect(() => { load(); }, []);

  const openView = async (c: Contact) => {
    setSelected(c);
    if (c.status === 'unread') {
      await supabase.from('contact_submissions').update({ status: 'read' }).eq('id', c.id);
      load();
      setSelected({ ...c, status: 'read' });
    }
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('contact_submissions').update({ status }).eq('id', id);
    load();
    setSelected(prev => prev?.id === id ? { ...prev, status } : prev);
  };

  const doDelete = async () => { if (!deleteId) return; await supabase.from('contact_submissions').update({ deleted_at: new Date().toISOString() }).eq('id', deleteId); setDeleteId(null); setSelected(null); load(); };

  const filtered = items.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.subject.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase());
    return matchSearch && (filterStatus === 'all' || c.status === filterStatus);
  });

  const unreadCount = items.filter(c => c.status === 'unread').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-[11px] text-[#64748B]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          {items.length} total{unreadCount > 0 && <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[9px] font-bold">{unreadCount} unread</span>}
        </p>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-50 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search messages…" className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-[12px] focus:outline-none focus:border-[#0A6070] bg-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-[12px] focus:outline-none focus:border-[#0A6070] bg-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            <option value="all">All Status</option>
            {CONTACT_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-slate-50 bg-slate-50/60">
              {['Name', 'Subject', 'Date', 'Status', 'Actions'].map(h => <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(c => (
                <tr key={c.id} className={`hover:bg-slate-50/60 transition-colors cursor-pointer group ${c.status === 'unread' ? 'bg-red-50/20' : ''}`} onClick={() => openView(c)}>
                  <td className="px-4 py-3">
                    <p className={`text-[12px] text-[#1e293b] ${c.status === 'unread' ? 'font-bold' : 'font-medium'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{c.name}</p>
                    <p className="text-[10px] text-[#94A3B8] mt-0.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{c.email}</p>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-[#1e293b] max-w-[200px] truncate" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{c.subject}</td>
                  <td className="px-4 py-3 text-[10px] text-[#64748B] whitespace-nowrap" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{fmtDate(c.created_at)}</td>
                  <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${statusClr(c.status)}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{c.status.charAt(0).toUpperCase() + c.status.slice(1)}</span></td>
                  <td className="px-4 py-3"><div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <button onClick={() => openView(c)} className="p-1.5 rounded-lg hover:bg-slate-100 text-[#94A3B8] hover:text-[#0A6070]"><Eye className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setDeleteId(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-[#94A3B8] hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-[12px] text-[#94A3B8]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>No messages found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <Drawer title={selected.subject || 'Message'} subtitle={`From ${selected.name} · ${fmtDate(selected.created_at)}`} onClose={() => setSelected(null)} width="md"
          footer={<div className="flex items-center justify-between">
            <button onClick={() => setDeleteId(selected.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-100 text-[12px] font-bold text-red-500 hover:bg-red-50 transition-colors" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}><Trash2 className="w-3.5 h-3.5" /> Delete</button>
            <div className="flex gap-2">
              {selected.status !== 'replied' && <button onClick={() => updateStatus(selected.id, 'replied')} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#0A6070] to-[#1AADA0] text-white text-[12px] font-bold shadow-sm hover:shadow-md transition-all" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}><Mail className="w-3.5 h-3.5" /> Mark Replied</button>}
              {selected.status === 'replied' && <span className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-[12px] font-bold" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Replied</span>}
            </div>
          </div>}
        >
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-r from-slate-50 to-slate-50/50 rounded-xl border border-slate-100">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[13px] font-bold text-[#0f172a]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.name}</p>
                  <a href={`mailto:${selected.email}`} className="flex items-center gap-1 text-[11px] text-[#0A6070] hover:underline mt-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}><Mail className="w-3 h-3" />{selected.email}</a>
                  {selected.phone && <a href={`tel:${selected.phone}`} className="flex items-center gap-1 text-[11px] text-[#0A6070] hover:underline mt-0.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}><Phone className="w-3 h-3" />{selected.phone}</a>}
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${statusClr(selected.status)}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.status}</span>
                  <div className="flex items-center gap-1 text-[10px] text-[#94A3B8]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}><Clock className="w-2.5 h-2.5" />{fmtDate(selected.created_at)}</div>
                </div>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Subject</p>
              <p className="text-[13px] font-semibold text-[#1e293b]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.subject}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Message</p>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[13px] text-[#334155] leading-relaxed whitespace-pre-wrap" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.message}</p>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Update Status</p>
              <div className="flex gap-2">
                {CONTACT_STATUSES.map(s => (
                  <button key={s} onClick={() => updateStatus(selected.id, s)} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${selected.status === s ? statusClr(s) + ' border-transparent' : 'border-slate-200 text-[#64748B] hover:bg-slate-50'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{s.charAt(0).toUpperCase() + s.slice(1)}</button>
                ))}
              </div>
            </div>
          </div>
        </Drawer>
      )}

      {deleteId && <ConfirmDialog message="Move this message to Trash? You can restore it later." onConfirm={doDelete} onCancel={() => setDeleteId(null)} confirmLabel="Move to Trash" />}
    </div>
  );
}

// ── Support Requests Tab ───────────────────────────────────────────────────────
interface SupportRequest { id: string; role: string; support_type: string; name: string; phone: string; email: string | null; note: string | null; status: string; created_at: string; }

const SUPPORT_STATUSES = ['unread', 'read', 'actioned'];
const supportStatusClr = (s: string) => s === 'unread' ? 'bg-amber-100 text-amber-700' : s === 'actioned' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700';

const ROLE_META: Record<string, { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; color: string; accent: string }> = {
  parent:     { icon: Heart,       color: 'bg-rose-50',    accent: '#E8644A' },
  healthcare: { icon: Stethoscope, color: 'bg-teal-50',    accent: '#0A6070' },
  donor:      { icon: HandHeart,   color: 'bg-amber-50',   accent: '#E8A020' },
  supporter:  { icon: Users,       color: 'bg-emerald-50', accent: '#2D8A5F' },
};

const ROLE_LABEL: Record<string, string> = {
  parent: 'Parent / Family',
  healthcare: 'Healthcare Professional',
  donor: 'Donor',
  supporter: 'Supporter / Volunteer',
};

function SupportRequestsTab() {
  const [items, setItems] = useState<SupportRequest[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selected, setSelected] = useState<SupportRequest | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from('support_requests').select('*').is('deleted_at', null).order('created_at', { ascending: false });
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const openView = async (r: SupportRequest) => {
    setSelected(r);
    if (r.status === 'unread') {
      await supabase.from('support_requests').update({ status: 'read' }).eq('id', r.id);
      load();
      setSelected({ ...r, status: 'read' });
    }
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('support_requests').update({ status }).eq('id', id);
    load();
    setSelected(prev => prev?.id === id ? { ...prev, status } : prev);
  };

  const doDelete = async () => {
    if (!deleteId) return;
    await supabase.from('support_requests').update({ deleted_at: new Date().toISOString() }).eq('id', deleteId);
    setDeleteId(null); setSelected(null); load();
  };

  const unreadCount = items.filter(i => i.status === 'unread').length;

  const filtered = items.filter(i => {
    const matchSearch =
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.role.toLowerCase().includes(search.toLowerCase()) ||
      i.support_type.toLowerCase().includes(search.toLowerCase()) ||
      (i.email ?? '').toLowerCase().includes(search.toLowerCase());
    return matchSearch && (filterStatus === 'all' || i.status === filterStatus);
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-[11px] text-[#64748B]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          {items.length} total{unreadCount > 0 && <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px] font-bold">{unreadCount} new</span>}
        </p>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-50 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search support requests…" className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-[12px] focus:outline-none focus:border-[#0A6070] bg-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-[12px] focus:outline-none focus:border-[#0A6070] bg-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            <option value="all">All Status</option>
            {SUPPORT_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-slate-50 bg-slate-50/60">
              {['Name', 'Role', 'Support Needed', 'Phone', 'Status', 'Date', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(r => {
                const meta = ROLE_META[r.role];
                return (
                  <tr key={r.id} className={`hover:bg-slate-50/60 transition-colors cursor-pointer group ${r.status === 'unread' ? 'bg-amber-50/20' : ''}`} onClick={() => openView(r)}>
                    <td className="px-4 py-3">
                      <p className={`text-[12px] text-[#1e293b] ${r.status === 'unread' ? 'font-bold' : 'font-medium'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{r.name}</p>
                    </td>
                    <td className="px-4 py-3">
                      {meta && (
                        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full ${meta.color}`}>
                          <meta.icon className="w-3 h-3" style={{ color: meta.accent }} />
                          <span className="text-[10px] font-bold" style={{ color: meta.accent, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{ROLE_LABEL[r.role] ?? r.role}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-[#334155] max-w-[160px] truncate" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{r.support_type}</td>
                    <td className="px-4 py-3 text-[11px] text-[#64748B]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{r.phone}</td>
                    <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${supportStatusClr(r.status)}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{r.status.charAt(0).toUpperCase() + r.status.slice(1)}</span></td>
                    <td className="px-4 py-3 text-[10px] text-[#64748B] whitespace-nowrap" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{fmtDate(r.created_at)}</td>
                    <td className="px-4 py-3"><div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      <button onClick={() => openView(r)} className="p-1.5 rounded-lg hover:bg-slate-100 text-[#94A3B8] hover:text-[#0A6070]"><Eye className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeleteId(r.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-[#94A3B8] hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div></td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-[12px] text-[#94A3B8]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>No support requests found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (() => {
        const meta = ROLE_META[selected.role];
        return (
          <Drawer
            title={selected.name}
            subtitle={`${ROLE_LABEL[selected.role] ?? selected.role} · ${fmtDate(selected.created_at)}`}
            onClose={() => setSelected(null)}
            width="md"
            footer={
              <div className="flex items-center justify-between">
                <button onClick={() => setDeleteId(selected.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-100 text-[12px] font-bold text-red-500 hover:bg-red-50 transition-colors" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                <div className="flex gap-2">
                  {SUPPORT_STATUSES.filter(s => s !== selected.status).map(s => (
                    <button key={s} onClick={() => updateStatus(selected.id, s)} className={`px-3 py-2 rounded-xl text-[12px] font-bold border-transparent transition-colors ${supportStatusClr(s)}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                      Mark {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            }
          >
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {meta && (
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ${meta.color}`}>
                    <meta.icon className="w-3.5 h-3.5" style={{ color: meta.accent }} />
                    <span className="text-[11px] font-bold" style={{ color: meta.accent, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{ROLE_LABEL[selected.role] ?? selected.role}</span>
                  </div>
                )}
                <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-slate-100">
                  <span className="text-[11px] font-bold text-[#334155]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.support_type}</span>
                </div>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold ${supportStatusClr(selected.status)}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.status}</span>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0A6070] to-[#1AADA0] flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
                    {selected.name.charAt(0).toUpperCase()}
                  </div>
                  <p className="text-[13px] font-bold text-[#0f172a]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.name}</p>
                </div>
                <a href={`tel:${selected.phone}`} className="flex items-center gap-1.5 text-[11px] text-[#0A6070] hover:underline" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}><Phone className="w-3 h-3" />{selected.phone}</a>
                {selected.email && <a href={`mailto:${selected.email}`} className="flex items-center gap-1.5 text-[11px] text-[#0A6070] hover:underline" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}><Mail className="w-3 h-3" />{selected.email}</a>}
                <div className="flex items-center gap-1 text-[10px] text-[#94A3B8]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}><Clock className="w-2.5 h-2.5" />{fmtDate(selected.created_at)}</div>
              </div>

              {selected.note && (
                <div>
                  <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Note</p>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[13px] text-[#334155] leading-relaxed whitespace-pre-wrap" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.note}</p>
                  </div>
                </div>
              )}

              <div>
                <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Update Status</p>
                <div className="flex gap-2">
                  {SUPPORT_STATUSES.map(s => (
                    <button key={s} onClick={() => updateStatus(selected.id, s)} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${selected.status === s ? supportStatusClr(s) + ' border-transparent' : 'border-slate-200 text-[#64748B] hover:bg-slate-50'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{s.charAt(0).toUpperCase() + s.slice(1)}</button>
                  ))}
                </div>
              </div>
            </div>
          </Drawer>
        );
      })()}

      {deleteId && <ConfirmDialog message="Move this support request to Trash?" onConfirm={doDelete} onCancel={() => setDeleteId(null)} confirmLabel="Move to Trash" />}
    </div>
  );
}

// ── Root ───────────────────────────────────────────────────────────────────────
export default function ContactManager() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('messages');

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-[#0f172a]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Messages</h1>
        <p className="text-[11px] text-[#64748B] mt-0.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Contact form messages and support requests from the homepage</p>
      </div>

      <div className="flex items-center gap-1 mb-6 bg-white/60 backdrop-blur-sm rounded-2xl border border-slate-100 shadow-sm p-1.5">
        {([
          { id: 'messages' as const, label: 'Contact Messages' },
          { id: 'support' as const, label: 'Support Requests' },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-2 rounded-xl text-[12px] font-bold transition-all ${activeTab === tab.id ? 'bg-white shadow-sm text-[#0A6070]' : 'text-[#64748B] hover:text-[#1e293b]'}`}
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'messages' && <MessagesTab />}
      {activeTab === 'support' && <SupportRequestsTab />}
    </div>
  );
}
