import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import Drawer from '../components/Drawer';
import ConfirmDialog from '../components/ConfirmDialog';
import { Plus, Pencil, Trash2, Search, ExternalLink, Globe } from 'lucide-react';
import { ImageUploadField } from '../components/UploadField';

interface Partner { id: string; name: string; description: string; logo_url: string; website_url: string; category: string; active: boolean; sort_order: number; }
type Form = Omit<Partner, 'id'>;
type Mode = 'view' | 'add' | 'edit';

const CATEGORIES = ['Hospital', 'NGO', 'Government', 'Corporate', 'International', 'Academic', 'Community'];
const EMPTY: Form = { name: '', description: '', logo_url: '', website_url: '', category: 'NGO', active: true, sort_order: 0 };
const CAT_CLR: Record<string, string> = { Hospital: 'bg-blue-100 text-blue-700', NGO: 'bg-emerald-100 text-emerald-700', Government: 'bg-amber-100 text-amber-700', Corporate: 'bg-slate-100 text-slate-600', International: 'bg-cyan-100 text-cyan-700', Academic: 'bg-violet-100 text-violet-700', Community: 'bg-rose-100 text-rose-700' };
const inp = 'w-full px-3 py-2.5 border border-slate-200 rounded-xl text-[13px] text-[#0f172a] focus:outline-none focus:border-[#0A6070] focus:ring-2 focus:ring-[#0A6070]/10 transition-all bg-white';
const Lbl = ({ t }: { t: string }) => <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-1.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{t}</label>;

export default function PartnersManager() {
  const [items, setItems] = useState<Partner[]>([]);
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<Mode | null>(null);
  const [selected, setSelected] = useState<Partner | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'error' | 'success'; msg: string } | null>(null);
  const showToast = (type: 'error' | 'success', msg: string) => { setToast({ type, msg }); setTimeout(() => setToast(null), 5000); };

  const load = async () => { const { data } = await supabase.from('partners').select('*').is('deleted_at', null).order('sort_order'); setItems(data ?? []); };
  useEffect(() => { load(); }, []);

  const openView = (p: Partner) => { setSelected(p); setMode('view'); };
  const openAdd = () => { setForm(EMPTY); setSelected(null); setMode('add'); };
  const openEdit = (p: Partner) => { setForm({ name: p.name, description: p.description, logo_url: p.logo_url, website_url: p.website_url, category: p.category, active: p.active, sort_order: p.sort_order }); setSelected(p); setMode('edit'); };
  const close = () => { setMode(null); setSelected(null); };

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (mode === 'edit' && selected) { const { error: err } = await supabase.from('partners').update({ ...form, updated_at: new Date().toISOString() }).eq('id', selected.id); if (err) throw err; showToast('success', 'Partner updated!'); }
      else { const { error: err } = await supabase.from('partners').insert(form); if (err) throw err; showToast('success', 'Partner created!'); }
      setSaving(false); close(); load();
    } catch (e: any) { setSaving(false); showToast('error', e.message || 'Failed to save partner.'); }
  };

  const doDelete = async () => {
    if (!deleteId) return;
    try { const { error: err } = await supabase.from('partners').update({ deleted_at: new Date().toISOString() }).eq('id', deleteId); if (err) throw err; showToast('success', 'Partner moved to trash.'); setDeleteId(null); close(); load(); }
    catch (e: any) { showToast('error', e.message || 'Failed to delete.'); setDeleteId(null); }
  };
  const filtered = items.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase()));

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
          <h1 className="text-xl font-bold text-[#0f172a]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Partners</h1>
          <p className="text-[11px] text-[#64748B] mt-0.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{items.length} partners — click a row to view</p>
        </div>
        <button onClick={openAdd} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 text-white text-[12px] font-bold shadow-sm hover:shadow-md transition-all" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          <Plus className="w-3.5 h-3.5" /> Add Partner
        </button>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-50">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search partners…" className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-[12px] focus:outline-none focus:border-[#0A6070] bg-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-slate-50 bg-slate-50/60">
              {['Name', 'Category', 'Website', 'Status', 'Actions'].map(h => <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/60 transition-colors cursor-pointer group" onClick={() => openView(p)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {p.logo_url ? <img src={p.logo_url} alt="" className="w-7 h-7 rounded-lg object-contain border border-slate-100 flex-shrink-0" /> : <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-400 to-amber-400 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">{p.name.charAt(0)}</div>}
                      <span className="text-[12px] font-semibold text-[#1e293b]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${CAT_CLR[p.category] ?? 'bg-slate-100 text-slate-600'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{p.category}</span></td>
                  <td className="px-4 py-3">{p.website_url ? <a href={p.website_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="flex items-center gap-1 text-[11px] text-[#0A6070] hover:underline" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}><ExternalLink className="w-3 h-3" /> Visit</a> : <span className="text-[11px] text-[#94A3B8]">—</span>}</td>
                  <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${p.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{p.active ? 'Active' : 'Inactive'}</span></td>
                  <td className="px-4 py-3"><div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-slate-100 text-[#94A3B8] hover:text-orange-500"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setDeleteId(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-[#94A3B8] hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-[12px] text-[#94A3B8]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>No partners found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {mode === 'view' && selected && (
        <Drawer title={selected.name} subtitle={selected.category} onClose={close} width="md"
          footer={<div className="flex items-center justify-between">
            <button onClick={() => setDeleteId(selected.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-100 text-[12px] font-bold text-red-500 hover:bg-red-50 transition-colors" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}><Trash2 className="w-3.5 h-3.5" /> Delete</button>
            <button onClick={() => openEdit(selected)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 text-white text-[12px] font-bold shadow-sm" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}><Pencil className="w-3.5 h-3.5" /> Edit</button>
          </div>}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {selected.logo_url ? <img src={selected.logo_url} alt="" className="w-16 h-16 rounded-2xl object-contain border border-slate-100 p-1 flex-shrink-0" /> : <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-400 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">{selected.name.charAt(0)}</div>}
              <div>
                <p className="text-[15px] font-bold text-[#0f172a]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.name}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${CAT_CLR[selected.category] ?? 'bg-slate-100 text-slate-600'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.category}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${selected.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.active ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
            </div>
            {selected.website_url && <a href={selected.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[12px] text-[#0A6070] hover:underline" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}><Globe className="w-3.5 h-3.5" />{selected.website_url}</a>}
            {selected.description && <div className="space-y-1"><p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>About</p><p className="text-[13px] text-[#334155] leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.description}</p></div>}
          </div>
        </Drawer>
      )}

      {(mode === 'add' || mode === 'edit') && (
        <Drawer title={mode === 'add' ? 'Add Partner' : 'Edit Partner'} subtitle={mode === 'edit' ? selected?.name : undefined} onClose={close} width="md"
          footer={<div className="flex gap-2 justify-end">
            <button onClick={close} className="px-4 py-2 rounded-xl border border-slate-200 text-[12px] font-bold text-[#64748B] hover:bg-slate-50" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Cancel</button>
            <button onClick={save} disabled={saving || !form.name.trim()} className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 text-white text-[12px] font-bold disabled:opacity-50 shadow-sm" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{saving ? 'Saving…' : mode === 'add' ? 'Add Partner' : 'Save Changes'}</button>
          </div>}
        >
          <div className="space-y-4">
            <div><Lbl t="Name *" /><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inp} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
            <div><Lbl t="Category" /><select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={inp} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
            <div><Lbl t="Description" /><textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className={inp + ' resize-none'} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
            <ImageUploadField label="Logo" value={form.logo_url} onChange={url => setForm({ ...form, logo_url: url })} folder="voice-of-preemies/partners" />
            <div><Lbl t="Website URL" /><input value={form.website_url} onChange={e => setForm({ ...form, website_url: e.target.value })} placeholder="https://…" className={inp} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
            <div><Lbl t="Sort Order" /><input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })} className={inp} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} className="w-4 h-4 rounded accent-orange-500" /><span className="text-[12px] text-[#334155]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Active partner</span></label>
          </div>
        </Drawer>
      )}

      {deleteId && <ConfirmDialog message="Move this partner to Trash? You can restore it later." onConfirm={doDelete} onCancel={() => setDeleteId(null)} confirmLabel="Move to Trash" />}
    </div>
  );
}
