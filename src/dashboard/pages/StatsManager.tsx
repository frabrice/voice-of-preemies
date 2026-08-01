import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import Drawer from '../components/Drawer';
import ConfirmDialog from '../components/ConfirmDialog';
import { Plus, Pencil, Trash2, GripVertical, Hash } from 'lucide-react';

interface Stat { id: string; label: string; value: string; icon: string; sort_order: number; }
type Form = Omit<Stat, 'id'>;
type Mode = 'add' | 'edit' | null;

const ICONS = ['Heart', 'Building2', 'Headphones', 'Globe', 'Users', 'TrendingUp', 'Star', 'Award'];
const EMPTY: Form = { label: '', value: '', icon: 'Heart', sort_order: 0 };
const inp = 'w-full px-3 py-2.5 border border-slate-200 rounded-xl text-[13px] text-[#0f172a] focus:outline-none focus:border-[#0A6070] focus:ring-2 focus:ring-[#0A6070]/10 transition-all bg-white';
const Lbl = ({ t }: { t: string }) => <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-1.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{t}</label>;

export default function StatsManager() {
  const [items, setItems] = useState<Stat[]>([]);
  const [mode, setMode] = useState<Mode>(null);
  const [selected, setSelected] = useState<Stat | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'error' | 'success'; msg: string } | null>(null);
  const showToast = (type: 'error' | 'success', msg: string) => { setToast({ type, msg }); setTimeout(() => setToast(null), 5000); };

  const load = async () => { const { data } = await supabase.from('site_stats').select('*').is('deleted_at', null).order('sort_order'); setItems(data ?? []); };
  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm({ ...EMPTY, sort_order: items.length }); setSelected(null); setMode('add'); };
  const openEdit = (s: Stat) => { setForm({ label: s.label, value: s.value, icon: s.icon, sort_order: s.sort_order }); setSelected(s); setMode('edit'); };
  const close = () => { setMode(null); setSelected(null); };

  const save = async () => {
    if (!form.value.trim() || !form.label.trim()) return;
    setSaving(true);
    try {
      if (mode === 'edit' && selected) { const { error: err } = await supabase.from('site_stats').update({ ...form, updated_at: new Date().toISOString() }).eq('id', selected.id); if (err) throw err; showToast('success', 'Stat updated!'); }
      else { const { error: err } = await supabase.from('site_stats').insert(form); if (err) throw err; showToast('success', 'Stat created!'); }
      setSaving(false); close(); load();
    } catch (e: any) { setSaving(false); showToast('error', e.message || 'Failed to save stat.'); }
  };

  const doDelete = async () => {
    if (!deleteId) return;
    try { const { error: err } = await supabase.from('site_stats').update({ deleted_at: new Date().toISOString() }).eq('id', deleteId); if (err) throw err; showToast('success', 'Stat moved to trash.'); setDeleteId(null); load(); }
    catch (e: any) { showToast('error', e.message || 'Failed to delete.'); setDeleteId(null); }
  };

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
          <h1 className="text-xl font-bold text-[#0f172a]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Site Statistics</h1>
          <p className="text-[11px] text-[#64748B] mt-0.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>These stats appear on the public homepage hero section</p>
        </div>
        <button onClick={openAdd} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-pink-400 text-white text-[12px] font-bold shadow-sm hover:shadow-md transition-all" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          <Plus className="w-3.5 h-3.5" /> Add Stat
        </button>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-50">
          {items.map(s => (
            <div key={s.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/60 transition-colors group cursor-pointer" onClick={() => openEdit(s)}>
              <GripVertical className="w-3.5 h-3.5 text-[#94A3B8] flex-shrink-0" />
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-fuchsia-500/10 to-pink-400/10 flex items-center justify-center flex-shrink-0">
                <Hash className="w-4 h-4 text-fuchsia-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold text-[#0f172a]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>{s.value}</p>
                <p className="text-[11px] text-[#64748B]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{s.label}</p>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                <span className="text-[10px] text-[#94A3B8] mr-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>#{s.sort_order}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-bold mr-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{s.icon}</span>
                <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-slate-100 text-[#94A3B8] hover:text-fuchsia-500"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => setDeleteId(s.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-[#94A3B8] hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
          {items.length === 0 && <p className="px-5 py-10 text-center text-[12px] text-[#94A3B8]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>No stats yet. Add your first stat.</p>}
        </div>
      </div>

      <div className="mt-3 px-4 py-3 bg-slate-50 rounded-xl border border-slate-100">
        <p className="text-[11px] text-[#64748B]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          <span className="font-bold text-[#334155]">Available icons:</span> {ICONS.join(', ')}
        </p>
      </div>

      {(mode === 'add' || mode === 'edit') && (
        <Drawer title={mode === 'add' ? 'Add Stat' : 'Edit Stat'} subtitle={mode === 'edit' ? selected?.label : undefined} onClose={close} width="sm"
          footer={<div className="flex gap-2 justify-end">
            {mode === 'edit' && selected && <button onClick={() => { setDeleteId(selected.id); close(); }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-100 text-[12px] font-bold text-red-500 hover:bg-red-50 transition-colors mr-auto" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}><Trash2 className="w-3.5 h-3.5" /> Delete</button>}
            <button onClick={close} className="px-4 py-2 rounded-xl border border-slate-200 text-[12px] font-bold text-[#64748B] hover:bg-slate-50" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Cancel</button>
            <button onClick={save} disabled={saving || !form.value.trim() || !form.label.trim()} className="px-5 py-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-pink-400 text-white text-[12px] font-bold disabled:opacity-50 shadow-sm" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{saving ? 'Saving…' : mode === 'add' ? 'Add Stat' : 'Save Changes'}</button>
          </div>}
        >
          <div className="space-y-4">
            <div><Lbl t="Value *" /><input value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} placeholder="e.g. 5,000+ or 98%" className={inp} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
            <div><Lbl t="Label *" /><input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="e.g. Families Supported" className={inp} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
            <div><Lbl t="Icon" /><select value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} className={inp} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{ICONS.map(i => <option key={i}>{i}</option>)}</select></div>
            <div><Lbl t="Sort Order" /><input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })} className={inp} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
          </div>
        </Drawer>
      )}

      {deleteId && <ConfirmDialog message="Move this stat to Trash? You can restore it later." onConfirm={doDelete} onCancel={() => setDeleteId(null)} confirmLabel="Move to Trash" />}
    </div>
  );
}
