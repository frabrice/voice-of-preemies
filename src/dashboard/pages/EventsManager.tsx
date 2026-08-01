import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import Drawer from '../components/Drawer';
import ConfirmDialog from '../components/ConfirmDialog';
import { Plus, Pencil, Trash2, Search, Calendar, MapPin, ExternalLink, Star } from 'lucide-react';

interface Event { id: string; title: string; description: string; date: string; end_date: string; location: string; type: string; image_url: string; registration_url: string; published: boolean; featured: boolean; }
type Form = Omit<Event, 'id'>;
type Mode = 'view' | 'add' | 'edit';

const TYPES = ['Conference', 'Workshop', 'Webinar', 'Fundraiser', 'Community', 'Awareness', 'Training'];
const EMPTY: Form = { title: '', description: '', date: new Date().toISOString().split('T')[0], end_date: '', location: '', type: 'Community', image_url: '', registration_url: '', published: false, featured: false };
const TYPE_CLR: Record<string, string> = { Conference: 'bg-blue-100 text-blue-700', Workshop: 'bg-amber-100 text-amber-700', Webinar: 'bg-cyan-100 text-cyan-700', Fundraiser: 'bg-rose-100 text-rose-700', Community: 'bg-emerald-100 text-emerald-700', Awareness: 'bg-orange-100 text-orange-700', Training: 'bg-slate-100 text-slate-600' };
const inp = 'w-full px-3 py-2.5 border border-slate-200 rounded-xl text-[13px] text-[#0f172a] focus:outline-none focus:border-[#0A6070] focus:ring-2 focus:ring-[#0A6070]/10 transition-all bg-white';
const Lbl = ({ t }: { t: string }) => <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-1.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{t}</label>;

export default function EventsManager() {
  const [items, setItems] = useState<Event[]>([]);
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<Mode | null>(null);
  const [selected, setSelected] = useState<Event | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => { const { data } = await supabase.from('events').select('*').is('deleted_at', null).order('date', { ascending: false }); setItems(data ?? []); };
  useEffect(() => { load(); }, []);

  const openView = (e: Event) => { setSelected(e); setMode('view'); };
  const openAdd = () => { setForm(EMPTY); setSelected(null); setMode('add'); };
  const openEdit = (e: Event) => { setForm({ title: e.title, description: e.description, date: e.date, end_date: e.end_date ?? '', location: e.location, type: e.type, image_url: e.image_url, registration_url: e.registration_url ?? '', published: e.published, featured: e.featured }); setSelected(e); setMode('edit'); };
  const close = () => { setMode(null); setSelected(null); };

  const save = async () => {
    if (!form.title.trim() || !form.date) return;
    setSaving(true);
    const payload = { ...form, end_date: form.end_date || null, registration_url: form.registration_url || null };
    if (mode === 'edit' && selected) await supabase.from('events').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', selected.id);
    else await supabase.from('events').insert(payload);
    setSaving(false); close(); load();
  };

  const togglePublish = async () => {
    if (!selected) return;
    await supabase.from('events').update({ published: !selected.published }).eq('id', selected.id);
    const updated = { ...selected, published: !selected.published };
    setSelected(updated);
    load();
  };

  const doDelete = async () => { if (!deleteId) return; await supabase.from('events').update({ deleted_at: new Date().toISOString() }).eq('id', deleteId); setDeleteId(null); close(); load(); };

  const isPast = (date: string) => new Date(date) < new Date();
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const filtered = items.filter(e => e.title.toLowerCase().includes(search.toLowerCase()) || e.type.toLowerCase().includes(search.toLowerCase()) || (e.location ?? '').toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold text-[#0f172a]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Events</h1>
          <p className="text-[11px] text-[#64748B] mt-0.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{items.length} events — click a row to view</p>
        </div>
        <button onClick={openAdd} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-400 text-white text-[12px] font-bold shadow-sm hover:shadow-md transition-all" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          <Plus className="w-3.5 h-3.5" /> Add Event
        </button>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-50">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search events…" className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-[12px] focus:outline-none focus:border-[#0A6070] bg-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-slate-50 bg-slate-50/60">
              {['Title', 'Type', 'Date', 'Location', 'Status', 'Actions'].map(h => <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{h}</th>)}
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
                  <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${e.published ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{e.published ? 'Live' : 'Draft'}</span></td>
                  <td className="px-4 py-3"><div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={ev => ev.stopPropagation()}>
                    <button onClick={() => openEdit(e)} className="p-1.5 rounded-lg hover:bg-slate-100 text-[#94A3B8] hover:text-cyan-600"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setDeleteId(e.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-[#94A3B8] hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div></td>
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
            <button onClick={() => setDeleteId(selected.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-100 text-[12px] font-bold text-red-500 hover:bg-red-50 transition-colors" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}><Trash2 className="w-3.5 h-3.5" /> Delete</button>
            <div className="flex items-center gap-2">
              <button onClick={togglePublish} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-bold border transition-colors ${selected.published ? 'border-amber-200 text-amber-600 hover:bg-amber-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.published ? 'Unpublish' : 'Publish'}</button>
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
              <div><Lbl t="Type" /><select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className={inp} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
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
