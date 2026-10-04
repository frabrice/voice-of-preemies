import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Stethoscope, Pencil, Trash2, EyeOff, CalendarOff, Plus, Tag, Clock } from 'lucide-react';
import { useCrud, EmptyState, inp, ta, Lbl, AddButton } from '../components/shared';
import { ImageUploadField } from '../components/UploadField';
import ConfirmDialog from '../components/ConfirmDialog';
import { WEEKDAYS, WEEKDAY_ORDER, providerLabel, initials, fmtRwf } from '../../lib/consult';

interface Specialty { id: string; name: string; position: number; created_at: string }
interface Provider {
  id: string;
  specialty_id: string | null;
  title: string;
  full_name: string;
  headline: string;
  bio: string;
  photo_url: string;
  notify_email: string | null;
  slot_minutes: number;
  booking_fee: number;
  full_fee: number;
  active: boolean;
  position: number;
  created_at: string;
}

const font = { fontFamily: 'Plus Jakarta Sans, sans-serif' };
const serif = { fontFamily: 'Cormorant Garamond, serif' };
const hhmm = (t: string) => t.slice(0, 5);

/* ─────────────────────────── Providers ─────────────────────────── */

export function ProvidersTab() {
  const { items, loading, create, update, softDelete } = useCrud<Provider>('consult_providers');
  const specs = useCrud<Specialty>('consult_specialties');
  const [editing, setEditing] = useState<Partial<Provider> | null>(null);
  const [deleting, setDeleting] = useState<Provider | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const sorted = [...items].sort((a, b) => a.position - b.position);
  const specName = (id: string | null) => specs.items.find(s => s.id === id)?.name ?? 'No specialty';

  const blank: Partial<Provider> = {
    title: '', full_name: '', headline: '', bio: '', photo_url: '', notify_email: '',
    slot_minutes: 30, booking_fee: 5000, full_fee: 10000, active: true, position: (items.length + 1),
    specialty_id: specs.items[0]?.id ?? null,
  };

  const save = async () => {
    if (!editing?.full_name?.trim()) { setFormError('Please enter the provider\'s name.'); return; }
    setSaving(true);
    setFormError('');
    const row = {
      specialty_id: editing.specialty_id || null,
      title: editing.title?.trim() ?? '',
      full_name: editing.full_name.trim(),
      headline: editing.headline?.trim() ?? '',
      bio: editing.bio?.trim() ?? '',
      photo_url: editing.photo_url ?? '',
      notify_email: editing.notify_email?.trim() || null,
      slot_minutes: Number(editing.slot_minutes) || 30,
      booking_fee: Number(editing.booking_fee) || 0,
      full_fee: Number(editing.full_fee) || 0,
      active: editing.active ?? true,
      position: Number(editing.position) || 0,
    };
    const ok = editing.id ? await update(editing.id, row) : await create(row);
    setSaving(false);
    if (!ok) { setFormError('Could not save. Please try again.'); return; }
    setEditing(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-[#64748B]" style={font}>Doctors and nurses people can book. Switch someone off to hide them from the public page without deleting them.</p>
        <AddButton onClick={() => { setEditing({ ...blank }); setFormError(''); }} label="Add Provider" />
      </div>

      {editing && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="grid sm:grid-cols-4 gap-3">
            <div><Lbl t="Title" /><input value={editing.title ?? ''} onChange={e => setEditing({ ...editing, title: e.target.value })} placeholder="Dr. / Nurse (optional)" className={inp} /></div>
            <div className="sm:col-span-3"><Lbl t="Full name" /><input value={editing.full_name ?? ''} onChange={e => setEditing({ ...editing, full_name: e.target.value })} placeholder="e.g. Jocelyne Bukeyeneza" className={inp} /></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Lbl t="Headline (shown under the name)" /><input value={editing.headline ?? ''} onChange={e => setEditing({ ...editing, headline: e.target.value })} placeholder="e.g. Newborn Specialist" className={inp} /></div>
            <div>
              <Lbl t="Specialty" />
              <select value={editing.specialty_id ?? ''} onChange={e => setEditing({ ...editing, specialty_id: e.target.value || null })} className={inp}>
                <option value="">No specialty</option>
                {specs.items.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div><Lbl t="Short bio (shown on the booking page)" /><textarea rows={3} value={editing.bio ?? ''} onChange={e => setEditing({ ...editing, bio: e.target.value })} className={ta} /></div>
          <ImageUploadField label="Photo" value={editing.photo_url ?? ''} onChange={url => setEditing({ ...editing, photo_url: url })} folder="voice-of-preemies/providers" />
          <div className="grid sm:grid-cols-4 gap-3">
            <div>
              <Lbl t="Session length" />
              <select value={editing.slot_minutes ?? 30} onChange={e => setEditing({ ...editing, slot_minutes: +e.target.value })} className={inp}>
                {[15, 20, 30, 45, 60].map(m => <option key={m} value={m}>{m} minutes</option>)}
              </select>
            </div>
            <div><Lbl t="Booking fee (RWF)" /><input type="number" min={0} value={editing.booking_fee ?? 5000} onChange={e => setEditing({ ...editing, booking_fee: +e.target.value })} className={inp} /></div>
            <div><Lbl t="Full fee (RWF)" /><input type="number" min={0} value={editing.full_fee ?? 10000} onChange={e => setEditing({ ...editing, full_fee: +e.target.value })} className={inp} /></div>
            <div><Lbl t="Order on page" /><input type="number" value={editing.position ?? 0} onChange={e => setEditing({ ...editing, position: +e.target.value })} className={inp} /></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Lbl t="Notification email (private, optional)" /><input type="email" value={editing.notify_email ?? ''} onChange={e => setEditing({ ...editing, notify_email: e.target.value })} placeholder="Gets an email for each booking" className={inp} /></div>
            <div>
              <Lbl t="Visible on the public page" />
              <select value={editing.active ? 'yes' : 'no'} onChange={e => setEditing({ ...editing, active: e.target.value === 'yes' })} className={inp}>
                <option value="yes">Yes, people can book</option>
                <option value="no">No, hidden</option>
              </select>
            </div>
          </div>
          {formError && <p className="text-[11px] text-red-600">{formError}</p>}
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="px-3 py-1.5 rounded-xl bg-[#0A6070] text-white text-[11px] font-semibold disabled:opacity-60">{saving ? 'Saving...' : 'Save'}</button>
            <button onClick={() => setEditing(null)} className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-[11px] font-semibold">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-[12px] text-[#94A3B8] text-center py-8">Loading...</p>
      ) : sorted.length === 0 ? (
        <EmptyState icon={Stethoscope} message="No providers yet." />
      ) : (
        <div className="space-y-2">
          {sorted.map(p => (
            <div key={p.id} className="bg-white rounded-xl border border-slate-100 p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {p.photo_url
                  ? <img src={p.photo_url} alt="" className="w-11 h-11 rounded-full object-cover flex-shrink-0" />
                  : <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#0A6070] to-[#1AADA0] text-white text-[13px] font-bold flex items-center justify-center flex-shrink-0" style={font}>{initials(p.full_name)}</div>}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[13px] font-bold text-[#1e293b]" style={serif}>{providerLabel(p)}</p>
                    {!p.active && <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold"><EyeOff className="w-2.5 h-2.5" />Hidden</span>}
                  </div>
                  <p className="text-[10px] text-[#94A3B8]">{p.headline || specName(p.specialty_id)} · {p.slot_minutes} min · {fmtRwf(p.booking_fee)} booking / {fmtRwf(p.full_fee)} full</p>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => { setEditing(p); setFormError(''); }} className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#0A6070] hover:bg-slate-50"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => setDeleting(p)} className="p-1.5 rounded-lg text-[#94A3B8] hover:text-red-500 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleting && (
        <ConfirmDialog
          message={`Delete ${providerLabel(deleting)}? Existing bookings are kept, but they can no longer be booked.`}
          onConfirm={async () => { await softDelete(deleting.id); setDeleting(null); }}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

/* ─────────────────────────── Schedule ─────────────────────────── */

interface AvailabilityWindow { id: string; provider_id: string; weekday: number; start_time: string; end_time: string }
interface TimeOff { id: string; provider_id: string; start_date: string; end_date: string; reason: string }

export function ScheduleTab() {
  const { items: providers, loading } = useCrud<Provider>('consult_providers');
  const sorted = [...providers].sort((a, b) => a.position - b.position);
  const [providerId, setProviderId] = useState('');
  const [windows, setWindows] = useState<AvailabilityWindow[]>([]);
  const [timeOff, setTimeOff] = useState<TimeOff[]>([]);
  const [openCount, setOpenCount] = useState<number | null>(null);
  const [msg, setMsg] = useState('');

  const [newDay, setNewDay] = useState(1);
  const [newStart, setNewStart] = useState('17:00');
  const [newEnd, setNewEnd] = useState('20:00');
  const [offStart, setOffStart] = useState('');
  const [offEnd, setOffEnd] = useState('');
  const [offReason, setOffReason] = useState('');

  useEffect(() => { if (!providerId && sorted[0]) setProviderId(sorted[0].id); }, [sorted, providerId]);

  const loadSchedule = useCallback(async () => {
    if (!providerId) return;
    const [w, t, slots] = await Promise.all([
      supabase.from('consult_availability').select('*').eq('provider_id', providerId).order('start_time'),
      supabase.from('consult_time_off').select('*').eq('provider_id', providerId).order('start_date'),
      supabase.rpc('consult_available_slots', { p_provider: providerId, p_from: null, p_to: null }),
    ]);
    setWindows((w.data ?? []) as AvailabilityWindow[]);
    setTimeOff((t.data ?? []) as TimeOff[]);
    setOpenCount(Array.isArray(slots.data) ? slots.data.length : null);
  }, [providerId]);

  useEffect(() => { loadSchedule(); }, [loadSchedule]);

  const flash = (m: string) => { setMsg(m); window.setTimeout(() => setMsg(''), 4000); };
  const provider = sorted.find(p => p.id === providerId);

  const addWindow = async () => {
    if (newEnd <= newStart) { flash('The end time must be after the start time.'); return; }
    const clash = windows.some(w => w.weekday === newDay && newStart < hhmm(w.end_time) && newEnd > hhmm(w.start_time));
    if (clash) { flash('That overlaps hours already set for this day.'); return; }
    const { error } = await supabase.from('consult_availability').insert({ provider_id: providerId, weekday: newDay, start_time: newStart, end_time: newEnd });
    if (error) { flash('Could not add those hours.'); return; }
    loadSchedule();
  };

  const removeWindow = async (id: string) => {
    await supabase.from('consult_availability').delete().eq('id', id);
    loadSchedule();
  };

  const addTimeOff = async () => {
    if (!offStart) { flash('Choose the first day off.'); return; }
    const end = offEnd || offStart;
    if (end < offStart) { flash('The last day must not be before the first day.'); return; }
    const { error } = await supabase.from('consult_time_off').insert({ provider_id: providerId, start_date: offStart, end_date: end, reason: offReason.trim() });
    if (error) { flash('Could not add that day off.'); return; }
    setOffStart(''); setOffEnd(''); setOffReason('');
    loadSchedule();
  };

  const removeTimeOff = async (id: string) => {
    await supabase.from('consult_time_off').delete().eq('id', id);
    loadSchedule();
  };

  if (loading) return <p className="text-[12px] text-[#94A3B8] text-center py-8">Loading...</p>;
  if (sorted.length === 0) return <EmptyState icon={Stethoscope} message="Add a provider first, then set their hours here." />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="sm:w-72">
          <Lbl t="Provider" />
          <select value={providerId} onChange={e => setProviderId(e.target.value)} className={inp}>
            {sorted.map(p => <option key={p.id} value={p.id}>{providerLabel(p)}{p.active ? '' : ' (hidden)'}</option>)}
          </select>
        </div>
        {provider && openCount !== null && (
          <p className="text-[11px] text-[#64748B]" style={font}>
            <span className="font-bold text-[#0A6070]">{openCount}</span> bookable {provider.slot_minutes}-minute slots in the next 14 days
          </p>
        )}
      </div>
      {msg && <p className="text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">{msg}</p>}

      <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
        <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-[#0A6070]" /><p className="text-[12px] font-bold text-[#1e293b]" style={font}>Weekly hours (Kigali time)</p></div>
        <div className="space-y-1.5">
          {WEEKDAY_ORDER.map(d => {
            const dayWindows = windows.filter(w => w.weekday === d);
            return (
              <div key={d} className="flex items-start gap-3 py-1.5 border-b border-slate-50 last:border-0">
                <p className="w-24 text-[11px] font-bold text-[#64748B] pt-1" style={font}>{WEEKDAYS[d]}</p>
                <div className="flex flex-wrap gap-2 flex-1">
                  {dayWindows.length === 0
                    ? <span className="text-[11px] text-[#CBD5E1] pt-1">Off</span>
                    : dayWindows.map(w => (
                      <span key={w.id} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#0A6070] bg-[#0A6070]/8 rounded-lg pl-2.5 pr-1 py-1" style={font}>
                        {hhmm(w.start_time)} – {hhmm(w.end_time)}
                        <button onClick={() => removeWindow(w.id)} className="p-0.5 rounded hover:bg-red-100 hover:text-red-600" title="Remove"><Trash2 className="w-3 h-3" /></button>
                      </span>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="grid sm:grid-cols-4 gap-2 items-end pt-1">
          <div>
            <Lbl t="Day" />
            <select value={newDay} onChange={e => setNewDay(+e.target.value)} className={inp}>
              {WEEKDAY_ORDER.map(d => <option key={d} value={d}>{WEEKDAYS[d]}</option>)}
            </select>
          </div>
          <div><Lbl t="From" /><input type="time" value={newStart} onChange={e => setNewStart(e.target.value)} className={inp} /></div>
          <div><Lbl t="To" /><input type="time" value={newEnd} onChange={e => setNewEnd(e.target.value)} className={inp} /></div>
          <button onClick={addWindow} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#0A6070] text-white text-[11px] font-semibold"><Plus className="w-3.5 h-3.5" /> Add hours</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
        <div className="flex items-center gap-2"><CalendarOff className="w-4 h-4 text-[#0A6070]" /><p className="text-[12px] font-bold text-[#1e293b]" style={font}>Days off (leave, holidays)</p></div>
        {timeOff.length === 0 ? (
          <p className="text-[11px] text-[#CBD5E1]">No days off scheduled.</p>
        ) : (
          <div className="space-y-1.5">
            {timeOff.map(t => (
              <div key={t.id} className="flex items-center justify-between gap-2 text-[11px] bg-slate-50 rounded-lg px-3 py-2" style={font}>
                <span className="text-[#1e293b] font-semibold">
                  {t.start_date === t.end_date ? t.start_date : `${t.start_date} to ${t.end_date}`}
                  {t.reason && <span className="font-normal text-[#64748B]"> · {t.reason}</span>}
                </span>
                <button onClick={() => removeTimeOff(t.id)} className="p-1 rounded hover:bg-red-100 hover:text-red-600 text-[#94A3B8]"><Trash2 className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
        )}
        <div className="grid sm:grid-cols-4 gap-2 items-end">
          <div><Lbl t="First day off" /><input type="date" value={offStart} onChange={e => setOffStart(e.target.value)} className={inp} /></div>
          <div><Lbl t="Last day (optional)" /><input type="date" value={offEnd} min={offStart} onChange={e => setOffEnd(e.target.value)} className={inp} /></div>
          <div><Lbl t="Reason (optional)" /><input value={offReason} onChange={e => setOffReason(e.target.value)} className={inp} /></div>
          <button onClick={addTimeOff} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#0A6070] text-white text-[11px] font-semibold"><Plus className="w-3.5 h-3.5" /> Add day off</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Specialties ─────────────────────────── */

export function SpecialtiesTab() {
  const { items, loading, create, update, softDelete } = useCrud<Specialty>('consult_specialties');
  const [name, setName] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deleting, setDeleting] = useState<Specialty | null>(null);

  const sorted = [...items].sort((a, b) => a.position - b.position);

  const add = async () => {
    if (!name.trim()) return;
    await create({ name: name.trim(), position: items.length + 1 });
    setName('');
  };

  const saveEdit = async () => {
    if (editId && editName.trim()) await update(editId, { name: editName.trim() });
    setEditId(null);
  };

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-[#64748B]" style={font}>Categories that group providers on the booking page, e.g. Newborn Care or Lactation.</p>
      <div className="flex gap-2">
        <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} placeholder="New specialty name" className={inp + ' sm:w-72'} />
        <button onClick={add} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0A6070] text-white text-[11px] font-semibold"><Plus className="w-3.5 h-3.5" /> Add</button>
      </div>
      {loading ? (
        <p className="text-[12px] text-[#94A3B8] text-center py-8">Loading...</p>
      ) : sorted.length === 0 ? (
        <EmptyState icon={Tag} message="No specialties yet." />
      ) : (
        <div className="space-y-2">
          {sorted.map(s => (
            <div key={s.id} className="bg-white rounded-xl border border-slate-100 p-3 flex items-center justify-between gap-3">
              {editId === s.id ? (
                <input autoFocus value={editName} onChange={e => setEditName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditId(null); }} onBlur={saveEdit} className={inp + ' sm:w-72'} />
              ) : (
                <p className="text-[13px] font-bold text-[#1e293b]" style={serif}>{s.name}</p>
              )}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => { setEditId(s.id); setEditName(s.name); }} className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#0A6070] hover:bg-slate-50"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => setDeleting(s)} className="p-1.5 rounded-lg text-[#94A3B8] hover:text-red-500 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {deleting && (
        <ConfirmDialog
          message={`Delete the specialty "${deleting.name}"? Providers in it stay, but they will show without a category.`}
          onConfirm={async () => { await softDelete(deleting.id); setDeleting(null); }}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
