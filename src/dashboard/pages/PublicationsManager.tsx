import { useEffect, useState, useCallback, createContext, useContext } from 'react';
import { supabase } from '../../lib/supabase';
import Drawer from '../components/Drawer';
import ConfirmDialog from '../components/ConfirmDialog';
import { Trash2, Search, Check, X, MessageCircle, Heart } from 'lucide-react';

type Tab = 'appreciations' | 'feedback';

// ── Toast Context ───────────────────────────────────────────────────────────
interface ToastCtx { showToast: (type: 'error' | 'success', msg: string) => void; }
const ToastContext = createContext<ToastCtx>({ showToast: () => {} });
const useToast = () => useContext(ToastContext);

// ── Types ───────────────────────────────────────────────────────────────────
interface Appreciation { id: string; author_name: string; author_role: string; message: string; status: string; created_at: string; deleted_at: string | null; }
interface Feedback { id: string; author_name: string; author_email: string | null; subject: string; message: string; status: string; created_at: string; deleted_at: string | null; }

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

// ── Status badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-600',
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold capitalize ${styles[status] ?? 'bg-slate-100 text-slate-600'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      {status}
    </span>
  );
};

// ── Appreciations Tab ─────────────────────────────────────────────────────────
function AppreciationsTab() {
  const { showToast } = useToast();
  const [items, setItems] = useState<Appreciation[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selected, setSelected] = useState<Appreciation | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from('appreciations').select('*').is('deleted_at', null).order('created_at', { ascending: false });
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const setStatus = async (id: string, status: string) => {
    const { error: err } = await supabase.from('appreciations').update({ status }).eq('id', id);
    if (err) { showToast('error', err.message); return; }
    showToast('success', 'Status updated!');
    load();
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : null);
  };

  const doDelete = async () => {
    if (!deleteId) return;
    const { error: err } = await supabase.from('appreciations').update({ deleted_at: new Date().toISOString() }).eq('id', deleteId);
    if (err) { showToast('error', err.message); setDeleteId(null); return; }
    showToast('success', 'Moved to trash.');
    setDeleteId(null);
    if (selected?.id === deleteId) setSelected(null);
    load();
  };

  const pendingCount = items.filter(i => i.status === 'pending').length;

  const filtered = items.filter(i => {
    const matchSearch = i.author_name.toLowerCase().includes(search.toLowerCase()) || i.message.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || i.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl font-bold text-[#0f172a]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            Appreciations
            {pendingCount > 0 && <span className="ml-2 text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold align-middle">{pendingCount} pending</span>}
          </h2>
          <p className="text-[11px] text-[#64748B] mt-0.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{items.length} total — click a row to review</p>
        </div>
        <div className="flex items-center gap-2">
          {(['all', 'pending', 'approved', 'rejected'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all capitalize ${statusFilter === s ? 'bg-[#0A6070] text-white shadow-sm' : 'border border-slate-200 text-[#64748B] hover:bg-slate-50'}`}
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search appreciations…" className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-[12px] focus:outline-none focus:border-[#0A6070] bg-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-slate-50 bg-slate-50/60">
              {['Author', 'Role', 'Message', 'Status', 'Date', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/60 transition-colors cursor-pointer group" onClick={() => setSelected(item)}>
                  <td className="px-4 py-3 text-[12px] font-semibold text-[#1e293b] whitespace-nowrap" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{item.author_name}</td>
                  <td className="px-4 py-3 text-[11px] text-[#64748B]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{item.author_role || '—'}</td>
                  <td className="px-4 py-3 text-[11px] text-[#64748B] max-w-[240px]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    <span className="line-clamp-2">{item.message}</span>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                  <td className="px-4 py-3 text-[11px] text-[#64748B] whitespace-nowrap" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{fmtDate(item.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      {item.status !== 'approved' && (
                        <button onClick={() => setStatus(item.id, 'approved')} className="p-1.5 rounded-lg hover:bg-emerald-50 text-[#94A3B8] hover:text-emerald-600" title="Approve"><Check className="w-3.5 h-3.5" /></button>
                      )}
                      {item.status !== 'rejected' && (
                        <button onClick={() => setStatus(item.id, 'rejected')} className="p-1.5 rounded-lg hover:bg-red-50 text-[#94A3B8] hover:text-red-500" title="Reject"><X className="w-3.5 h-3.5" /></button>
                      )}
                      <button onClick={() => setDeleteId(item.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-[#94A3B8] hover:text-red-500" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-[12px] text-[#94A3B8]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>No appreciations found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <Drawer title={selected.author_name} subtitle={selected.author_role || 'No role specified'} onClose={() => setSelected(null)} width="md"
          footer={
            <div className="flex items-center justify-between">
              <button onClick={() => setDeleteId(selected.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-100 text-[12px] font-bold text-red-500 hover:bg-red-50 transition-colors" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}><Trash2 className="w-3.5 h-3.5" /> Delete</button>
              <div className="flex gap-2">
                {selected.status !== 'rejected' && (
                  <button onClick={() => setStatus(selected.id, 'rejected')} className="px-3 py-2 rounded-xl border border-red-200 text-[12px] font-bold text-red-600 hover:bg-red-50 transition-colors" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Reject</button>
                )}
                {selected.status !== 'approved' && (
                  <button onClick={() => setStatus(selected.id, 'approved')} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[12px] font-bold shadow-sm hover:shadow-md transition-all" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}><Check className="w-3.5 h-3.5" /> Approve</button>
                )}
              </div>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E8644A] to-[#F0A500] flex items-center justify-center text-white font-bold text-[14px] flex-shrink-0">
                {selected.author_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-[13px] font-bold text-[#1e293b]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.author_name}</p>
                {selected.author_role && <p className="text-[11px] text-[#64748B]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.author_role}</p>}
              </div>
              <StatusBadge status={selected.status} />
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border-l-4 border-[#E8644A]">
              <p className="text-[13px] text-[#334155] leading-relaxed italic" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>"{selected.message}"</p>
            </div>
            <p className="text-[11px] text-[#94A3B8]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Submitted {fmtDate(selected.created_at)}</p>
          </div>
        </Drawer>
      )}

      {deleteId && <ConfirmDialog message="Move this appreciation to Trash?" onConfirm={doDelete} onCancel={() => setDeleteId(null)} confirmLabel="Move to Trash" />}
    </div>
  );
}

// ── Feedback Tab ──────────────────────────────────────────────────────────────
function FeedbackTab() {
  const { showToast } = useToast();
  const [items, setItems] = useState<Feedback[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selected, setSelected] = useState<Feedback | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from('feedback').select('*').is('deleted_at', null).order('created_at', { ascending: false });
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const setStatus = async (id: string, status: string) => {
    const { error: err } = await supabase.from('feedback').update({ status }).eq('id', id);
    if (err) { showToast('error', err.message); return; }
    showToast('success', 'Status updated!');
    load();
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : null);
  };

  const doDelete = async () => {
    if (!deleteId) return;
    const { error: err } = await supabase.from('feedback').update({ deleted_at: new Date().toISOString() }).eq('id', deleteId);
    if (err) { showToast('error', err.message); setDeleteId(null); return; }
    showToast('success', 'Moved to trash.');
    setDeleteId(null);
    if (selected?.id === deleteId) setSelected(null);
    load();
  };

  const pendingCount = items.filter(i => i.status === 'pending').length;

  const filtered = items.filter(i => {
    const matchSearch = i.author_name.toLowerCase().includes(search.toLowerCase()) || i.subject.toLowerCase().includes(search.toLowerCase()) || i.message.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || i.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl font-bold text-[#0f172a]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            Feedback
            {pendingCount > 0 && <span className="ml-2 text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold align-middle">{pendingCount} pending</span>}
          </h2>
          <p className="text-[11px] text-[#64748B] mt-0.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{items.length} total — click a row to review</p>
        </div>
        <div className="flex items-center gap-2">
          {(['all', 'pending', 'approved', 'rejected'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all capitalize ${statusFilter === s ? 'bg-[#0A6070] text-white shadow-sm' : 'border border-slate-200 text-[#64748B] hover:bg-slate-50'}`}
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search feedback…" className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-[12px] focus:outline-none focus:border-[#0A6070] bg-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-slate-50 bg-slate-50/60">
              {['Author', 'Email', 'Subject', 'Status', 'Date', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/60 transition-colors cursor-pointer group" onClick={() => setSelected(item)}>
                  <td className="px-4 py-3 text-[12px] font-semibold text-[#1e293b] whitespace-nowrap" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{item.author_name}</td>
                  <td className="px-4 py-3 text-[11px] text-[#64748B]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{item.author_email || '—'}</td>
                  <td className="px-4 py-3 text-[11px] text-[#334155] max-w-[200px] truncate" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{item.subject}</td>
                  <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                  <td className="px-4 py-3 text-[11px] text-[#64748B] whitespace-nowrap" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{fmtDate(item.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      {item.status !== 'approved' && (
                        <button onClick={() => setStatus(item.id, 'approved')} className="p-1.5 rounded-lg hover:bg-emerald-50 text-[#94A3B8] hover:text-emerald-600" title="Approve"><Check className="w-3.5 h-3.5" /></button>
                      )}
                      {item.status !== 'rejected' && (
                        <button onClick={() => setStatus(item.id, 'rejected')} className="p-1.5 rounded-lg hover:bg-red-50 text-[#94A3B8] hover:text-red-500" title="Reject"><X className="w-3.5 h-3.5" /></button>
                      )}
                      <button onClick={() => setDeleteId(item.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-[#94A3B8] hover:text-red-500" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-[12px] text-[#94A3B8]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>No feedback found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <Drawer title={selected.subject} subtitle={`From: ${selected.author_name}`} onClose={() => setSelected(null)} width="md"
          footer={
            <div className="flex items-center justify-between">
              <button onClick={() => setDeleteId(selected.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-100 text-[12px] font-bold text-red-500 hover:bg-red-50 transition-colors" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}><Trash2 className="w-3.5 h-3.5" /> Delete</button>
              <div className="flex gap-2">
                {selected.status !== 'rejected' && (
                  <button onClick={() => setStatus(selected.id, 'rejected')} className="px-3 py-2 rounded-xl border border-red-200 text-[12px] font-bold text-red-600 hover:bg-red-50 transition-colors" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Reject</button>
                )}
                {selected.status !== 'approved' && (
                  <button onClick={() => setStatus(selected.id, 'approved')} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[12px] font-bold shadow-sm hover:shadow-md transition-all" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}><Check className="w-3.5 h-3.5" /> Approve</button>
                )}
              </div>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[13px] font-bold text-[#1e293b]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.author_name}</p>
                {selected.author_email && <p className="text-[11px] text-[#64748B]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.author_email}</p>}
              </div>
              <StatusBadge status={selected.status} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Subject</p>
              <p className="text-[13px] font-semibold text-[#1e293b]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.subject}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-[13px] text-[#334155] leading-relaxed whitespace-pre-wrap" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.message}</p>
            </div>
            <p className="text-[11px] text-[#94A3B8]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Submitted {fmtDate(selected.created_at)}</p>
          </div>
        </Drawer>
      )}

      {deleteId && <ConfirmDialog message="Move this feedback to Trash?" onConfirm={doDelete} onCancel={() => setDeleteId(null)} confirmLabel="Move to Trash" />}
    </div>
  );
}

// ── Tab config ─────────────────────────────────────────────────────────────────
const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'appreciations', label: 'Appreciations', icon: Heart },
  { id: 'feedback',      label: 'Feedback',      icon: MessageCircle },
];

// ── Root Component ────────────────────────────────────────────────────────────
export default function PublicationsManager() {
  const [activeTab, setActiveTab] = useState<Tab>('appreciations');
  const [toast, setToast] = useState<{ type: 'error' | 'success'; msg: string } | null>(null);
  const showToast = useCallback((type: 'error' | 'success', msg: string) => { setToast({ type, msg }); setTimeout(() => setToast(null), 5000); }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
    <div>
      {toast && (
        <div className={`fixed top-4 right-4 z-[60] px-4 py-3 rounded-xl text-[12px] font-semibold shadow-lg flex items-center gap-3 ${toast.type === 'error' ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          {toast.msg}
          <button onClick={() => setToast(null)} className="text-current opacity-50 hover:opacity-100">✕</button>
        </div>
      )}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-[#0f172a]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Visitor Feedback</h1>
        <p className="text-[11px] text-[#64748B] mt-0.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Manage appreciations and feedback submitted by visitors</p>
      </div>

      <div className="flex items-center gap-1 mb-6 bg-white/60 backdrop-blur-sm rounded-2xl border border-slate-100 shadow-sm p-1.5 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold transition-all flex-1 justify-center whitespace-nowrap ${activeTab === tab.id ? 'bg-white shadow-sm text-[#0A6070]' : 'text-[#64748B] hover:text-[#1e293b]'}`}
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'appreciations' && <AppreciationsTab />}
      {activeTab === 'feedback'      && <FeedbackTab />}
    </div>
    </ToastContext.Provider>
  );
}
