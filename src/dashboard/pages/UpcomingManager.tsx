import { useState } from 'react';
import { CalendarHeart, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { useCrud, EmptyState, inp, ta, Lbl, AddButton } from '../components/shared';

interface UpcomingHighlight { id: string; title: string; start_date: string; end_date: string | null; note: string; link_url: string; }

function fmtRange(start: string, end: string | null) {
  const s = new Date(start);
  const sMon = s.toLocaleDateString('en-US', { month: 'short' });
  if (!end || end === start) return `${sMon} ${s.getDate()}, ${s.getFullYear()}`;
  const e = new Date(end);
  const eMon = e.toLocaleDateString('en-US', { month: 'short' });
  if (sMon === eMon && s.getFullYear() === e.getFullYear()) return `${sMon} ${s.getDate()}–${e.getDate()}, ${s.getFullYear()}`;
  return `${sMon} ${s.getDate()} – ${eMon} ${e.getDate()}, ${e.getFullYear()}`;
}

export default function UpcomingManager() {
  const { items, loading, create, update, softDelete } = useCrud<UpcomingHighlight>('upcoming_highlights');
  const [editing, setEditing] = useState<Partial<UpcomingHighlight> | null>(null);
  const [showForm, setShowForm] = useState(false);

  const blank: Partial<UpcomingHighlight> = { title: '', start_date: '', end_date: '', note: '', link_url: '' };

  const save = async () => {
    if (!editing?.title?.trim() || !editing?.start_date) return;
    const row = {
      title: editing.title.trim(),
      start_date: editing.start_date,
      end_date: editing.end_date || null,
      note: editing.note ?? '',
      link_url: editing.link_url ?? '',
    };
    if (editing.id) await update(editing.id, row);
    else await create(row);
    setEditing(null);
    setShowForm(false);
  };

  const sorted = [...items].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-[#64748B]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Shown in the "Upcoming" sidebar on the public Publications page — awareness days/weeks, upcoming programs, trainings, etc. Only items that haven't fully passed are shown there.</p>
        <AddButton onClick={() => { setEditing({ ...blank }); setShowForm(true); }} label="Add Upcoming" />
      </div>

      {showForm && editing && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div><Lbl t="Title" /><input value={editing.title ?? ''} onChange={e => setEditing({ ...editing, title: e.target.value })} placeholder="e.g. World Breastfeeding Week, Expectant Mothers Program" className={inp} /></div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Lbl t="Start Date" /><input type="date" value={editing.start_date ?? ''} onChange={e => setEditing({ ...editing, start_date: e.target.value })} className={inp} /></div>
            <div><Lbl t="End Date (optional)" /><input type="date" value={editing.end_date ?? ''} onChange={e => setEditing({ ...editing, end_date: e.target.value })} className={inp} /><p className="text-[10px] text-[#94A3B8] mt-1">Leave blank for a single-day item.</p></div>
          </div>
          <div><Lbl t="Link (optional)" /><input value={editing.link_url ?? ''} onChange={e => setEditing({ ...editing, link_url: e.target.value })} placeholder="e.g. link to a related News article" className={inp} /></div>
          <div><Lbl t="Note (optional)" /><textarea value={editing.note ?? ''} onChange={e => setEditing({ ...editing, note: e.target.value })} className={ta} /></div>
          <div className="flex gap-2">
            <button onClick={save} className="px-3 py-1.5 rounded-xl bg-[#0A6070] text-white text-[11px] font-semibold">Save</button>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-[11px] font-semibold">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-[12px] text-[#94A3B8] text-center py-8">Loading...</p>
      ) : sorted.length === 0 ? (
        <EmptyState icon={CalendarHeart} message="Nothing upcoming added yet." />
      ) : (
        <div className="space-y-2">
          {sorted.map(d => (
            <div key={d.id} className="bg-white rounded-xl border border-slate-100 p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[12px] font-bold text-[#1e293b]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{d.title}</p>
                <p className="text-[10px] text-[#94A3B8]">{fmtRange(d.start_date, d.end_date)}{d.note ? ` · ${d.note}` : ''}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {d.link_url && <a href={d.link_url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#0A6070] hover:bg-slate-50"><ExternalLink className="w-3.5 h-3.5" /></a>}
                <button onClick={() => { setEditing({ ...d, end_date: d.end_date ?? '' }); setShowForm(true); }} className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#0A6070] hover:bg-slate-50"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => softDelete(d.id)} className="p-1.5 rounded-lg text-[#94A3B8] hover:text-red-500 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
