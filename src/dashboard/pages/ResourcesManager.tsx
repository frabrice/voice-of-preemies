import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import Drawer from '../components/Drawer';
import ConfirmDialog from '../components/ConfirmDialog';
import { Plus, Pencil, Trash2, Search, ExternalLink } from 'lucide-react';
import { FileUploadField } from '../components/UploadField';

interface Resource { id: string; title: string; description: string; category: string; type: string; url: string; published: boolean; sort_order: number; }
type Form = Omit<Resource, 'id'>;
type Mode = 'view' | 'add' | 'edit';

const CATEGORIES = ['Guides & Handbooks', 'Medical Info', 'Mental Health', 'Support Groups', 'Financial Aid', 'Nutrition', 'Education', 'Legal & Rights'];
const TYPES = ['PDF', 'Video', 'Article', 'Link', 'Book', 'Tool'];
const EMPTY: Form = { title: '', description: '', category: 'Guides & Handbooks', type: 'Article', url: '', published: true, sort_order: 0 };
const TYPE_CLR: Record<string, string> = { PDF: 'bg-red-100 text-red-700', Video: 'bg-blue-100 text-blue-700', Article: 'bg-slate-100 text-slate-600', Link: 'bg-cyan-100 text-cyan-700', Book: 'bg-amber-100 text-amber-700', Tool: 'bg-emerald-100 text-emerald-700' };
const inp = 'w-full px-3 py-2.5 border border-slate-200 rounded-xl text-[13px] text-[#0f172a] focus:outline-none focus:border-[#0A6070] focus:ring-2 focus:ring-[#0A6070]/10 transition-all bg-white';
const Lbl = ({ t }: { t: string }) => <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-1.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{t}</label>;

export default function ResourcesManager() {
  const [items, setItems] = useState<Resource[]>([]);
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<Mode | null>(null);
  const [selected, setSelected] = useState<Resource | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'error' | 'success'; msg: string } | null>(null);
  const showToast = (type: 'error' | 'success', msg: string) => { setToast({ type, msg }); setTimeout(() => setToast(null), 5000); };

  const load = async () => { const { data } = await supabase.from('resources').select('id, title, description, category, type, url, file_url, published, sort_order, file_size, duration').is('deleted_at', null).order('sort_order'); setItems((data ?? []) as unknown as Resource[]); };
  useEffect(() => { load(); }, []);

  const openView = (r: Resource) => { setSelected(r); setMode('view'); };
  const openAdd = () => { setForm(EMPTY); setSelected(null); setMode('add'); };
  const openEdit = (r: Resource) => { setForm({ title: r.title, description: r.description, category: r.category, type: r.type, url: r.url || (r as any).file_url || '', published: r.published, sort_order: r.sort_order }); setSelected(r); setMode('edit'); };
  const close = () => { setMode(null); setSelected(null); };

  const save = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const payload = { ...form, file_url: form.url };
    try {
      if (mode === 'edit' && selected) { const { error: err } = await supabase.from('resources').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', selected.id); if (err) throw err; showToast('success', 'Resource updated!'); }
      else { const { error: err } = await supabase.from('resources').insert(payload); if (err) throw err; showToast('success', 'Resource created!'); }
      setSaving(false); close(); load();
    } catch (e: any) { setSaving(false); showToast('error', e.message || 'Failed to save resource.'); }
  };

  const doDelete = async () => {
    if (!deleteId) return;
    try { const { error: err } = await supabase.from('resources').update({ deleted_at: new Date().toISOString() }).eq('id', deleteId); if (err) throw err; showToast('success', 'Resource moved to trash.'); setDeleteId(null); close(); load(); }
    catch (e: any) { showToast('error', e.message || 'Failed to delete.'); setDeleteId(null); }
  };
  const filtered = items.filter(r => r.title.toLowerCase().includes(search.toLowerCase()) || r.category.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      {toast && (
        <div className={`fixed top-4 right-4 z-[60] px-4 py-3 rounded-xl text-[12px] font-semibold shadow-lg flex items-center gap-3 ${toast.type === 'error' ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          {toast.msg}
          <button onClick={() => setToast(null)} className="text-current opacity-50 hover:opacity-100">✕</button>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold text-[#0f172a]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Resources Library</h1>
          <p className="text-[11px] text-[#64748B] mt-0.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{items.length} resources — click a row to view</p>
        </div>
        <button onClick={openAdd} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-lime-500 to-green-400 text-white text-[12px] font-bold shadow-sm hover:shadow-md transition-all" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          <Plus className="w-3.5 h-3.5" /> Add Resource
        </button>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-50">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search resources…" className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-[12px] focus:outline-none focus:border-[#0A6070] bg-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-slate-50 bg-slate-50/60">
              {['Title', 'Category', 'Type', 'Status', 'Actions'].map(h => <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-slate-50/60 transition-colors cursor-pointer group" onClick={() => openView(r)}>
                  <td className="px-4 py-3 text-[12px] font-semibold text-[#1e293b] max-w-[200px] truncate" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{r.title}</td>
                  <td className="px-4 py-3 text-[11px] text-[#64748B]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{r.category}</td>
                  <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${TYPE_CLR[r.type] ?? 'bg-slate-100 text-slate-600'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{r.type}</span></td>
                  <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${r.published ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{r.published ? 'Live' : 'Hidden'}</span></td>
                  <td className="px-4 py-3"><div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-slate-100 text-[#94A3B8] hover:text-lime-600"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setDeleteId(r.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-[#94A3B8] hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-[12px] text-[#94A3B8]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>No resources found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {mode === 'view' && selected && (
        <Drawer title={selected.title} subtitle={`${selected.category} · ${selected.type}`} onClose={close} width="md"
          footer={<div className="flex items-center justify-between">
            <button onClick={() => setDeleteId(selected.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-100 text-[12px] font-bold text-red-500 hover:bg-red-50 transition-colors" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}><Trash2 className="w-3.5 h-3.5" /> Delete</button>
            <button onClick={() => openEdit(selected)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-lime-500 to-green-400 text-white text-[12px] font-bold shadow-sm" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}><Pencil className="w-3.5 h-3.5" /> Edit</button>
          </div>}
        >
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${TYPE_CLR[selected.type] ?? 'bg-slate-100 text-slate-600'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.type}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-600" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.category}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${selected.published ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.published ? 'Published' : 'Hidden'}</span>
            </div>
            {selected.description && <p className="text-[13px] text-[#334155] leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.description}</p>}
            {(selected.url || (selected as any).file_url) && <a href={selected.url || (selected as any).file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-4 py-3 rounded-xl bg-[#0A6070]/5 border border-[#0A6070]/10 text-[12px] font-semibold text-[#0A6070] hover:bg-[#0A6070]/10 transition-colors" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}><ExternalLink className="w-3.5 h-3.5 flex-shrink-0" /><span className="truncate">{selected.url || (selected as any).file_url}</span></a>}
          </div>
        </Drawer>
      )}

      {(mode === 'add' || mode === 'edit') && (
        <Drawer title={mode === 'add' ? 'Add Resource' : 'Edit Resource'} subtitle={mode === 'edit' ? selected?.title : undefined} onClose={close} width="md"
          footer={<div className="flex gap-2 justify-end">
            <button onClick={close} className="px-4 py-2 rounded-xl border border-slate-200 text-[12px] font-bold text-[#64748B] hover:bg-slate-50" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Cancel</button>
            <button onClick={save} disabled={saving || !form.title.trim()} className="px-5 py-2 rounded-xl bg-gradient-to-r from-lime-500 to-green-400 text-white text-[12px] font-bold disabled:opacity-50 shadow-sm" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{saving ? 'Saving…' : mode === 'add' ? 'Add Resource' : 'Save Changes'}</button>
          </div>}
        >
          <div className="space-y-4">
            <div><Lbl t="Title *" /><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className={inp} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Lbl t="Category" /><select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={inp} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
              <div><Lbl t="Type" /><select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className={inp} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
            </div>
            <div><Lbl t="Description" /><textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className={inp + ' resize-none'} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
            <FileUploadField label="URL / Link" value={form.url} onChange={url => setForm({ ...form, url })} folder="voice-of-preemies/resources" />
            <div><Lbl t="Sort Order" /><input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })} className={inp} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.published} onChange={e => setForm({ ...form, published: e.target.checked })} className="w-4 h-4 rounded accent-lime-500" /><span className="text-[12px] text-[#334155]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Published</span></label>
          </div>
        </Drawer>
      )}

      {deleteId && <ConfirmDialog message="Move this resource to Trash? You can restore it later." onConfirm={doDelete} onCancel={() => setDeleteId(null)} confirmLabel="Move to Trash" />}
    </div>
  );
}
