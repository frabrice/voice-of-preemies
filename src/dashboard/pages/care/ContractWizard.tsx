import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import Drawer from '../../components/Drawer';
import { inp, ta, Lbl } from '../../components/shared';
import {
  Family, Lang, LANG_LABEL, Notice, SERVICE_LABEL, SHIFT_HOURS, SHORT_DAYS, ServiceCode, ShiftType, Service,
  addDaysToKey, bulkAssign, daysBetween, enumerateShifts, fmtDay, fmtRwf, font, friendlyError, todayKey, METHOD_LABEL, Staff,
} from './shared';

export interface WizardPrefill {
  parent_name?: string; phone?: string; email?: string; service?: ServiceCode; shift_type?: ShiftType; start_date?: string;
  location_type?: 'home' | 'hospital'; location_detail?: string; notes?: string; requestId?: string;
}

interface Props {
  family?: Family;          // adding another contract to an existing parent
  prefill?: WizardPrefill;  // e.g. from a website request
  onClose: () => void;
  onDone: (familyId: string, warnings: string[]) => void;
}

const WEEKDAY_BUTTONS = [1, 2, 3, 4, 5, 6, 0];

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="flex items-center gap-2 text-[12px] font-bold text-[#0f172a]" style={font}>
        <span className="w-5 h-5 rounded-full bg-[#0A6070] text-white text-[10px] flex items-center justify-center">{n}</span> {title}
      </h3>
      {children}
    </section>
  );
}

export default function ContractWizard({ family, prefill, onClose, onDone }: Props) {
  const [services, setServices] = useState<Record<string, Service>>({});
  const [staff, setStaff] = useState<Staff[]>([]);
  const [busyDays, setBusyDays] = useState<Record<string, Set<string>>>({});

  // 1 parent
  const [name, setName] = useState(prefill?.parent_name ?? '');
  const [nid, setNid] = useState('');
  const [phone, setPhone] = useState(prefill?.phone ?? '');
  const [email, setEmail] = useState(prefill?.email ?? '');
  const [address, setAddress] = useState('');
  const [lang, setLang] = useState<Lang>(family?.preferred_language ?? 'en');

  // 2 service + 3 schedule
  const [service, setService] = useState<ServiceCode>(prefill?.service ?? 'nurse');
  const [start, setStart] = useState(prefill?.start_date && prefill.start_date >= todayKey() ? prefill.start_date : addDaysToKey(todayKey(), 1));
  const [days, setDays] = useState(7);
  const [end, setEnd] = useState(addDaysToKey(prefill?.start_date && prefill.start_date >= todayKey() ? prefill.start_date : addDaysToKey(todayKey(), 1), 6));
  const [weekdays, setWeekdays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [shiftType, setShiftType] = useState<ShiftType>(prefill?.shift_type ?? 'day');
  const [locType, setLocType] = useState<'home' | 'hospital'>(prefill?.location_type ?? 'home');
  const [locDetail, setLocDetail] = useState(prefill?.location_detail ?? '');
  const [signed, setSigned] = useState(false);
  const [signedOn, setSignedOn] = useState(todayKey());
  const [notes, setNotes] = useState(prefill?.notes ?? '');

  // 4 workers
  const [dayStaff, setDayStaff] = useState('');
  const [nightStaff, setNightStaff] = useState('');

  // 5 payment
  const [payMode, setPayMode] = useState<'none' | 'commitment' | 'full' | 'other'>('none');
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'momo' | 'cash' | 'bank' | 'other'>('momo');
  const [payRef, setPayRef] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [createdFamilyId, setCreatedFamilyId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: sv }, { data: st }] = await Promise.all([
        supabase.from('care_services').select('*'),
        supabase.from('care_staff').select('*').eq('status', 'active').is('deleted_at', null).order('full_name'),
      ]);
      setServices(Object.fromEntries((sv ?? []).map(s => [s.code, s as Service])));
      setStaff((st ?? []) as Staff[]);
    })();
  }, []);

  const shifts = useMemo(() => enumerateShifts(start, end, weekdays, shiftType), [start, end, weekdays, shiftType]);
  const svc = services[service];
  const total = svc ? shifts.length * svc.rate_per_shift : 0;
  const firstWeekEnd = addDaysToKey(start, 6);
  const commitShifts = shifts.filter(s => s.date <= firstWeekEnd).length;
  const commitment = svc ? commitShifts * svc.rate_per_shift : 0;
  const feeTotal = svc ? shifts.length * svc.coordination_fee : 0;
  const net = total - feeTotal;
  const dayCount = shifts.filter(s => s.shift === 'day').length;
  const nightCount = shifts.filter(s => s.shift === 'night').length;

  // Which of the workers are free on the dates this contract needs?
  useEffect(() => {
    if (!shifts.length) { setBusyDays({}); return; }
    let live = true;
    (async () => {
      const { data } = await supabase.from('care_shifts').select('staff_id, shift_date').in('status', ['scheduled', 'completed']).not('staff_id', 'is', null).gte('shift_date', start).lte('shift_date', end);
      if (!live) return;
      const map: Record<string, Set<string>> = {};
      (data ?? []).forEach(r => { (map[r.staff_id as string] ??= new Set()).add(r.shift_date as string); });
      setBusyDays(map);
    })();
    return () => { live = false; };
  }, [start, end, shifts.length]);

  const eligible = staff.filter(s => s.role === service);
  const freeLabel = (s: Staff, kind: 'day' | 'night') => {
    const needed = shifts.filter(x => x.shift === kind).map(x => x.date);
    const busy = busyDays[s.id];
    const free = needed.filter(d => !busy?.has(d)).length;
    return `${s.full_name} — free ${free} of ${needed.length} days`;
  };

  const setDaysCount = (n: number) => { const v = Math.max(1, Math.min(366, n || 1)); setDays(v); setEnd(addDaysToKey(start, v - 1)); };
  const setStartDate = (v: string) => { setStart(v); if (v) setEnd(addDaysToKey(v, days - 1)); };
  const setEndDate = (v: string) => { setEnd(v); if (v && start && v >= start) setDays(daysBetween(start, v)); };
  const toggleDay = (d: number) => setWeekdays(w => (w.includes(d) ? w.filter(x => x !== d) : [...w, d]));

  useEffect(() => {
    if (payMode === 'commitment') setPayAmount(String(commitment));
    if (payMode === 'full') setPayAmount(String(total));
    if (payMode === 'none') setPayAmount('');
  }, [payMode, commitment, total]);

  const needsDay = shiftType === 'day' || shiftType === 'both';
  const needsNight = shiftType === 'night' || shiftType === 'both';
  const sameBoth = shiftType === 'both' && dayStaff && dayStaff === nightStaff;

  const submit = async () => {
    setError('');
    if (!family && !createdFamilyId) {
      if (!name.trim()) { setError("Please enter the parent's full name."); return; }
      if (!phone.trim()) { setError("Please enter the parent's phone number."); return; }
    }
    if (!svc) { setError('Prices are still loading. Try again in a moment.'); return; }
    if (!weekdays.length) { setError('Choose at least one day of the week.'); return; }
    if (!start || !end || end < start) { setError('The end date must be on or after the start date.'); return; }
    if (days > 366) { setError('A contract can cover at most one year.'); return; }
    if (!shifts.length) { setError('Those dates and weekdays give no shifts. Check the selection.'); return; }
    const amount = Number(payAmount);
    if (payMode !== 'none' && (!Number.isFinite(amount) || amount <= 0)) { setError('Enter the amount the parent paid.'); return; }

    setSaving(true);
    const warnings: string[] = [];
    try {
      let familyId = family?.id ?? createdFamilyId;
      if (!familyId) {
        const { data, error: fe } = await supabase.from('care_families').insert({
          full_name: name.trim(), national_id: nid.trim(), phone: phone.trim(), email: email.trim(), address: address.trim(), preferred_language: lang,
        }).select('id').single();
        if (fe || !data) throw new Error(`Could not save the parent: ${friendlyError(fe?.message ?? 'unknown error')}`);
        familyId = data.id as string;
        setCreatedFamilyId(familyId);
      }

      const { data: ct, error: ce } = await supabase.from('care_contracts').insert({
        family_id: familyId, service_code: service, start_date: start, end_date: end, weekdays, shift_type: shiftType,
        location_type: locType, location_detail: locDetail.trim(), language: family?.preferred_language ?? lang,
        status: signed ? 'active' : 'draft', signed_on: signed ? signedOn : null, notes: notes.trim(),
      }).select('id').single();
      if (ce || !ct) throw new Error(`${family || createdFamilyId ? '' : 'The parent was saved, but '}the contract could not be created: ${friendlyError(ce?.message ?? 'unknown error')}`);

      const { error: se } = await supabase.rpc('care_sync_shifts', { p_contract: ct.id });
      if (se) warnings.push(`The contract was saved but its shifts could not be created: ${friendlyError(se.message)}`);

      if (!se) {
        for (const [kind, staffId] of [['day', needsDay ? dayStaff : ''], ['night', needsNight ? nightStaff : '']] as const) {
          if (!staffId) continue;
          const who = staff.find(s => s.id === staffId)?.full_name ?? 'The worker';
          const r = await bulkAssign(ct.id as string, kind, staffId);
          if (r.error) warnings.push(`Could not assign ${who} to the ${kind} shifts: ${r.error}`);
          else if (r.skipped.length) warnings.push(`${who} was busy on ${r.skipped.length} day${r.skipped.length > 1 ? 's' : ''} (${r.skipped.map(d => fmtDay(d, false)).join(', ')}), so those ${kind} shifts are still unassigned.`);
        }
      }

      if (payMode !== 'none') {
        const { error: pe } = await supabase.from('care_payments_in').insert({
          contract_id: ct.id, amount, method: payMethod, reference: payRef.trim(), paid_on: todayKey(),
          kind: payMode === 'commitment' ? 'commitment' : payMode === 'full' ? 'balance' : 'other',
        });
        if (pe) warnings.push(`The payment could not be recorded: ${friendlyError(pe.message)}. Add it from the parent's page.`);
      }

      if (prefill?.requestId) {
        await supabase.from('care_requests').update({ status: 'converted', family_id: familyId }).eq('id', prefill.requestId);
      }
      setSaving(false);
      onDone(familyId, warnings);
    } catch (e) {
      setSaving(false);
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    }
  };

  const title = family ? `New contract for ${family.full_name}` : 'Add parent and contract';

  return (
    <Drawer
      title={title}
      subtitle="Everything is recorded in one go: shifts, workers and payment"
      onClose={onClose}
      width="lg"
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-red-600 font-medium min-w-0" style={font}>{error}</p>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={onClose} disabled={saving} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-[12px] font-semibold hover:bg-slate-200 disabled:opacity-60" style={font}>Cancel</button>
            <button onClick={submit} disabled={saving} className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-[#0A6070] to-[#1AADA0] text-white text-[12px] font-semibold disabled:opacity-60" style={font}>
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} {saving ? 'Saving…' : `Create contract · ${shifts.length} shifts`}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-7">
        {!family && (
          <Section n={1} title="Parent">
            {createdFamilyId && <Notice kind="ok">The parent is already saved. Fix the problem below and press Create again; they will not be added twice.</Notice>}
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2"><Lbl t="Full name" /><input value={name} onChange={e => setName(e.target.value)} className={inp} disabled={!!createdFamilyId} /></div>
              <div><Lbl t="National ID or passport number" /><input value={nid} onChange={e => setNid(e.target.value)} className={inp} disabled={!!createdFamilyId} /></div>
              <div><Lbl t="Phone" /><input value={phone} onChange={e => setPhone(e.target.value)} className={inp} placeholder="07…" disabled={!!createdFamilyId} /></div>
              <div><Lbl t="Email (optional)" /><input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inp} disabled={!!createdFamilyId} /></div>
              <div><Lbl t="Contract language" /><select value={lang} onChange={e => setLang(e.target.value as Lang)} className={inp} disabled={!!createdFamilyId}>{(Object.keys(LANG_LABEL) as Lang[]).map(l => <option key={l} value={l}>{LANG_LABEL[l]}</option>)}</select></div>
              <div className="sm:col-span-2"><Lbl t="Home address (optional)" /><input value={address} onChange={e => setAddress(e.target.value)} className={inp} disabled={!!createdFamilyId} /></div>
            </div>
          </Section>
        )}

        <Section n={family ? 1 : 2} title="Service">
          <div className="grid grid-cols-2 gap-2">
            {(['nurse', 'caregiver'] as ServiceCode[]).map(code => {
              const s = services[code]; const on = service === code;
              return (
                <button key={code} type="button" onClick={() => { setService(code); setDayStaff(''); setNightStaff(''); }}
                  className={`text-left rounded-xl border-2 px-3 py-2.5 transition-all ${on ? 'border-[#0A6070] bg-[#0A6070]/5' : 'border-slate-200 hover:border-slate-300'}`}>
                  <span className="block text-[12px] font-bold text-[#1e293b]" style={font}>{SERVICE_LABEL[code]}</span>
                  <span className="block text-[11px] text-[#64748B]" style={font}>{s ? `${fmtRwf(s.rate_per_shift)} per shift` : '…'}</span>
                </button>
              );
            })}
          </div>
        </Section>

        <Section n={family ? 2 : 3} title="Dates and shifts">
          <div className="grid grid-cols-3 gap-3">
            <div><Lbl t="Start date" /><input type="date" value={start} onChange={e => setStartDate(e.target.value)} className={inp} /></div>
            <div><Lbl t="Number of days" /><input type="number" min={1} max={366} value={days} onChange={e => setDaysCount(Number(e.target.value))} className={inp} /></div>
            <div><Lbl t="End date" /><input type="date" value={end} min={start} onChange={e => setEndDate(e.target.value)} className={inp} /></div>
          </div>
          <div>
            <Lbl t="Days of the week" />
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAY_BUTTONS.map(d => (
                <button key={d} type="button" onClick={() => toggleDay(d)} aria-pressed={weekdays.includes(d)}
                  className={`w-11 py-2 rounded-xl text-[11px] font-bold border transition-colors ${weekdays.includes(d) ? 'bg-[#0A6070] border-[#0A6070] text-white' : 'bg-white border-slate-200 text-[#64748B]'}`} style={font}>
                  {SHORT_DAYS[d]}
                </button>
              ))}
              <button type="button" onClick={() => setWeekdays([0, 1, 2, 3, 4, 5, 6])} className="px-2 text-[11px] font-semibold text-[#0A6070] hover:underline" style={font}>Every day</button>
              <button type="button" onClick={() => setWeekdays([1, 2, 3, 4, 5])} className="px-2 text-[11px] font-semibold text-[#0A6070] hover:underline" style={font}>Mon–Fri</button>
            </div>
          </div>
          <div>
            <Lbl t="Shift" />
            <div className="grid grid-cols-3 gap-2">
              {([['day', 'Day', SHIFT_HOURS.day], ['night', 'Night', SHIFT_HOURS.night], ['both', 'Both', 'Day and night']] as const).map(([v, label, hours]) => (
                <button key={v} type="button" onClick={() => setShiftType(v)}
                  className={`text-left rounded-xl border-2 px-3 py-2 transition-all ${shiftType === v ? 'border-[#0A6070] bg-[#0A6070]/5' : 'border-slate-200 hover:border-slate-300'}`}>
                  <span className="block text-[12px] font-bold text-[#1e293b]" style={font}>{label}</span>
                  <span className="block text-[10px] text-[#64748B]" style={font}>{hours}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Lbl t="Where" /><select value={locType} onChange={e => setLocType(e.target.value as 'home' | 'hospital')} className={inp}><option value="home">At home</option><option value="hospital">In hospital</option></select></div>
            <div><Lbl t={locType === 'hospital' ? 'Hospital and ward' : 'Area or address (optional)'} /><input value={locDetail} onChange={e => setLocDetail(e.target.value)} className={inp} /></div>
          </div>
          <label className="flex items-center gap-2 text-[12px] text-[#334155] cursor-pointer" style={font}>
            <input type="checkbox" checked={signed} onChange={e => setSigned(e.target.checked)} className="accent-[#0A6070]" />
            The parent has already signed the contract
            {signed && <input type="date" value={signedOn} onChange={e => setSignedOn(e.target.value)} className="ml-2 px-2 py-1 rounded-lg border border-slate-200 text-[11px]" />}
          </label>
        </Section>

        <Section n={family ? 3 : 4} title="Who will work the shifts?">
          <p className="text-[11px] text-[#64748B] -mt-1" style={font}>Optional now. You can assign or change workers shift by shift later. A worker can do only one shift a day.</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {needsDay && (
              <div><Lbl t={`Day ${service === 'nurse' ? 'nurse' : 'caregiver'} (${dayCount} shifts)`} />
                <select value={dayStaff} onChange={e => setDayStaff(e.target.value)} className={inp}>
                  <option value="">Decide later</option>
                  {eligible.map(s => <option key={s.id} value={s.id}>{freeLabel(s, 'day')}</option>)}
                </select></div>
            )}
            {needsNight && (
              <div><Lbl t={`Night ${service === 'nurse' ? 'nurse' : 'caregiver'} (${nightCount} shifts)`} />
                <select value={nightStaff} onChange={e => setNightStaff(e.target.value)} className={inp}>
                  <option value="">Decide later</option>
                  {eligible.map(s => <option key={s.id} value={s.id}>{freeLabel(s, 'night')}</option>)}
                </select></div>
            )}
          </div>
          {eligible.length === 0 && <p className="flex items-center gap-1.5 text-[11px] text-amber-700" style={font}><AlertTriangle className="w-3.5 h-3.5" /> No active {service === 'nurse' ? 'nurses' : 'caregivers'} yet. Add them under Care Team.</p>}
          {sameBoth && <p className="flex items-center gap-1.5 text-[11px] text-amber-700" style={font}><AlertTriangle className="w-3.5 h-3.5" /> The same person cannot work both the day and the night shift on one day. Choose two different people.</p>}
        </Section>

        <Section n={family ? 4 : 5} title="Price and payment">
          <div className="rounded-xl bg-slate-50 p-3.5 space-y-1.5" style={font}>
            <div className="flex justify-between text-[12px]"><span className="text-[#64748B]">{shifts.length} shifts × {svc ? fmtRwf(svc.rate_per_shift) : '…'}</span><span className="font-bold text-[#0f172a]">{fmtRwf(total)}</span></div>
            <div className="flex justify-between text-[11px]"><span className="text-[#64748B]">Commitment fee, due at the start (first week: {commitShifts} shifts)</span><span className="font-semibold">{fmtRwf(commitment)}</span></div>
            <div className="flex justify-between text-[11px]"><span className="text-[#64748B]">Voice of Preemies keeps</span><span className="font-semibold">{fmtRwf(feeTotal)}</span></div>
            <div className="flex justify-between text-[11px]"><span className="text-[#64748B]">Workers receive in total</span><span className="font-semibold">{fmtRwf(net)}</span></div>
          </div>
          <div>
            <Lbl t="Has the parent paid?" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {([['none', 'Not yet'], ['commitment', 'Commitment fee'], ['full', 'Everything'], ['other', 'Another amount']] as const).map(([v, label]) => (
                <button key={v} type="button" onClick={() => setPayMode(v)}
                  className={`rounded-xl border-2 px-2 py-2 text-[11px] font-bold transition-all ${payMode === v ? 'border-[#0A6070] bg-[#0A6070]/5 text-[#0A6070]' : 'border-slate-200 text-[#64748B] hover:border-slate-300'}`} style={font}>{label}</button>
              ))}
            </div>
          </div>
          {payMode !== 'none' && (
            <div className="grid sm:grid-cols-3 gap-3">
              <div><Lbl t="Amount (RWF)" /><input type="number" min={1} value={payAmount} onChange={e => { setPayAmount(e.target.value); setPayMode('other'); }} className={inp} /></div>
              <div><Lbl t="Paid by" /><select value={payMethod} onChange={e => setPayMethod(e.target.value as typeof payMethod)} className={inp}>{Object.entries(METHOD_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              <div><Lbl t="Reference (optional)" /><input value={payRef} onChange={e => setPayRef(e.target.value)} className={inp} placeholder="MoMo transaction ID" /></div>
            </div>
          )}
        </Section>

        <div><Lbl t="Notes (optional)" /><textarea value={notes} onChange={e => setNotes(e.target.value)} className={ta} placeholder="Anything the team should know about this contract" /></div>
      </div>
    </Drawer>
  );
}
