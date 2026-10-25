import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Sun, Moon } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import ShiftDrawer from './ShiftDrawer';
import {
  Btn, CareGate, Notice, PageTitle, ShiftRich, SHIFT_HOURS, addDaysToKey, card, dowOf, fmtDay, font, needsConfirmation, selectCls, todayKey,
} from './shared';

const mondayOf = (key: string) => addDaysToKey(key, -((dowOf(key) + 6) % 7));

export default function SchedulePage() {
  const today = todayKey();
  const [weekStart, setWeekStart] = useState(mondayOf(today));
  const [shifts, setShifts] = useState<ShiftRich[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [service, setService] = useState<'all' | 'nurse' | 'caregiver'>('all');
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const weekEnd = addDaysToKey(weekStart, 6);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDaysToKey(weekStart, i)), [weekStart]);

  const load = useCallback(async () => {
    const { data, error: e } = await supabase.from('care_shifts')
      .select('*, care_contracts(reference, family_id, service_code, location_type, location_detail, care_families(full_name)), care_staff(id, full_name, role, photo_url)')
      .gte('shift_date', weekStart).lte('shift_date', weekEnd).order('starts_at');
    if (e) setError(e.message);
    setShifts((data ?? []) as ShiftRich[]);
    setLoading(false);
  }, [weekStart, weekEnd]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  const visible = shifts.filter(s => {
    if (service !== 'all' && s.care_contracts?.service_code !== service) return false;
    if (onlyOpen && !(s.status === 'scheduled' && !s.staff_id)) return false;
    return true;
  });

  const live = shifts.filter(s => s.status === 'scheduled' || s.status === 'completed');
  const openCount = shifts.filter(s => s.status === 'scheduled' && !s.staff_id).length;
  const toConfirm = shifts.filter(needsConfirmation).length;

  const label = `${fmtDay(weekStart, false)} – ${fmtDay(weekEnd)}`;

  return (
    <CareGate>
      <PageTitle title="Schedule" subtitle="Every shift in the week. Click one to assign a worker or mark it done." />
      {error && <div className="mb-3"><Notice kind="error">Could not load the schedule: {error}</Notice></div>}

      <div className={`${card} p-3 mb-3 flex flex-wrap items-center gap-2`}>
        <Btn variant="ghost" icon={ChevronLeft} onClick={() => setWeekStart(w => addDaysToKey(w, -7))}>Previous</Btn>
        <Btn variant="ghost" onClick={() => setWeekStart(mondayOf(today))}>This week</Btn>
        <Btn variant="ghost" onClick={() => setWeekStart(w => addDaysToKey(w, 7))}>Next <ChevronRight className="w-3.5 h-3.5" /></Btn>
        <span className="text-[13px] font-bold text-[#0f172a] ml-1" style={font}>{label}</span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <select value={service} onChange={e => setService(e.target.value as typeof service)} className={selectCls} style={font} aria-label="Filter by service">
            <option value="all">Nurses and caregivers</option><option value="nurse">Nurse shifts</option><option value="caregiver">Caregiver shifts</option>
          </select>
          <label className="inline-flex items-center gap-1.5 text-[12px] text-[#334155] cursor-pointer" style={font}>
            <input type="checkbox" checked={onlyOpen} onChange={e => setOnlyOpen(e.target.checked)} className="accent-[#0A6070]" /> Only shifts without a worker
          </label>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1 mb-3 text-[11px] text-[#64748B]" style={font}>
        <span><b className="text-[#0f172a]">{live.length}</b> shifts this week</span>
        <span className={openCount ? 'text-amber-700' : ''}><b>{openCount}</b> without a worker</span>
        <span className={toConfirm ? 'text-amber-700' : ''}><b>{toConfirm}</b> to confirm</span>
      </div>

      {loading ? <p className="text-[12px] text-[#94A3B8] text-center py-10" style={font}>Loading…</p> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2">
          {days.map(d => {
            const dayShifts = visible.filter(s => s.shift_date === d);
            const isToday = d === today;
            return (
              <div key={d} className={`${card} min-w-0 overflow-hidden ${isToday ? 'ring-2 ring-[#0A6070]/40' : ''}`}>
                <div className={`px-3 py-2 border-b border-slate-50 ${isToday ? 'bg-[#0A6070]/5' : 'bg-slate-50/60'}`}>
                  <p className={`text-[11px] font-bold ${isToday ? 'text-[#0A6070]' : 'text-[#1e293b]'}`} style={font}>{fmtDay(d, false)}{isToday ? ' · Today' : ''}</p>
                </div>
                {(['day', 'night'] as const).map(kind => {
                  const list = dayShifts.filter(s => s.shift === kind);
                  return (
                    <div key={kind} className="p-2 border-b border-slate-50 last:border-0">
                      <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-[#94A3B8] mb-1.5" style={font} title={SHIFT_HOURS[kind]}>
                        {kind === 'day' ? <Sun className="w-3 h-3 text-amber-500" /> : <Moon className="w-3 h-3 text-indigo-400" />} {kind} · {kind === 'day' ? '8am–8pm' : '8pm–8am'}
                      </p>
                      {list.length === 0 ? <p className="text-[10px] text-[#CBD5E1] px-1" style={font}>—</p> : (
                        <div className="space-y-1">
                          {list.map(s => {
                            const open = s.status === 'scheduled' && !s.staff_id;
                            const confirm = needsConfirmation(s);
                            const muted = s.status === 'cancelled' || s.status === 'no_show';
                            return (
                              <button key={s.id} onClick={() => setOpenId(s.id)}
                                className={`w-full text-left rounded-lg px-2 py-1.5 border transition-colors ${open ? 'border-amber-200 bg-amber-50 hover:bg-amber-100/70' : confirm ? 'border-sky-200 bg-sky-50 hover:bg-sky-100/70' : s.status === 'completed' ? 'border-emerald-100 bg-emerald-50/60 hover:bg-emerald-50' : muted ? 'border-slate-100 bg-slate-50 opacity-60' : 'border-slate-100 bg-white hover:bg-slate-50'}`}>
                                <span className="block text-[11px] font-semibold text-[#1e293b] truncate" style={font}>{s.care_contracts?.care_families?.full_name ?? 'Family'}</span>
                                <span className={`block text-[10px] truncate ${open ? 'text-amber-700 font-semibold' : 'text-[#64748B]'}`} style={font}>
                                  {s.status === 'cancelled' ? 'Cancelled' : s.status === 'no_show' ? 'No-show' : s.care_staff?.full_name ?? 'No worker yet'}{confirm ? ' · confirm' : ''}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-4 mt-4 text-[10px] text-[#64748B]" style={font}>
        <span className="inline-flex items-center gap-1.5"><i className="w-3 h-3 rounded border border-amber-200 bg-amber-50" /> No worker yet</span>
        <span className="inline-flex items-center gap-1.5"><i className="w-3 h-3 rounded border border-sky-200 bg-sky-50" /> Finished, needs confirming</span>
        <span className="inline-flex items-center gap-1.5"><i className="w-3 h-3 rounded border border-emerald-100 bg-emerald-50" /> Completed</span>
      </div>

      {openId && <ShiftDrawer shiftId={openId} onClose={() => setOpenId(null)} onChanged={load} />}
    </CareGate>
  );
}
