import { useEffect, useState, useCallback, createContext, useContext, ReactNode } from 'react';
import { supabase } from '../../lib/supabase';
import Drawer from '../components/Drawer';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  Plus, Pencil, Trash2, Search, Eye, EyeOff, Star,
  Calendar, ExternalLink, MapPin, Check, X, MessageCircle, Heart, BookOpen,
} from 'lucide-react';

// ── Shared helpers ──────────────────────────────────────────────────────────
const inp = 'w-full px-3 py-2.5 border border-slate-200 rounded-xl text-[13px] text-[#0f172a] focus:outline-none focus:border-[#0A6070] focus:ring-2 focus:ring-[#0A6070]/10 transition-all bg-white';
const Lbl = ({ t }: { t: string }) => (
  <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-1.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{t}</label>
);

type Tab = 'stories' | 'appreciations' | 'feedback' | 'news' | 'events';

// ── Toast Context ───────────────────────────────────────────────────────────
interface ToastCtx { showToast: (type: 'error' | 'success', msg: string) => void; }
const ToastContext = createContext<ToastCtx>({ showToast: () => {} });
const useToast = () => useContext(ToastContext);

// ── Types ───────────────────────────────────────────────────────────────────
interface Appreciation { id: string; author_name: string; author_role: string; message: string; status: string; created_at: string; deleted_at: string | null; }
interface Feedback { id: string; author_name: string; author_email: string | null; subject: string; message: string; status: string; created_at: string; deleted_at: string | null; }
interface Article { id: string; title: string; excerpt: string; content: string; tag: string; date: string; image_url: string; published: boolean; featured: boolean; }
interface Event { id: string; title: string; description: string; date: string; end_date: string; location: string; type: string; image_url: string; registration_url: string; published: boolean; featured: boolean; }

type ArticleForm = Omit<Article, 'id'>;
type EventForm = Omit<Event, 'id'>;
type DrawerMode = 'view' | 'add' | 'edit';

const ARTICLE_TAGS = ['Event', 'Partnership', 'Story', 'Research', 'Education', 'Advocacy', 'News'];
const EVENT_TYPES = ['Conference', 'Workshop', 'Webinar', 'Fundraiser', 'Community', 'Awareness', 'Training'];
const ARTICLE_EMPTY: ArticleForm = { title: '', excerpt: '', content: '', tag: 'News', date: new Date().toISOString().split('T')[0], image_url: '', published: false, featured: false };
const EVENT_EMPTY: EventForm = { title: '', description: '', date: new Date().toISOString().split('T')[0], end_date: '', location: '', type: 'Community', image_url: '', registration_url: '', published: false, featured: false };
const TAG_CLR: Record<string, string> = { Event: 'bg-blue-100 text-blue-700', Partnership: 'bg-emerald-100 text-emerald-700', Story: 'bg-amber-100 text-amber-700', Research: 'bg-violet-100 text-violet-700', Education: 'bg-cyan-100 text-cyan-700', Advocacy: 'bg-rose-100 text-rose-700', News: 'bg-slate-100 text-slate-600' };
const TYPE_CLR: Record<string, string> = { Conference: 'bg-blue-100 text-blue-700', Workshop: 'bg-amber-100 text-amber-700', Webinar: 'bg-cyan-100 text-cyan-700', Fundraiser: 'bg-rose-100 text-rose-700', Community: 'bg-emerald-100 text-emerald-700', Awareness: 'bg-orange-100 text-orange-700', Training: 'bg-slate-100 text-slate-600' };

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const isPast = (d: string) => new Date(d) < new Date();

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

// ── News Tab ─────────────────────────────────────────────────────────────────
function NewsTab() {
  const { showToast } = useToast();
  const [articles, setArticles] = useState<Article[]>([]);
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<DrawerMode | null>(null);
  const [selected, setSelected] = useState<Article | null>(null);
  const [form, setForm] = useState<ArticleForm>(ARTICLE_EMPTY);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from('news_articles').select('*').is('deleted_at', null).order('date', { ascending: false });
    setArticles(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const openView = (a: Article) => { setSelected(a); setMode('view'); };
  const openAdd = () => { setForm(ARTICLE_EMPTY); setSelected(null); setMode('add'); };
  const openEdit = (a: Article) => { setForm({ title: a.title, excerpt: a.excerpt, content: a.content, tag: a.tag, date: a.date, image_url: a.image_url, published: a.published, featured: a.featured }); setSelected(a); setMode('edit'); };
  const close = () => { setMode(null); setSelected(null); };

  const save = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      if (mode === 'edit' && selected) { const { error: err } = await supabase.from('news_articles').update({ ...form, updated_at: new Date().toISOString() }).eq('id', selected.id); if (err) throw err; showToast('success', 'Article updated!'); }
      else { const { error: err } = await supabase.from('news_articles').insert(form); if (err) throw err; showToast('success', 'Article created!'); }
      setSaving(false); close(); load();
    } catch (e: any) { setSaving(false); showToast('error', e.message || 'Failed to save article.'); }
  };

  const togglePublish = async (a: Article, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const { error: err } = await supabase.from('news_articles').update({ published: !a.published }).eq('id', a.id);
    if (err) { showToast('error', err.message); return; }
    load();
    if (selected?.id === a.id) setSelected({ ...a, published: !a.published });
  };

  const doDelete = async () => {
    if (!deleteId) return;
    const { error: err } = await supabase.from('news_articles').update({ deleted_at: new Date().toISOString() }).eq('id', deleteId);
    if (err) { showToast('error', err.message); setDeleteId(null); return; }
    showToast('success', 'Article moved to trash.');
    setDeleteId(null); close(); load();
  };

  const filtered = articles.filter(a => a.title.toLowerCase().includes(search.toLowerCase()) || a.tag.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl font-bold text-[#0f172a]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>News & Articles</h2>
          <p className="text-[11px] text-[#64748B] mt-0.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{articles.length} articles — click a row to view details</p>
        </div>
        <button onClick={openAdd} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#0A6070] to-[#1AADA0] text-white text-[12px] font-bold shadow-sm hover:shadow-md transition-all" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          <Plus className="w-3.5 h-3.5" /> Add Article
        </button>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search articles…" className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-[12px] focus:outline-none focus:border-[#0A6070] bg-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-slate-50 bg-slate-50/60">
              {['Title', 'Tag', 'Date', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(a => (
                <tr key={a.id} className="hover:bg-slate-50/60 transition-colors cursor-pointer group" onClick={() => openView(a)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {a.featured && <Star className="w-3 h-3 text-amber-400 flex-shrink-0" />}
                      <span className="text-[12px] font-semibold text-[#1e293b] line-clamp-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{a.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${TAG_CLR[a.tag] ?? 'bg-slate-100 text-slate-600'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{a.tag}</span></td>
                  <td className="px-4 py-3 text-[11px] text-[#64748B] whitespace-nowrap" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{a.date}</td>
                  <td className="px-4 py-3">
                    <button onClick={e => togglePublish(a, e)} className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${a.published ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                      {a.published ? 'Live' : 'Draft'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      <button onClick={() => togglePublish(a)} className="p-1.5 rounded-lg hover:bg-slate-100 text-[#94A3B8] hover:text-[#0A6070]" title={a.published ? 'Unpublish' : 'Publish'}>{a.published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}</button>
                      <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg hover:bg-slate-100 text-[#94A3B8] hover:text-[#0A6070]"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeleteId(a.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-[#94A3B8] hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-[12px] text-[#94A3B8]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>No articles found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {mode === 'view' && selected && (
        <Drawer title={selected.title} subtitle={`${selected.tag} · ${selected.date}`} onClose={close} width="lg"
          footer={<div className="flex items-center justify-between">
            <button onClick={() => setDeleteId(selected.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-100 text-[12px] font-bold text-red-500 hover:bg-red-50" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}><Trash2 className="w-3.5 h-3.5" /> Delete</button>
            <div className="flex gap-2">
              <button onClick={() => togglePublish(selected)} className={`px-3 py-2 rounded-xl text-[12px] font-bold border transition-colors ${selected.published ? 'border-amber-200 text-amber-600 hover:bg-amber-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.published ? 'Unpublish' : 'Publish'}</button>
              <button onClick={() => openEdit(selected)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#0A6070] to-[#1AADA0] text-white text-[12px] font-bold shadow-sm" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}><Pencil className="w-3.5 h-3.5" /> Edit</button>
            </div>
          </div>}
        >
          <div className="space-y-4">
            {selected.image_url && <img src={selected.image_url} alt="" className="w-full h-44 object-cover rounded-xl" />}
            <div className="flex flex-wrap gap-2">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${TAG_CLR[selected.tag] ?? 'bg-slate-100 text-slate-600'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.tag}</span>
              {selected.featured && <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-700" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}><Star className="w-2.5 h-2.5" /> Featured</span>}
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${selected.published ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.published ? 'Published' : 'Draft'}</span>
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-600" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}><Calendar className="w-2.5 h-2.5" /> {selected.date}</span>
            </div>
            {selected.excerpt && <div className="p-3 bg-slate-50 rounded-xl border-l-4 border-[#0A6070]"><p className="text-[12px] text-[#334155] italic leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.excerpt}</p></div>}
            {selected.content && <div><p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Full Content</p><p className="text-[13px] text-[#334155] leading-relaxed whitespace-pre-wrap" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.content}</p></div>}
            {selected.image_url && <a href={selected.image_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-[#0A6070] hover:underline" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}><ExternalLink className="w-3 h-3" /> View image</a>}
          </div>
        </Drawer>
      )}

      {(mode === 'add' || mode === 'edit') && (
        <Drawer title={mode === 'add' ? 'Add Article' : 'Edit Article'} subtitle={mode === 'edit' ? selected?.title : 'Fill in the details below'} onClose={close} width="lg"
          footer={<div className="flex gap-2 justify-end">
            <button onClick={close} className="px-4 py-2 rounded-xl border border-slate-200 text-[12px] font-bold text-[#64748B] hover:bg-slate-50" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Cancel</button>
            <button onClick={save} disabled={saving || !form.title.trim()} className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#0A6070] to-[#1AADA0] text-white text-[12px] font-bold disabled:opacity-50 shadow-sm" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{saving ? 'Saving…' : mode === 'add' ? 'Create Article' : 'Save Changes'}</button>
          </div>}
        >
          <div className="space-y-4">
            <div><Lbl t="Title *" /><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Article title" className={inp} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Lbl t="Tag" /><select value={form.tag} onChange={e => setForm({ ...form, tag: e.target.value })} className={inp} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{ARTICLE_TAGS.map(t => <option key={t}>{t}</option>)}</select></div>
              <div><Lbl t="Date" /><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className={inp} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
            </div>
            <div><Lbl t="Image URL" /><input value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} placeholder="https://…" className={inp} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
            <div><Lbl t="Excerpt" /><textarea rows={2} value={form.excerpt} onChange={e => setForm({ ...form, excerpt: e.target.value })} placeholder="Short summary…" className={inp + ' resize-none'} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
            <div><Lbl t="Full Content" /><textarea rows={8} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="Full article text…" className={inp + ' resize-none'} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
            <div className="flex gap-5 pt-1">
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.published} onChange={e => setForm({ ...form, published: e.target.checked })} className="w-4 h-4 rounded accent-[#0A6070]" /><span className="text-[12px] text-[#334155]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Published</span></label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.featured} onChange={e => setForm({ ...form, featured: e.target.checked })} className="w-4 h-4 rounded accent-[#0A6070]" /><span className="text-[12px] text-[#334155]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Featured</span></label>
            </div>
          </div>
        </Drawer>
      )}

      {deleteId && <ConfirmDialog message="Move this article to Trash? You can restore it later." onConfirm={doDelete} onCancel={() => setDeleteId(null)} confirmLabel="Move to Trash" />}
    </div>
  );
}

// ── Events Tab ────────────────────────────────────────────────────────────────
function EventsTab() {
  const { showToast } = useToast();
  const [items, setItems] = useState<Event[]>([]);
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<DrawerMode | null>(null);
  const [selected, setSelected] = useState<Event | null>(null);
  const [form, setForm] = useState<EventForm>(EVENT_EMPTY);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from('events').select('*').is('deleted_at', null).order('date', { ascending: false });
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const openView = (e: Event) => { setSelected(e); setMode('view'); };
  const openAdd = () => { setForm(EVENT_EMPTY); setSelected(null); setMode('add'); };
  const openEdit = (e: Event) => { setForm({ title: e.title, description: e.description, date: e.date, end_date: e.end_date ?? '', location: e.location, type: e.type, image_url: e.image_url, registration_url: e.registration_url ?? '', published: e.published, featured: e.featured }); setSelected(e); setMode('edit'); };
  const close = () => { setMode(null); setSelected(null); };

  const save = async () => {
    if (!form.title.trim() || !form.date) return;
    setSaving(true);
    const payload = { ...form, end_date: form.end_date || null, registration_url: form.registration_url || null };
    try {
      if (mode === 'edit' && selected) { const { error: err } = await supabase.from('events').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', selected.id); if (err) throw err; showToast('success', 'Event updated!'); }
      else { const { error: err } = await supabase.from('events').insert(payload); if (err) throw err; showToast('success', 'Event created!'); }
      setSaving(false); close(); load();
    } catch (e: any) { setSaving(false); showToast('error', e.message || 'Failed to save event.'); }
  };

  const togglePublish = async (item: Event, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const { error: err } = await supabase.from('events').update({ published: !item.published }).eq('id', item.id);
    if (err) { showToast('error', err.message); return; }
    load();
    if (selected?.id === item.id) setSelected({ ...item, published: !item.published });
  };

  const doDelete = async () => {
    if (!deleteId) return;
    const { error: err } = await supabase.from('events').update({ deleted_at: new Date().toISOString() }).eq('id', deleteId);
    if (err) { showToast('error', err.message); setDeleteId(null); return; }
    showToast('success', 'Event moved to trash.');
    setDeleteId(null); close(); load();
  };

  const filtered = items.filter(e => e.title.toLowerCase().includes(search.toLowerCase()) || e.type.toLowerCase().includes(search.toLowerCase()) || (e.location ?? '').toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl font-bold text-[#0f172a]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Events</h2>
          <p className="text-[11px] text-[#64748B] mt-0.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{items.length} events — click a row to view</p>
        </div>
        <button onClick={openAdd} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-400 text-white text-[12px] font-bold shadow-sm hover:shadow-md transition-all" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          <Plus className="w-3.5 h-3.5" /> Add Event
        </button>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search events…" className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-[12px] focus:outline-none focus:border-[#0A6070] bg-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-slate-50 bg-slate-50/60">
              {['Title', 'Type', 'Date', 'Location', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(e => (
                <tr key={e.id} className="hover:bg-slate-50/60 transition-colors cursor-pointer group" onClick={() => openView(e)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {e.featured && <Star className="w-3 h-3 text-amber-400 flex-shrink-0" fill="currentColor" />}
                      <span className="text-[12px] font-semibold text-[#1e293b]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{e.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${TYPE_CLR[e.type] ?? 'bg-slate-100 text-slate-600'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{e.type}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-[#94A3B8]" />
                      <span className="text-[11px] text-[#64748B] whitespace-nowrap" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{fmtDate(e.date)}</span>
                      {isPast(e.date) && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-400 font-bold" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Past</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-[#64748B] max-w-[140px] truncate" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{e.location || '—'}</td>
                  <td className="px-4 py-3">
                    <button onClick={ev => togglePublish(e, ev)} className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${e.published ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                      {e.published ? 'Live' : 'Draft'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={ev => ev.stopPropagation()}>
                      <button onClick={() => openEdit(e)} className="p-1.5 rounded-lg hover:bg-slate-100 text-[#94A3B8] hover:text-cyan-600"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeleteId(e.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-[#94A3B8] hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-[12px] text-[#94A3B8]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>No events found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {mode === 'view' && selected && (
        <Drawer title={selected.title} subtitle={`${selected.type} · ${fmtDate(selected.date)}`} onClose={close} width="lg"
          footer={<div className="flex items-center justify-between">
            <button onClick={() => setDeleteId(selected.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-100 text-[12px] font-bold text-red-500 hover:bg-red-50" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}><Trash2 className="w-3.5 h-3.5" /> Delete</button>
            <div className="flex gap-2">
              <button onClick={() => togglePublish(selected)} className={`px-3 py-2 rounded-xl text-[12px] font-bold border transition-colors ${selected.published ? 'border-amber-200 text-amber-600 hover:bg-amber-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.published ? 'Unpublish' : 'Publish'}</button>
              <button onClick={() => openEdit(selected)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-400 text-white text-[12px] font-bold shadow-sm" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}><Pencil className="w-3.5 h-3.5" /> Edit</button>
            </div>
          </div>}
        >
          <div className="space-y-4">
            {selected.image_url && <img src={selected.image_url} alt="" className="w-full h-44 object-cover rounded-xl" />}
            <div className="flex flex-wrap gap-2">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${TYPE_CLR[selected.type] ?? 'bg-slate-100 text-slate-600'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.type}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${selected.published ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.published ? 'Published' : 'Draft'}</span>
              {selected.featured && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-700" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Featured</span>}
              {isPast(selected.date) && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-500" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Past Event</span>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Start Date</p>
                <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-cyan-500" /><p className="text-[12px] font-semibold text-[#1e293b]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{fmtDate(selected.date)}</p></div>
              </div>
              {selected.end_date && <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>End Date</p>
                <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-cyan-500" /><p className="text-[12px] font-semibold text-[#1e293b]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{fmtDate(selected.end_date)}</p></div>
              </div>}
            </div>
            {selected.location && <div className="flex items-center gap-1.5 text-[12px] text-[#334155]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}><MapPin className="w-3.5 h-3.5 text-[#94A3B8] flex-shrink-0" />{selected.location}</div>}
            {selected.description && <div><p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Description</p><p className="text-[13px] text-[#334155] leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.description}</p></div>}
            {selected.registration_url && <a href={selected.registration_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-4 py-3 rounded-xl bg-cyan-50 border border-cyan-100 text-[12px] font-semibold text-cyan-700 hover:bg-cyan-100 transition-colors" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}><ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />Register / Learn More</a>}
          </div>
        </Drawer>
      )}

      {(mode === 'add' || mode === 'edit') && (
        <Drawer title={mode === 'add' ? 'Add Event' : 'Edit Event'} subtitle={mode === 'edit' ? selected?.title : undefined} onClose={close} width="lg"
          footer={<div className="flex gap-2 justify-end">
            <button onClick={close} className="px-4 py-2 rounded-xl border border-slate-200 text-[12px] font-bold text-[#64748B] hover:bg-slate-50" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Cancel</button>
            <button onClick={save} disabled={saving || !form.title.trim() || !form.date} className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-400 text-white text-[12px] font-bold disabled:opacity-50 shadow-sm" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{saving ? 'Saving…' : mode === 'add' ? 'Add Event' : 'Save Changes'}</button>
          </div>}
        >
          <div className="space-y-4">
            <div><Lbl t="Title *" /><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className={inp} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Lbl t="Type" /><select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className={inp} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{EVENT_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
              <div><Lbl t="Location" /><input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className={inp} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Lbl t="Start Date *" /><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className={inp} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
              <div><Lbl t="End Date" /><input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} className={inp} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
            </div>
            <div><Lbl t="Description" /><textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className={inp + ' resize-none'} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
            <div><Lbl t="Image URL" /><input value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} placeholder="https://…" className={inp} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
            <div><Lbl t="Registration URL" /><input value={form.registration_url} onChange={e => setForm({ ...form, registration_url: e.target.value })} placeholder="https://…" className={inp} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
            <div className="flex gap-5">
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.published} onChange={e => setForm({ ...form, published: e.target.checked })} className="w-4 h-4 rounded accent-cyan-500" /><span className="text-[12px] text-[#334155]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Published</span></label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.featured} onChange={e => setForm({ ...form, featured: e.target.checked })} className="w-4 h-4 rounded accent-amber-500" /><span className="text-[12px] text-[#334155]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Featured</span></label>
            </div>
          </div>
        </Drawer>
      )}

      {deleteId && <ConfirmDialog message="Move this event to Trash? You can restore it later." onConfirm={doDelete} onCancel={() => setDeleteId(null)} confirmLabel="Move to Trash" />}
    </div>
  );
}

// ── Stories Tab ───────────────────────────────────────────────────────────────
interface Story { id: string; name: string; baby_info: string; tag: string; location: string; year: number; excerpt: string; full_story: string; image_url: string; published: boolean; featured: boolean; }
type StoryForm = Omit<Story, 'id'>;
type StoryMode = 'view' | 'add' | 'edit';
const STORY_TAGS = ['Parent Story', 'Family Story', "Father's Story", 'Healthcare Story', 'Grief Story'];
const STORY_EMPTY: StoryForm = { name: '', baby_info: '', tag: 'Parent Story', location: 'Kigali', year: new Date().getFullYear(), excerpt: '', full_story: '', image_url: '', published: false, featured: false };
const STORY_TAG_CLR: Record<string, string> = { 'Parent Story': 'bg-rose-100 text-rose-700', 'Family Story': 'bg-amber-100 text-amber-700', "Father's Story": 'bg-blue-100 text-blue-700', 'Healthcare Story': 'bg-cyan-100 text-cyan-700', 'Grief Story': 'bg-slate-100 text-slate-600' };

function StoriesTab() {
  const { showToast } = useToast();
  const [items, setItems] = useState<Story[]>([]);
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<StoryMode | null>(null);
  const [selected, setSelected] = useState<Story | null>(null);
  const [form, setForm] = useState<StoryForm>(STORY_EMPTY);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => { const { data } = await supabase.from('stories').select('*').is('deleted_at', null).order('year', { ascending: false }); setItems(data ?? []); };
  useEffect(() => { load(); }, []);

  const openView = (s: Story) => { setSelected(s); setMode('view'); };
  const openAdd = () => { setForm(STORY_EMPTY); setSelected(null); setMode('add'); };
  const openEdit = (s: Story) => { setForm({ name: s.name, baby_info: s.baby_info, tag: s.tag, location: s.location, year: s.year, excerpt: s.excerpt, full_story: s.full_story, image_url: s.image_url, published: s.published, featured: s.featured }); setSelected(s); setMode('edit'); };
  const close = () => { setMode(null); setSelected(null); };

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (mode === 'edit' && selected) { const { error: err } = await supabase.from('stories').update({ ...form, updated_at: new Date().toISOString() }).eq('id', selected.id); if (err) throw err; showToast('success', 'Story updated!'); }
      else { const { error: err } = await supabase.from('stories').insert(form); if (err) throw err; showToast('success', 'Story created!'); }
      setSaving(false); close(); load();
    } catch (e: any) { setSaving(false); showToast('error', e.message || 'Failed to save story.'); }
  };

  const togglePublish = async (s: Story, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const { error: err } = await supabase.from('stories').update({ published: !s.published }).eq('id', s.id);
    if (err) { showToast('error', err.message); return; }
    load();
    if (selected?.id === s.id) setSelected({ ...s, published: !s.published });
  };

  const doDelete = async () => {
    if (!deleteId) return;
    const { error: err } = await supabase.from('stories').update({ deleted_at: new Date().toISOString() }).eq('id', deleteId);
    if (err) { showToast('error', err.message); setDeleteId(null); return; }
    showToast('success', 'Story moved to trash.');
    setDeleteId(null); close(); load();
  };
  const filtered = items.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.tag.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl font-bold text-[#0f172a]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Stories</h2>
          <p className="text-[11px] text-[#64748B] mt-0.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{items.length} stories — click a row to view details</p>
        </div>
        <button onClick={openAdd} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-white text-[12px] font-bold shadow-sm hover:shadow-md transition-all" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          <Plus className="w-3.5 h-3.5" /> Add Story
        </button>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-50">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search stories…" className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-[12px] focus:outline-none focus:border-[#0A6070] bg-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-slate-50 bg-slate-50/60">
              {['Name', 'Baby Info', 'Tag', 'Year', 'Status', 'Actions'].map(h => <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(s => (
                <tr key={s.id} className="hover:bg-slate-50/60 transition-colors cursor-pointer group" onClick={() => openView(s)}>
                  <td className="px-4 py-3"><div className="flex items-center gap-1.5">{s.featured && <Star className="w-3 h-3 text-amber-400 flex-shrink-0" />}<span className="text-[12px] font-semibold text-[#1e293b]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{s.name}</span></div></td>
                  <td className="px-4 py-3 text-[11px] text-[#64748B] max-w-[160px] truncate" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{s.baby_info}</td>
                  <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${STORY_TAG_CLR[s.tag] ?? 'bg-slate-100 text-slate-600'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{s.tag}</span></td>
                  <td className="px-4 py-3 text-[11px] text-[#64748B]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{s.year}</td>
                  <td className="px-4 py-3"><button onClick={e => togglePublish(s, e)} className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${s.published ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{s.published ? 'Live' : 'Draft'}</button></td>
                  <td className="px-4 py-3"><div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <button onClick={() => togglePublish(s)} className="p-1.5 rounded-lg hover:bg-slate-100 text-[#94A3B8] hover:text-[#0A6070]">{s.published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}</button>
                    <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-slate-100 text-[#94A3B8] hover:text-[#0A6070]"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setDeleteId(s.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-[#94A3B8] hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-[12px] text-[#94A3B8]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>No stories found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {mode === 'view' && selected && (
        <Drawer title={selected.name} subtitle={`${selected.tag} · ${selected.location}, ${selected.year}`} onClose={close} width="lg"
          footer={<div className="flex items-center justify-between">
            <button onClick={() => setDeleteId(selected.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-100 text-[12px] font-bold text-red-500 hover:bg-red-50 transition-colors" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}><Trash2 className="w-3.5 h-3.5" /> Delete</button>
            <div className="flex gap-2">
              <button onClick={() => togglePublish(selected)} className={`px-3 py-2 rounded-xl text-[12px] font-bold border transition-colors ${selected.published ? 'border-amber-200 text-amber-600 hover:bg-amber-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.published ? 'Unpublish' : 'Publish'}</button>
              <button onClick={() => openEdit(selected)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-white text-[12px] font-bold shadow-sm hover:shadow-md transition-all" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}><Pencil className="w-3.5 h-3.5" /> Edit Story</button>
            </div>
          </div>}
        >
          <div className="space-y-4">
            {selected.image_url && <img src={selected.image_url} alt="" className="w-full h-44 object-cover rounded-xl" />}
            <div className="flex flex-wrap gap-2">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${STORY_TAG_CLR[selected.tag] ?? 'bg-slate-100 text-slate-600'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.tag}</span>
              {selected.featured && <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-700" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}><Star className="w-2.5 h-2.5" /> Featured</span>}
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${selected.published ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.published ? 'Published' : 'Draft'}</span>
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-600" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}><MapPin className="w-2.5 h-2.5" /> {selected.location}, {selected.year}</span>
            </div>
            {selected.baby_info && <div className="p-3 bg-slate-50 rounded-xl"><p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Baby Info</p><p className="text-[13px] text-[#334155] font-medium" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.baby_info}</p></div>}
            {selected.excerpt && <div className="p-3 bg-slate-50 rounded-xl border-l-4 border-amber-400"><p className="text-[12px] text-[#334155] italic leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.excerpt}</p></div>}
            {selected.full_story && <div className="space-y-1"><p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Full Story</p><p className="text-[13px] text-[#334155] leading-relaxed whitespace-pre-wrap" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.full_story}</p></div>}
            {selected.image_url && <a href={selected.image_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-[#0A6070] hover:underline" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}><ExternalLink className="w-3 h-3" /> View image</a>}
          </div>
        </Drawer>
      )}

      {(mode === 'add' || mode === 'edit') && (
        <Drawer title={mode === 'add' ? 'Add Story' : 'Edit Story'} subtitle={mode === 'edit' ? selected?.name : 'Share a family journey'} onClose={close} width="lg"
          footer={<div className="flex gap-2 justify-end">
            <button onClick={close} className="px-4 py-2 rounded-xl border border-slate-200 text-[12px] font-bold text-[#64748B] hover:bg-slate-50 transition-colors" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Cancel</button>
            <button onClick={save} disabled={saving || !form.name.trim()} className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-white text-[12px] font-bold disabled:opacity-50 shadow-sm hover:shadow-md transition-all" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{saving ? 'Saving…' : mode === 'add' ? 'Add Story' : 'Save Changes'}</button>
          </div>}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Lbl t="Name *" /><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Parent name" className={inp} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
              <div><Lbl t="Tag" /><select value={form.tag} onChange={e => setForm({ ...form, tag: e.target.value })} className={inp} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{STORY_TAGS.map(t => <option key={t}>{t}</option>)}</select></div>
            </div>
            <div><Lbl t="Baby Info" /><input value={form.baby_info} onChange={e => setForm({ ...form, baby_info: e.target.value })} placeholder="e.g. Emmanuel, born at 28 weeks" className={inp} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Lbl t="Location" /><input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className={inp} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
              <div><Lbl t="Year" /><input type="number" value={form.year} onChange={e => setForm({ ...form, year: Number(e.target.value) })} className={inp} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
            </div>
            <div><Lbl t="Image URL" /><input value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} placeholder="https://…" className={inp} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
            <div><Lbl t="Excerpt" /><textarea rows={2} value={form.excerpt} onChange={e => setForm({ ...form, excerpt: e.target.value })} placeholder="Short quote or summary…" className={inp + ' resize-none'} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
            <div><Lbl t="Full Story" /><textarea rows={8} value={form.full_story} onChange={e => setForm({ ...form, full_story: e.target.value })} placeholder="The full story text…" className={inp + ' resize-none'} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
            <div className="flex gap-5 pt-1">
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.published} onChange={e => setForm({ ...form, published: e.target.checked })} className="w-4 h-4 rounded accent-[#0A6070]" /><span className="text-[12px] text-[#334155]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Published</span></label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.featured} onChange={e => setForm({ ...form, featured: e.target.checked })} className="w-4 h-4 rounded accent-[#0A6070]" /><span className="text-[12px] text-[#334155]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Featured</span></label>
            </div>
          </div>
        </Drawer>
      )}

      {deleteId && <ConfirmDialog message="Move this story to Trash? You can restore it later." onConfirm={doDelete} onCancel={() => setDeleteId(null)} confirmLabel="Move to Trash" />}
    </div>
  );
}

// ── Tab config ─────────────────────────────────────────────────────────────────
const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'stories',       label: 'Stories',       icon: BookOpen },
  { id: 'appreciations', label: 'Appreciations', icon: Heart },
  { id: 'feedback',      label: 'Feedback',      icon: MessageCircle },
  { id: 'news',          label: 'News',          icon: ({ className }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l6 6v8a2 2 0 01-2 2z"/></svg> },
  { id: 'events',        label: 'Events',        icon: Calendar },
];

// ── Root Component ────────────────────────────────────────────────────────────
export default function PublicationsManager() {
  const [activeTab, setActiveTab] = useState<Tab>('stories');
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
        <h1 className="text-xl font-bold text-[#0f172a]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Publications & Stories</h1>
        <p className="text-[11px] text-[#64748B] mt-0.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Manage stories, appreciations, feedback, news articles, and events</p>
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

      {activeTab === 'stories'       && <StoriesTab />}
      {activeTab === 'appreciations' && <AppreciationsTab />}
      {activeTab === 'feedback'      && <FeedbackTab />}
      {activeTab === 'news'          && <NewsTab />}
      {activeTab === 'events'        && <EventsTab />}
    </div>
    </ToastContext.Provider>
  );
}
