import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Briefcase, Archive, Pencil, Trash2, ExternalLink, ToggleLeft, ToggleRight } from 'lucide-react';
import { useCrud, EmptyState, inp, ta, Lbl, AddButton } from '../components/shared';
import { useSiteSettings } from '../../contexts/SiteSettingsContext';
import TabBar, { type Tab } from '../components/TabBar';

interface Career {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  apply_email: string;
  posted_date: string;
  duration_days: number;
  deadline: string;
  published: boolean;
}

const font = { fontFamily: 'Plus Jakarta Sans, sans-serif' };
const serif = { fontFamily: 'Cormorant Garamond, serif' };

function toSlug(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function daysLeft(deadline: string) {
  const msPerDay = 1000 * 60 * 60 * 24;
  const today = new Date().toISOString().split('T')[0];
  return Math.round((Date.parse(`${deadline}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / msPerDay);
}

const tabs: Tab[] = [
  { id: 'active', label: 'Active', icon: Briefcase },
  { id: 'past', label: 'Past', icon: Archive },
];

export default function CareersManager() {
  const { items, loading, create, update, softDelete } = useCrud<Career>('careers');
  const { settings, refresh } = useSiteSettings();
  const [active, setActive] = useState('active');
  const [editing, setEditing] = useState<Partial<Career> | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [togglingPage, setTogglingPage] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const blank: Partial<Career> = {
    title: '', slug: '', summary: '', description: '',
    apply_email: 'voiceofpreemies@gmail.com', posted_date: today, duration_days: 45, published: true,
  };

  const activeItems = items.filter(c => c.deadline >= today);
  const pastItems = items.filter(c => c.deadline < today);
  const visible = active === 'active' ? activeItems : pastItems;

  const save = async () => {
    if (!editing?.title?.trim() || !editing?.slug?.trim()) return;
    const postedDate = editing.posted_date || today;
    const duration = editing.duration_days ?? 45;
    const row = {
      title: editing.title.trim(),
      slug: editing.slug.trim(),
      summary: editing.summary?.trim() ?? '',
      description: editing.description?.trim() ?? '',
      apply_email: editing.apply_email?.trim() || 'voiceofpreemies@gmail.com',
      posted_date: postedDate,
      duration_days: duration,
      deadline: addDays(postedDate, duration),
      published: editing.published ?? true,
    };
    if (editing.id) await update(editing.id, row);
    else await create(row);
    setEditing(null);
    setShowForm(false);
  };

  const togglePageEnabled = async () => {
    if (!settings.id) return;
    setTogglingPage(true);
    await supabase.from('site_settings').update({ careers_page_enabled: !settings.careers_page_enabled }).eq('id', settings.id);
    await refresh();
    setTogglingPage(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 bg-white rounded-2xl border border-slate-100 p-4">
        <div>
          <p className="text-[12px] font-bold text-[#1e293b]" style={font}>Careers page</p>
          <p className="text-[11px] text-[#64748B]" style={font}>
            {settings.careers_page_enabled
              ? 'The Careers page and menu link are live on the public site.'
              : 'The Careers page is fully switched off — the menu link is hidden and /careers is unavailable, even via a direct link.'}
          </p>
        </div>
        <button onClick={togglePageEnabled} disabled={togglingPage} className="flex items-center gap-2 flex-shrink-0" title="Toggle the public Careers page on/off">
          {settings.careers_page_enabled ? <ToggleRight className="w-9 h-9 text-[#0A6070]" /> : <ToggleLeft className="w-9 h-9 text-slate-300" />}
        </button>
      </div>

      <div className="flex items-center justify-between gap-2">
        <TabBar tabs={tabs} active={active} onChange={setActive} />
        <AddButton onClick={() => { setEditing({ ...blank }); setShowForm(true); }} label="Add Position" />
      </div>

      {showForm && editing && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div><Lbl t="Job Title" /><input value={editing.title ?? ''} onChange={e => { const v = e.target.value; setEditing(cur => ({ ...cur, title: v, slug: cur?.id ? cur.slug : toSlug(v) })); }} placeholder="e.g. Head of Digital" className={inp} /></div>
          <div><Lbl t="Slug" /><input value={editing.slug ?? ''} onChange={e => setEditing({ ...editing, slug: e.target.value })} placeholder="auto-generated-from-title" className={inp + ' font-mono'} /><p className="text-[10px] text-[#94A3B8] mt-1">Public URL: /careers/{editing.slug || '...'}</p></div>
          <div><Lbl t="Short Summary" /><input value={editing.summary ?? ''} onChange={e => setEditing({ ...editing, summary: e.target.value })} placeholder="One line shown on the Careers listing" className={inp} /></div>
          <div><Lbl t="Full Description" /><textarea rows={12} value={editing.description ?? ''} onChange={e => setEditing({ ...editing, description: e.target.value })} placeholder="Responsibilities, qualifications, how to apply..." className={ta} /></div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div><Lbl t="Apply Email" /><input value={editing.apply_email ?? ''} onChange={e => setEditing({ ...editing, apply_email: e.target.value })} className={inp} /></div>
            <div><Lbl t="Open For (days)" /><input type="number" min={1} value={editing.duration_days ?? 45} onChange={e => setEditing({ ...editing, duration_days: +e.target.value })} className={inp} /></div>
            <div>
              <Lbl t="Published" />
              <select value={editing.published ? 'yes' : 'no'} onChange={e => setEditing({ ...editing, published: e.target.value === 'yes' })} className={inp}>
                <option value="yes">Yes</option>
                <option value="no">No (draft)</option>
              </select>
            </div>
          </div>
          {editing.id && <p className="text-[10px] text-[#94A3B8]">Posted {editing.posted_date} · Closes {addDays(editing.posted_date || today, editing.duration_days ?? 45)}</p>}
          <div className="flex gap-2">
            <button onClick={save} className="px-3 py-1.5 rounded-xl bg-[#0A6070] text-white text-[11px] font-semibold">Save</button>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-[11px] font-semibold">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-[12px] text-[#94A3B8] text-center py-8">Loading...</p>
      ) : visible.length === 0 ? (
        <EmptyState icon={active === 'active' ? Briefcase : Archive} message={active === 'active' ? 'No open positions right now.' : 'No past positions yet.'} />
      ) : (
        <div className="space-y-2">
          {visible.map(c => {
            const left = daysLeft(c.deadline);
            return (
              <div key={c.id} className="bg-white rounded-xl border border-slate-100 p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-bold text-[#1e293b]" style={serif}>{c.title}</p>
                    {!c.published && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">Draft</span>}
                  </div>
                  <p className="text-[10px] text-[#94A3B8]">
                    {active === 'active' ? (left <= 0 ? 'Closes today' : `${left} day${left === 1 ? '' : 's'} left`) : `Closed ${c.deadline}`}
                    {c.summary ? ` · ${c.summary}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <a href={`/careers/${c.slug}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#0A6070] hover:bg-slate-50"><ExternalLink className="w-3.5 h-3.5" /></a>
                  <button onClick={() => { setEditing(c); setShowForm(true); }} className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#0A6070] hover:bg-slate-50"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => softDelete(c.id)} className="p-1.5 rounded-lg text-[#94A3B8] hover:text-red-500 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
