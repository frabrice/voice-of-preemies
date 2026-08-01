import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import Drawer from '../components/Drawer';
import ConfirmDialog from '../components/ConfirmDialog';
import { Plus, Pencil, Trash2, Search, CheckCircle, ExternalLink, Link as LinkIcon } from 'lucide-react';
import { ImageUploadField } from '../components/UploadField';

interface Program {
  id: string;
  slug: string;
  title: string;
  tag: string;
  tagline: string;
  description: string;
  long_description: string;
  image_url: string;
  icon_name: string;
  services: string[];
  who_for: string;
  how_to_access: string;
  published: boolean;
  sort_order: number;
}

type Form = Omit<Program, 'id'>;
type Mode = 'view' | 'add' | 'edit';

const TAGS = ['Core Program', 'Hospital Program', 'Education', 'Community', 'Advocacy', 'Specialized Support'];
const ICONS = ['Heart', 'Building2', 'Baby', 'Coffee', 'Users', 'Globe', 'HandHeart', 'BookOpen', 'Shield'];
const EMPTY: Form = { slug: '', title: '', tag: 'Core Program', tagline: '', description: '', long_description: '', image_url: '', icon_name: 'Heart', services: [], who_for: '', how_to_access: '', published: true, sort_order: 0 };
const TAG_CLR: Record<string, string> = { 'Core Program': 'bg-teal-100 text-teal-700', 'Hospital Program': 'bg-blue-100 text-blue-700', Education: 'bg-cyan-100 text-cyan-700', Community: 'bg-emerald-100 text-emerald-700', Advocacy: 'bg-rose-100 text-rose-700', 'Specialized Support': 'bg-violet-100 text-violet-700' };
const inp = 'w-full px-3 py-2.5 border border-slate-200 rounded-xl text-[13px] text-[#0f172a] focus:outline-none focus:border-[#0A6070] focus:ring-2 focus:ring-[#0A6070]/10 transition-all bg-white';
const Lbl = ({ t }: { t: string }) => <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-1.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{t}</label>;

function toSlug(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export default function ProgramsManager() {
  const [items, setItems] = useState<Program[]>([]);
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<Mode | null>(null);
  const [selected, setSelected] = useState<Program | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [servicesText, setServicesText] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'error' | 'success'; msg: string } | null>(null);

  const showToast = (type: 'error' | 'success', msg: string) => { setToast({ type, msg }); setTimeout(() => setToast(null), 5000); };

  const load = async () => {
    const { data } = await supabase.from('programs').select('*').is('deleted_at', null).order('sort_order');
    setItems((data ?? []).map((p: Program) => ({ ...p, services: Array.isArray(p.services) ? p.services : [] })));
  };
  useEffect(() => { load(); }, []);

  const openView = (p: Program) => { setSelected(p); setMode('view'); };
  const openAdd = () => { setForm(EMPTY); setServicesText(''); setSelected(null); setMode('add'); };
  const openEdit = (p: Program) => {
    setForm({
      slug: p.slug, title: p.title, tag: p.tag, tagline: p.tagline || '', description: p.description,
      long_description: p.long_description || '', image_url: p.image_url, icon_name: p.icon_name || 'Heart',
      services: p.services, who_for: p.who_for, how_to_access: p.how_to_access, published: p.published, sort_order: p.sort_order,
    });
    setServicesText(p.services.join('\n'));
    setSelected(p);
    setMode('edit');
  };
  const close = () => { setMode(null); setSelected(null); };

  const save = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const services = servicesText.split('\n').map(s => s.trim()).filter(Boolean);
    const slug = form.slug.trim() || toSlug(form.title);
    const payload = { ...form, slug, services };
    try {
      if (mode === 'edit' && selected) {
        const { error: err } = await supabase.from('programs').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', selected.id);
        if (err) throw err;
        showToast('success', 'Program updated successfully!');
      } else {
        const { error: err } = await supabase.from('programs').insert(payload);
        if (err) throw err;
        showToast('success', 'Program created successfully!');
      }
      setSaving(false); close(); load();
    } catch (e: any) {
      setSaving(false);
      const msg = e.message || 'Failed to save program.';
      showToast('error', msg.includes('duplicate') || msg.includes('unique') ? `A program with slug "${slug}" already exists. Try a different title or slug.` : msg);
    }
  };

  const doDelete = async () => {
    if (!deleteId) return;
    try {
      const { error: err } = await supabase.from('programs').update({ deleted_at: new Date().toISOString() }).eq('id', deleteId);
      if (err) throw err;
      showToast('success', 'Program moved to trash.');
      setDeleteId(null); close(); load();
    } catch (e: any) {
      showToast('error', e.message || 'Failed to delete program.');
      setDeleteId(null);
    }
  };

  const filtered = items.filter(p => p.title.toLowerCase().includes(search.toLowerCase()));

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
          <h1 className="text-xl font-bold text-[#0f172a]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Programs</h1>
          <p className="text-[11px] text-[#64748B] mt-0.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{items.length} programs — click a row to view</p>
        </div>
        <button onClick={openAdd} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-400 text-white text-[12px] font-bold shadow-sm hover:shadow-md transition-all" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          <Plus className="w-3.5 h-3.5" /> Add Program
        </button>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-50">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search programs…" className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-[12px] focus:outline-none focus:border-[#0A6070] bg-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-slate-50 bg-slate-50/60">
              {['#', 'Title', 'Slug', 'Tag', 'Services', 'Status', 'Actions'].map(h => <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/60 transition-colors cursor-pointer group" onClick={() => openView(p)}>
                  <td className="px-4 py-3 text-[11px] text-[#94A3B8]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{p.sort_order}</td>
                  <td className="px-4 py-3 text-[12px] font-semibold text-[#1e293b]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{p.title}</td>
                  <td className="px-4 py-3 text-[11px] text-[#94A3B8] font-mono">{p.slug}</td>
                  <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${TAG_CLR[p.tag] ?? 'bg-slate-100 text-slate-600'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{p.tag}</span></td>
                  <td className="px-4 py-3 text-[11px] text-[#64748B]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{p.services.length} items</td>
                  <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${p.published ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{p.published ? 'Live' : 'Hidden'}</span></td>
                  <td className="px-4 py-3"><div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-slate-100 text-[#94A3B8] hover:text-rose-500"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setDeleteId(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-[#94A3B8] hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-[12px] text-[#94A3B8]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>No programs found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {mode === 'view' && selected && (
        <Drawer title={selected.title} subtitle={`${selected.tag} · ${selected.services.length} services`} onClose={close} width="lg"
          footer={<div className="flex items-center justify-between">
            <button onClick={() => setDeleteId(selected.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-100 text-[12px] font-bold text-red-500 hover:bg-red-50 transition-colors" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}><Trash2 className="w-3.5 h-3.5" /> Delete</button>
            <button onClick={() => openEdit(selected)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-400 text-white text-[12px] font-bold shadow-sm" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}><Pencil className="w-3.5 h-3.5" /> Edit</button>
          </div>}
        >
          <div className="space-y-4">
            {selected.image_url && <img src={selected.image_url} alt="" className="w-full h-40 object-cover rounded-xl" />}
            <div className="flex flex-wrap gap-2">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${TAG_CLR[selected.tag] ?? 'bg-slate-100 text-slate-600'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.tag}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${selected.published ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.published ? 'Published' : 'Hidden'}</span>
            </div>
            {selected.slug && (
              <div className="flex items-center gap-1.5 text-[11px] text-[#64748B]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                <LinkIcon className="w-3 h-3" /> /programs/{selected.slug}
              </div>
            )}
            {selected.tagline && (
              <p className="text-[13px] italic text-[#0A6070]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>"{selected.tagline}"</p>
            )}
            {selected.description && <p className="text-[13px] text-[#334155] leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.description}</p>}
            {selected.services.length > 0 && <div><p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Services</p><ul className="space-y-1">{selected.services.map((s, i) => <li key={i} className="flex items-start gap-2 text-[12px] text-[#334155]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}><CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />{s}</li>)}</ul></div>}
            {selected.who_for && <div><p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Who It's For</p><p className="text-[13px] text-[#334155]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.who_for}</p></div>}
            {selected.how_to_access && <div><p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>How to Access</p><p className="text-[13px] text-[#334155]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.how_to_access}</p></div>}
            {selected.image_url && <a href={selected.image_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-[#0A6070] hover:underline" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}><ExternalLink className="w-3 h-3" /> View image</a>}
          </div>
        </Drawer>
      )}

      {(mode === 'add' || mode === 'edit') && (
        <Drawer title={mode === 'add' ? 'Add Program' : 'Edit Program'} subtitle={mode === 'edit' ? selected?.title : undefined} onClose={close} width="lg"
          footer={<div className="flex gap-2 justify-end">
            <button onClick={close} className="px-4 py-2 rounded-xl border border-slate-200 text-[12px] font-bold text-[#64748B] hover:bg-slate-50" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Cancel</button>
            <button onClick={save} disabled={saving || !form.title.trim()} className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-400 text-white text-[12px] font-bold disabled:opacity-50 shadow-sm" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{saving ? 'Saving…' : mode === 'add' ? 'Add Program' : 'Save Changes'}</button>
          </div>}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Lbl t="Title *" /><input value={form.title} onChange={e => { setForm({ ...form, title: e.target.value }); if (mode === 'add') setForm(f => ({ ...f, slug: toSlug(e.target.value) })); }} className={inp} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
              <div><Lbl t="Slug" /><input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="auto-generated-from-title" className={inp + ' font-mono'} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Lbl t="Tag" /><select value={form.tag} onChange={e => setForm({ ...form, tag: e.target.value })} className={inp} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{TAGS.map(t => <option key={t}>{t}</option>)}</select></div>
              <div><Lbl t="Icon" /><select value={form.icon_name} onChange={e => setForm({ ...form, icon_name: e.target.value })} className={inp} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{ICONS.map(i => <option key={i}>{i}</option>)}</select></div>
            </div>
            <div><Lbl t="Tagline" /><input value={form.tagline} onChange={e => setForm({ ...form, tagline: e.target.value })} placeholder="e.g. Because parents need care too." className={inp} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
            <div><Lbl t="Short Description" /><textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className={inp + ' resize-none'} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
            <div><Lbl t="Long Description (detail page)" /><textarea rows={6} value={form.long_description} onChange={e => setForm({ ...form, long_description: e.target.value })} placeholder="Extended content shown on the individual program page…" className={inp + ' resize-none'} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
            <ImageUploadField label="Image" value={form.image_url} onChange={url => setForm({ ...form, image_url: url })} folder="voice-of-preemies/programs" />
            <div><Lbl t="Services (one per line)" /><textarea rows={5} value={servicesText} onChange={e => setServicesText(e.target.value)} placeholder="One service per line…" className={inp + ' resize-none'} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Lbl t="Who It's For" /><input value={form.who_for} onChange={e => setForm({ ...form, who_for: e.target.value })} className={inp} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
              <div><Lbl t="Sort Order" /><input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })} className={inp} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
            </div>
            <div><Lbl t="How to Access" /><input value={form.how_to_access} onChange={e => setForm({ ...form, how_to_access: e.target.value })} className={inp} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.published} onChange={e => setForm({ ...form, published: e.target.checked })} className="w-4 h-4 rounded accent-rose-500" /><span className="text-[12px] text-[#334155]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Published</span></label>
          </div>
        </Drawer>
      )}

      {deleteId && <ConfirmDialog message="Move this program to Trash? You can restore it later." onConfirm={doDelete} onCancel={() => setDeleteId(null)} confirmLabel="Move to Trash" />}
    </div>
  );
}
