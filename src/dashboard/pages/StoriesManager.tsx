import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import Drawer from '../components/Drawer';
import ConfirmDialog from '../components/ConfirmDialog';
import { Plus, Pencil, Trash2, Search, Eye, EyeOff, Star, MapPin, ExternalLink, Send } from 'lucide-react';
import { notifyPublication } from '../components/shared';
import { ImageUploadField } from '../components/UploadField';

interface Story { id: string; slug: string; name: string; baby_info: string; tag: string; location: string; year: number; excerpt: string; full_story: string; image_url: string; published: boolean; featured: boolean; }
type Form = Omit<Story, 'id'>;
type Mode = 'view' | 'add' | 'edit';

const TAGS = ['Parent Story', 'Family Story', "Father's Story", 'Healthcare Story', 'Grief Story'];
const EMPTY: Form = { slug: '', name: '', baby_info: '', tag: 'Parent Story', location: 'Kigali', year: new Date().getFullYear(), excerpt: '', full_story: '', image_url: '', published: false, featured: false };
const TAG_CLR: Record<string, string> = { 'Parent Story': 'bg-rose-100 text-rose-700', 'Family Story': 'bg-amber-100 text-amber-700', "Father's Story": 'bg-blue-100 text-blue-700', 'Healthcare Story': 'bg-cyan-100 text-cyan-700', 'Grief Story': 'bg-slate-100 text-slate-600' };
const inp = 'w-full px-3 py-2.5 border border-slate-200 rounded-xl text-[13px] text-[#0f172a] focus:outline-none focus:border-[#0A6070] focus:ring-2 focus:ring-[#0A6070]/10 transition-all bg-white';
const Lbl = ({ t }: { t: string }) => <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-1.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{t}</label>;

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export default function StoriesManager() {
  const [items, setItems] = useState<Story[]>([]);
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<Mode | null>(null);
  const [selected, setSelected] = useState<Story | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'error' | 'success'; msg: string } | null>(null);

  const showToast = (type: 'error' | 'success', msg: string) => { setToast({ type, msg }); setTimeout(() => setToast(null), 5000); };

  const load = async () => { const { data } = await supabase.from('stories').select('*').is('deleted_at', null).order('year', { ascending: false }); setItems(data ?? []); };
  useEffect(() => { load(); }, []);

  const openView = (s: Story) => { setSelected(s); setMode('view'); };
  const openAdd = () => { setForm(EMPTY); setSelected(null); setMode('add'); };
  const openEdit = (s: Story) => { setForm({ slug: s.slug, name: s.name, baby_info: s.baby_info, tag: s.tag, location: s.location, year: s.year, excerpt: s.excerpt, full_story: s.full_story, image_url: s.image_url, published: s.published, featured: s.featured }); setSelected(s); setMode('edit'); };
  const close = () => { setMode(null); setSelected(null); };

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const wasPublished = mode === 'edit' && selected ? selected.published : false;
    const slug = form.slug.trim() || toSlug(form.name);
    const payload = { ...form, slug };
    try {
      if (mode === 'edit' && selected) {
        const { error: err } = await supabase.from('stories').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', selected.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('stories').insert(payload);
        if (err) throw err;
      }
      if (form.published && !wasPublished) {
        notifyPublication({ type: 'story', title: form.name, excerpt: form.excerpt, path: `/stories/${slug}` });
      }
      setSaving(false); close(); load();
      showToast('success', mode === 'edit' ? 'Story updated successfully.' : 'Story added successfully.');
    } catch (err) {
      setSaving(false);
      const msg = err instanceof Error ? err.message : 'Failed to save story.';
      showToast('error', msg.includes('duplicate') || msg.includes('unique') ? `A story with slug "${slug}" already exists. Try a different name or slug.` : msg);
    }
  };

  const togglePublish = async (s: Story, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const nowPublished = !s.published;
      const { error: err } = await supabase.from('stories').update({ published: nowPublished }).eq('id', s.id);
      if (err) throw err;
      if (nowPublished) notifyPublication({ type: 'story', title: s.name, excerpt: s.excerpt, path: `/stories/${s.slug}` });
      load();
      if (selected?.id === s.id) setSelected({ ...s, published: nowPublished });
      showToast('success', s.published ? 'Story unpublished.' : 'Story published.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to update story.');
    }
  };

  const doDelete = async () => {
    if (!deleteId) return;
    try {
      const { error: err } = await supabase.from('stories').update({ deleted_at: new Date().toISOString() }).eq('id', deleteId);
      if (err) throw err;
      setDeleteId(null); close(); load();
      showToast('success', 'Story moved to trash.');
    } catch (err) {
      setDeleteId(null);
      showToast('error', err instanceof Error ? err.message : 'Failed to delete story.');
    }
  };

  const filtered = items.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.tag.toLowerCase().includes(search.toLowerCase()));

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
          <h1 className="text-xl font-bold text-[#0f172a]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Stories</h1>
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
                  <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${TAG_CLR[s.tag] ?? 'bg-slate-100 text-slate-600'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{s.tag}</span></td>
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
              {selected.published && (
                <button
                  onClick={() => { notifyPublication({ type: 'story', title: selected.name, excerpt: selected.excerpt, path: `/stories/${selected.slug}` }); showToast('success', 'Notification sent to subscribers.'); }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-cyan-200 text-cyan-700 text-[12px] font-bold hover:bg-cyan-50 transition-colors"
                  style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                ><Send className="w-3.5 h-3.5" /> Notify Subscribers</button>
              )}
              <button onClick={() => togglePublish(selected)} className={`px-3 py-2 rounded-xl text-[12px] font-bold border transition-colors ${selected.published ? 'border-amber-200 text-amber-600 hover:bg-amber-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.published ? 'Unpublish' : 'Publish'}</button>
              <button onClick={() => openEdit(selected)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-white text-[12px] font-bold shadow-sm hover:shadow-md transition-all" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}><Pencil className="w-3.5 h-3.5" /> Edit Story</button>
            </div>
          </div>}
        >
          <div className="space-y-4">
            {selected.image_url && <img src={selected.image_url} alt="" className="w-full h-44 object-cover rounded-xl" />}
            <div className="flex flex-wrap gap-2">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${TAG_CLR[selected.tag] ?? 'bg-slate-100 text-slate-600'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.tag}</span>
              {selected.featured && <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-700" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}><Star className="w-2.5 h-2.5" /> Featured</span>}
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${selected.published ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.published ? 'Published' : 'Draft'}</span>
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-600" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}><MapPin className="w-2.5 h-2.5" /> {selected.location}, {selected.year}</span>
            </div>
            {selected.baby_info && <div className="p-3 bg-slate-50 rounded-xl"><p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Baby Info</p><p className="text-[13px] text-[#334155] font-medium" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.baby_info}</p></div>}
            {selected.excerpt && <div className="p-3 bg-slate-50 rounded-xl border-l-4 border-amber-400"><p className="text-[12px] text-[#334155] italic leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.excerpt}</p></div>}
            {selected.full_story && <div className="space-y-1"><p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Full Story</p><p className="text-[13px] text-[#334155] leading-relaxed whitespace-pre-wrap" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.full_story}</p></div>}
            {selected.image_url && <a href={selected.image_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-[#0A6070] hover:underline" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}><ExternalLink className="w-3 h-3" /> View image</a>}
            {selected.published && <a href={`/stories/${selected.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-[#0A6070] hover:underline ml-4" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}><ExternalLink className="w-3 h-3" /> View live page</a>}
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
              <div><Lbl t="Name *" /><input value={form.name} onChange={e => { setForm({ ...form, name: e.target.value }); if (mode === 'add') setForm(f => ({ ...f, slug: toSlug(e.target.value) })); }} placeholder="Parent name" className={inp} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
              <div><Lbl t="Tag" /><select value={form.tag} onChange={e => setForm({ ...form, tag: e.target.value })} className={inp} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{TAGS.map(t => <option key={t}>{t}</option>)}</select></div>
            </div>
            <div><Lbl t="Slug" /><input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="auto-generated-from-name" className={inp + ' font-mono'} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
            <div><Lbl t="Baby Info" /><input value={form.baby_info} onChange={e => setForm({ ...form, baby_info: e.target.value })} placeholder="e.g. Emmanuel, born at 28 weeks" className={inp} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Lbl t="Location" /><input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className={inp} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
              <div><Lbl t="Year" /><input type="number" value={form.year} onChange={e => setForm({ ...form, year: Number(e.target.value) })} className={inp} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
            </div>
            <ImageUploadField label="Image" value={form.image_url} onChange={url => setForm({ ...form, image_url: url })} folder="voice-of-preemies/stories" />
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
