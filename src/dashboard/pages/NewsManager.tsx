import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import Drawer from '../components/Drawer';
import ConfirmDialog from '../components/ConfirmDialog';
import { Plus, Pencil, Trash2, Search, Eye, EyeOff, Star, Calendar, ExternalLink, Send } from 'lucide-react';
import { notifyPublication } from '../components/shared';
import { ImageUploadField } from '../components/UploadField';

interface Article { id: string; slug: string; title: string; excerpt: string; content: string; tag: string; date: string; image_url: string; published: boolean; featured: boolean; }
type Form = Omit<Article, 'id'>;
type Mode = 'view' | 'add' | 'edit';

const TAGS = ['Event', 'Partnership', 'Story', 'Research', 'Education', 'Advocacy', 'News'];
const EMPTY: Form = { slug: '', title: '', excerpt: '', content: '', tag: 'News', date: new Date().toISOString().split('T')[0], image_url: '', published: false, featured: false };
const TAG_CLR: Record<string, string> = { Event: 'bg-blue-100 text-blue-700', Partnership: 'bg-emerald-100 text-emerald-700', Story: 'bg-amber-100 text-amber-700', Research: 'bg-violet-100 text-violet-700', Education: 'bg-cyan-100 text-cyan-700', Advocacy: 'bg-rose-100 text-rose-700', News: 'bg-slate-100 text-slate-600' };
const inp = 'w-full px-3 py-2.5 border border-slate-200 rounded-xl text-[13px] text-[#0f172a] focus:outline-none focus:border-[#0A6070] focus:ring-2 focus:ring-[#0A6070]/10 transition-all bg-white';
const Lbl = ({ t }: { t: string }) => <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-1.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{t}</label>;

function toSlug(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export default function NewsManager() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<Mode | null>(null);
  const [selected, setSelected] = useState<Article | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'error' | 'success'; msg: string } | null>(null);

  const showToast = (type: 'error' | 'success', msg: string) => { setToast({ type, msg }); setTimeout(() => setToast(null), 5000); };

  const load = async () => { const { data } = await supabase.from('news_articles').select('*').is('deleted_at', null).order('date', { ascending: false }); setArticles(data ?? []); };
  useEffect(() => { load(); }, []);

  const openView = (a: Article) => { setSelected(a); setMode('view'); };
  const openAdd = () => { setForm(EMPTY); setSelected(null); setMode('add'); };
  const openEdit = (a: Article) => { setForm({ slug: a.slug, title: a.title, excerpt: a.excerpt, content: a.content, tag: a.tag, date: a.date, image_url: a.image_url, published: a.published, featured: a.featured }); setSelected(a); setMode('edit'); };
  const close = () => { setMode(null); setSelected(null); };

  const save = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const wasPublished = mode === 'edit' && selected ? selected.published : false;
    const slug = form.slug.trim() || toSlug(form.title);
    const payload = { ...form, slug };
    try {
      if (mode === 'edit' && selected) {
        const { error: err } = await supabase.from('news_articles').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', selected.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('news_articles').insert(payload);
        if (err) throw err;
      }
      if (form.published && !wasPublished) {
        notifyPublication({ type: 'news', title: form.title, excerpt: form.excerpt, path: `/news/${slug}` });
      }
      setSaving(false); close(); load();
      showToast('success', mode === 'edit' ? 'Article updated.' : 'Article created.');
    } catch (e) {
      setSaving(false);
      const msg = e instanceof Error ? e.message : 'Failed to save article.';
      showToast('error', msg.includes('duplicate') || msg.includes('unique') ? `An article with slug "${slug}" already exists. Try a different title or slug.` : msg);
    }
  };

  const togglePublish = async (a: Article, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const nowPublished = !a.published;
      const { error: err } = await supabase.from('news_articles').update({ published: nowPublished }).eq('id', a.id);
      if (err) throw err;
      if (nowPublished) notifyPublication({ type: 'news', title: a.title, excerpt: a.excerpt, path: `/news/${a.slug}` });
      load();
      if (selected?.id === a.id) setSelected({ ...a, published: nowPublished });
      showToast('success', a.published ? 'Article unpublished.' : 'Article published.');
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Failed to toggle publish state.');
    }
  };

  const doDelete = async () => {
    if (!deleteId) return;
    try {
      const { error: err } = await supabase.from('news_articles').update({ deleted_at: new Date().toISOString() }).eq('id', deleteId);
      if (err) throw err;
      setDeleteId(null); close(); load();
      showToast('success', 'Article moved to trash.');
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Failed to delete article.');
    }
  };

  const filtered = articles.filter(a => a.title.toLowerCase().includes(search.toLowerCase()) || a.tag.toLowerCase().includes(search.toLowerCase()));

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
          <h1 className="text-xl font-bold text-[#0f172a]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>News & Articles</h1>
          <p className="text-[11px] text-[#64748B] mt-0.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{articles.length} articles — click a row to view details</p>
        </div>
        <button onClick={openAdd} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#0A6070] to-[#1AADA0] text-white text-[12px] font-bold shadow-sm hover:shadow-md transition-all" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          <Plus className="w-3.5 h-3.5" /> Add Article
        </button>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-50">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search articles…" className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-[12px] focus:outline-none focus:border-[#0A6070] bg-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-slate-50 bg-slate-50/60">
              {['Title', 'Tag', 'Date', 'Status', 'Actions'].map(h => <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(a => (
                <tr key={a.id} className="hover:bg-slate-50/60 transition-colors cursor-pointer group" onClick={() => openView(a)}>
                  <td className="px-4 py-3"><div className="flex items-center gap-1.5">{a.featured && <Star className="w-3 h-3 text-amber-400 flex-shrink-0" />}<span className="text-[12px] font-semibold text-[#1e293b] line-clamp-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{a.title}</span></div></td>
                  <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${TAG_CLR[a.tag] ?? 'bg-slate-100 text-slate-600'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{a.tag}</span></td>
                  <td className="px-4 py-3 text-[11px] text-[#64748B] whitespace-nowrap" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{a.date}</td>
                  <td className="px-4 py-3"><button onClick={e => togglePublish(a, e)} className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${a.published ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{a.published ? 'Live' : 'Draft'}</button></td>
                  <td className="px-4 py-3"><div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <button onClick={() => togglePublish(a)} className="p-1.5 rounded-lg hover:bg-slate-100 text-[#94A3B8] hover:text-[#0A6070]" title={a.published ? 'Unpublish' : 'Publish'}>{a.published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}</button>
                    <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg hover:bg-slate-100 text-[#94A3B8] hover:text-[#0A6070]" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setDeleteId(a.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-[#94A3B8] hover:text-red-500" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-[12px] text-[#94A3B8]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>No articles found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* View drawer */}
      {mode === 'view' && selected && (
        <Drawer title={selected.title} subtitle={`${selected.tag} · ${selected.date}`} onClose={close} width="lg"
          footer={<div className="flex items-center justify-between">
            <button onClick={() => setDeleteId(selected.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-100 text-[12px] font-bold text-red-500 hover:bg-red-50 transition-colors" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}><Trash2 className="w-3.5 h-3.5" /> Delete</button>
            <div className="flex gap-2">
              {selected.published && (
                <button
                  onClick={() => { notifyPublication({ type: 'news', title: selected.title, excerpt: selected.excerpt, path: `/news/${selected.slug}` }); showToast('success', 'Notification sent to subscribers.'); }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-cyan-200 text-cyan-700 text-[12px] font-bold hover:bg-cyan-50 transition-colors"
                  style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                ><Send className="w-3.5 h-3.5" /> Notify Subscribers</button>
              )}
              <button onClick={() => togglePublish(selected)} className={`px-3 py-2 rounded-xl text-[12px] font-bold border transition-colors ${selected.published ? 'border-amber-200 text-amber-600 hover:bg-amber-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.published ? 'Unpublish' : 'Publish'}</button>
              <button onClick={() => openEdit(selected)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#0A6070] to-[#1AADA0] text-white text-[12px] font-bold shadow-sm hover:shadow-md transition-all" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}><Pencil className="w-3.5 h-3.5" /> Edit Article</button>
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
            {selected.content && <div className="space-y-1"><p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Full Content</p><p className="text-[13px] text-[#334155] leading-relaxed whitespace-pre-wrap" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.content}</p></div>}
            {selected.image_url && <a href={selected.image_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-[#0A6070] hover:underline" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}><ExternalLink className="w-3 h-3" /> View image</a>}
            {selected.published && <a href={`/news/${selected.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-[#0A6070] hover:underline ml-4" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}><ExternalLink className="w-3 h-3" /> View live page</a>}
          </div>
        </Drawer>
      )}

      {/* Add / Edit drawer */}
      {(mode === 'add' || mode === 'edit') && (
        <Drawer title={mode === 'add' ? 'Add Article' : 'Edit Article'} subtitle={mode === 'edit' ? selected?.title : 'Fill in the details below'} onClose={close} width="lg"
          footer={<div className="flex gap-2 justify-end">
            <button onClick={close} className="px-4 py-2 rounded-xl border border-slate-200 text-[12px] font-bold text-[#64748B] hover:bg-slate-50 transition-colors" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Cancel</button>
            <button onClick={save} disabled={saving || !form.title.trim()} className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#0A6070] to-[#1AADA0] text-white text-[12px] font-bold disabled:opacity-50 shadow-sm hover:shadow-md transition-all" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{saving ? 'Saving…' : mode === 'add' ? 'Create Article' : 'Save Changes'}</button>
          </div>}
        >
          <div className="space-y-4">
            <div><Lbl t="Title *" /><input value={form.title} onChange={e => { setForm({ ...form, title: e.target.value }); if (mode === 'add') setForm(f => ({ ...f, slug: toSlug(e.target.value) })); }} placeholder="Article title" className={inp} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
            <div><Lbl t="Slug" /><input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="auto-generated-from-title" className={inp + ' font-mono'} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Lbl t="Tag" /><select value={form.tag} onChange={e => setForm({ ...form, tag: e.target.value })} className={inp} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{TAGS.map(t => <option key={t}>{t}</option>)}</select></div>
              <div><Lbl t="Date" /><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className={inp} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
            </div>
            <ImageUploadField label="Image" value={form.image_url} onChange={url => setForm({ ...form, image_url: url })} folder="voice-of-preemies/news" />
            <div><Lbl t="Excerpt" /><textarea rows={2} value={form.excerpt} onChange={e => setForm({ ...form, excerpt: e.target.value })} placeholder="Short summary shown in listings…" className={inp + ' resize-none'} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
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
