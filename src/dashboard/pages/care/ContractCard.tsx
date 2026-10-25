import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Wallet, Pencil, RefreshCw, Ban, FileSignature, Trash2, UserPlus, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { inp, Lbl, fmtDate } from '../../components/shared';
import Drawer from '../../components/Drawer';
import ConfirmDialog from '../../components/ConfirmDialog';
import PaymentDrawer from './PaymentDrawer';
import ShiftDrawer, { StaffSelect } from './ShiftDrawer';
import {
  Avatar, Btn, Contract, ContractTotals, METHOD_LABEL, Notice, PaymentIn, Pill, ProgressBar, SERVICE_LABEL, SHIFT_HOURS, SHIFT_LABEL, SHIFT_TYPE_LABEL,
  ShiftRich, ShiftKind, addDaysToKey, bulkAssign, card, contractStatusTone, fmtDay, fmtRwf, font, friendlyError, shiftStatusTone, todayKey, weekdaySummary,
  SHORT_DAYS, enumerateShifts,
} from './shared';

interface Props {
  contract: Contract;
  totals: ContractTotals | undefined;
  onChanged: () => void;
  defaultOpen?: boolean;
}

/** One contract: its terms, money, payment plan and every shift. */
export default function ContractCard({ contract: c, totals, onChanged, defaultOpen }: Props) {
  const [open, setOpen] = useState(!!defaultOpen);
  const [shifts, setShifts] = useState<ShiftRich[]>([]);
  const [payments, setPayments] = useState<PaymentIn[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [shiftId, setShiftId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | 'cancel' | 'delete' | { payment: PaymentIn }>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error' | 'warn'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [{ data: s }, { data: p }] = await Promise.all([
      supabase.from('care_shifts')
        .select('*, care_contracts(reference, family_id, service_code, location_type, location_detail, care_families(full_name)), care_staff(id, full_name, role, photo_url)')
        .eq('contract_id', c.id).order('shift_date').order('shift'),
      supabase.from('care_payments_in').select('*').eq('contract_id', c.id).is('deleted_at', null).order('paid_on', { ascending: false }).order('created_at', { ascending: false }),
    ]);
    setShifts((s ?? []) as ShiftRich[]);
    setPayments((p ?? []) as PaymentIn[]);
    setLoaded(true);
  }, [c.id]);

  useEffect(() => { if (open && !loaded) load(); }, [open, loaded, load]);

  const refresh = async () => { await load(); onChanged(); };

  const tone = contractStatusTone[c.status];
  const due = totals?.amount_due ?? 0;
  const paid = totals?.amount_paid ?? 0;
  const balance = due - paid;
  const firstWeekEnd = addDaysToKey(c.start_date, 6);

  // Payment plan: weekly amounts in advance (week 1 is the commitment fee), covered by cumulative payments.
  const plan = useMemo(() => {
    const live = shifts.filter(s => s.status === 'scheduled' || s.status === 'completed');
    const weeks: { n: number; from: string; to: string; shifts: number; amount: number; covered: number }[] = [];
    let remaining = paid;
    for (let n = 0, from = c.start_date; from <= c.end_date; n++, from = addDaysToKey(from, 7)) {
      const to = addDaysToKey(from, 6) < c.end_date ? addDaysToKey(from, 6) : c.end_date;
      const inWeek = live.filter(s => s.shift_date >= from && s.shift_date <= to);
      const amount = inWeek.length * c.rate_per_shift;
      const covered = Math.min(remaining, amount);
      remaining -= covered;
      weeks.push({ n: n + 1, from, to, shifts: inWeek.length, amount, covered });
    }
    return weeks.filter(w => w.shifts > 0);
  }, [shifts, paid, c]);

  const commitment = useMemo(
    () => enumerateShifts(c.start_date, firstWeekEnd, c.weekdays, c.shift_type).length * c.rate_per_shift,
    [c, firstWeekEnd],
  );

  const exec = async (fn: () => PromiseLike<{ error: { message: string } | null }>, ok: string) => {
    setBusy(true); setMsg(null);
    const { error } = await fn();
    setBusy(false);
    if (error) { setMsg({ kind: 'error', text: friendlyError(error.message) }); return false; }
    setMsg({ kind: 'ok', text: ok });
    await refresh();
    return true;
  };

  const syncShifts = async () => {
    setBusy(true); setMsg(null);
    const { data, error } = await supabase.rpc('care_sync_shifts', { p_contract: c.id });
    setBusy(false);
    if (error) { setMsg({ kind: 'error', text: friendlyError(error.message) }); return; }
    const r = (data as { added: number; removed: number }[] | null)?.[0];
    setMsg({ kind: 'ok', text: r && (r.added || r.removed) ? `Shifts updated: ${r.added} added, ${r.removed} removed.` : 'Shifts already match the contract.' });
    await refresh();
  };

  const cancelContract = async () => {
    setConfirm(null);
    setBusy(true); setMsg(null);
    const { error: e1 } = await supabase.from('care_shifts').update({ status: 'cancelled' }).eq('contract_id', c.id).eq('status', 'scheduled').gte('shift_date', todayKey());
    if (e1) { setBusy(false); setMsg({ kind: 'error', text: friendlyError(e1.message) }); return; }
    const { error: e2 } = await supabase.from('care_contracts').update({ status: 'cancelled' }).eq('id', c.id);
    setBusy(false);
    if (e2) { setMsg({ kind: 'error', text: friendlyError(e2.message) }); return; }
    setMsg({ kind: 'ok', text: 'Contract cancelled. Future shifts were cancelled; completed shifts and payments are kept.' });
    await refresh();
  };

  const deleteContract = async () => {
    setConfirm(null);
    await exec(() => supabase.from('care_contracts').update({ deleted_at: new Date().toISOString() }).eq('id', c.id), 'Contract deleted.');
  };

  const removePayment = async (p: PaymentIn) => {
    setConfirm(null);
    await exec(() => supabase.from('care_payments_in').update({ deleted_at: new Date().toISOString() }).eq('id', p.id), 'Payment removed.');
  };

  const grouped = useMemo(() => {
    const m = new Map<string, ShiftRich[]>();
    shifts.forEach(s => { const a = m.get(s.shift_date) ?? []; a.push(s); m.set(s.shift_date, a); });
    return [...m.entries()];
  }, [shifts]);

  return (
    <article className={`${card} overflow-hidden`}>
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full text-left px-4 py-3.5 flex flex-wrap items-center gap-x-4 gap-y-2 hover:bg-slate-50/60" aria-expanded={open}>
        <div className="min-w-0 flex-1 basis-56">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-bold text-[#0f172a]" style={font}>{c.reference}</span>
            <Pill tone={tone.tone}>{tone.label}</Pill>
            <Pill tone="violet">{SERVICE_LABEL[c.service_code]}</Pill>
          </div>
          <p className="text-[11px] text-[#64748B] mt-1" style={font}>
            {fmtDay(c.start_date)} → {fmtDay(c.end_date)} · {weekdaySummary(c.weekdays)} · {SHIFT_TYPE_LABEL[c.shift_type]} · {c.location_type === 'hospital' ? 'Hospital' : 'Home'}{c.location_detail ? `, ${c.location_detail}` : ''}
          </p>
        </div>
        <div className="basis-48 flex-1 min-w-[10rem] max-w-xs">
          <div className="flex justify-between text-[11px] mb-1" style={font}>
            <span className="text-[#64748B]">{fmtRwf(paid)} of {fmtRwf(due)}</span>
            <span className={`font-bold ${balance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{balance > 0 ? `${fmtRwf(balance)} owed` : balance < 0 ? `${fmtRwf(-balance)} ahead` : 'Paid in full'}</span>
          </div>
          <ProgressBar value={paid} max={due} />
          <p className="text-[10px] text-[#94A3B8] mt-1" style={font}>
            {totals?.completed_shifts ?? 0} of {totals?.billable_shifts ?? 0} shifts done{(totals?.unassigned_shifts ?? 0) > 0 ? ` · ${totals?.unassigned_shifts} without a worker` : ''}
          </p>
        </div>
        <ChevronDown className={`w-4 h-4 text-[#94A3B8] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-slate-100 px-4 py-4 space-y-5 bg-slate-50/40">
          {msg && <Notice kind={msg.kind} onClose={() => setMsg(null)}>{msg.text}</Notice>}

          <div className="flex flex-wrap gap-2">
            {c.status !== 'cancelled' && <Btn icon={Wallet} onClick={() => setPayOpen(true)}>Record payment</Btn>}
            {c.status !== 'cancelled' && <Btn variant="ghost" icon={UserPlus} onClick={() => setAssignOpen(true)}>Assign workers</Btn>}
            <Btn variant="ghost" icon={Pencil} onClick={() => setEditOpen(true)}>Edit terms</Btn>
            {c.status === 'draft' && <Btn variant="ghost" icon={FileSignature} onClick={() => exec(() => supabase.from('care_contracts').update({ status: 'active', signed_on: todayKey() }).eq('id', c.id), 'Contract marked as signed.')}>Mark as signed</Btn>}
            {c.status === 'active' && <Btn variant="ghost" icon={CheckCircle2} onClick={() => exec(() => supabase.from('care_contracts').update({ status: 'completed' }).eq('id', c.id), 'Contract closed as completed.')}>Close as completed</Btn>}
            {c.status !== 'cancelled' && <Btn variant="ghost" icon={RefreshCw} onClick={syncShifts} disabled={busy}>Refresh shifts</Btn>}
            {c.status !== 'cancelled' && <Btn variant="danger" icon={Ban} onClick={() => setConfirm('cancel')}>Cancel contract</Btn>}
            {(totals?.completed_shifts ?? 0) === 0 && paid === 0 && <Btn variant="danger" icon={Trash2} onClick={() => setConfirm('delete')}>Delete</Btn>}
            {busy && <Loader2 className="w-4 h-4 animate-spin text-[#94A3B8] self-center" />}
          </div>

          <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]" style={font}>
            <div><dt className="text-[#94A3B8] font-bold uppercase tracking-wider text-[9px]">Per shift</dt><dd className="font-semibold text-[#1e293b] text-[12px]">{fmtRwf(c.rate_per_shift)}</dd></div>
            <div><dt className="text-[#94A3B8] font-bold uppercase tracking-wider text-[9px]">VoP fee / worker gets</dt><dd className="font-semibold text-[#1e293b] text-[12px]">{fmtRwf(c.coordination_fee)} / {fmtRwf(c.rate_per_shift - c.coordination_fee)}</dd></div>
            <div><dt className="text-[#94A3B8] font-bold uppercase tracking-wider text-[9px]">Commitment fee (week 1)</dt><dd className="font-semibold text-[#1e293b] text-[12px]">{fmtRwf(commitment)}</dd></div>
            <div><dt className="text-[#94A3B8] font-bold uppercase tracking-wider text-[9px]">Signed</dt><dd className="font-semibold text-[#1e293b] text-[12px]">{c.signed_on ? fmtDate(c.signed_on) : 'Not yet'}</dd></div>
          </dl>
          {c.notes && <p className="text-[11px] text-[#64748B] bg-white rounded-xl border border-slate-100 p-3" style={font}>{c.notes}</p>}

          {/* payment plan */}
          {plan.length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2" style={font}>Payment plan (each week is paid in advance)</h4>
              <div className="rounded-xl border border-slate-100 bg-white overflow-hidden divide-y divide-slate-50">
                {plan.map(w => {
                  const state = w.covered >= w.amount ? 'paid' : w.covered > 0 ? 'part' : 'unpaid';
                  return (
                    <div key={w.n} className="flex items-center justify-between gap-3 px-3 py-2 text-[11px]" style={font}>
                      <span className="text-[#334155]"><b>{w.n === 1 ? 'Week 1 · commitment fee' : `Week ${w.n}`}</b> <span className="text-[#94A3B8]">· {fmtDay(w.from, false)} – {fmtDay(w.to, false)} · {w.shifts} shifts</span></span>
                      <span className="flex items-center gap-2">
                        <span className="font-semibold">{fmtRwf(w.amount)}</span>
                        <Pill tone={state === 'paid' ? 'green' : state === 'part' ? 'amber' : 'slate'}>{state === 'paid' ? 'Paid' : state === 'part' ? `${fmtRwf(w.covered)} paid` : 'Not paid'}</Pill>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* payments */}
          <div>
            <h4 className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2" style={font}>Payments received</h4>
            {!loaded ? <p className="text-[11px] text-[#94A3B8]" style={font}>Loading…</p> : payments.length === 0 ? (
              <p className="text-[11px] text-[#94A3B8]" style={font}>Nothing received yet.</p>
            ) : (
              <div className="rounded-xl border border-slate-100 bg-white overflow-hidden divide-y divide-slate-50">
                {payments.map(p => (
                  <div key={p.id} className="flex items-center justify-between gap-3 px-3 py-2 text-[11px]" style={font}>
                    <span className="text-[#334155] min-w-0 truncate"><b>{fmtRwf(p.amount)}</b> <span className="text-[#94A3B8]">· {fmtDate(p.paid_on)} · {METHOD_LABEL[p.method]}{p.reference ? ` · ${p.reference}` : ''}</span></span>
                    <button onClick={() => setConfirm({ payment: p })} className="p-1 rounded text-[#94A3B8] hover:text-red-500" title="Remove this payment"><Trash2 className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* shifts */}
          <div>
            <h4 className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2" style={font}>Shifts ({shifts.length})</h4>
            {!loaded ? <p className="text-[11px] text-[#94A3B8]" style={font}>Loading…</p> : shifts.length === 0 ? (
              <p className="text-[11px] text-[#94A3B8]" style={font}>No shifts yet. Use “Refresh shifts” to create them from the dates above.</p>
            ) : (
              <div className="rounded-xl border border-slate-100 bg-white overflow-hidden divide-y divide-slate-50 max-h-[26rem] overflow-y-auto">
                {grouped.map(([date, list]) => (
                  <div key={date} className="px-3 py-2">
                    <p className="text-[10px] font-bold text-[#64748B] mb-1" style={font}>{fmtDay(date)}</p>
                    <div className="space-y-1">
                      {list.map(s => {
                        const st = shiftStatusTone(s);
                        return (
                          <button key={s.id} type="button" onClick={() => setShiftId(s.id)} className="w-full flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-50 text-left">
                            <span className="flex items-center gap-2 min-w-0">
                              <Pill tone={s.shift === 'day' ? 'amber' : 'blue'}>{SHIFT_LABEL[s.shift]}</Pill>
                              {s.care_staff ? (
                                <span className="flex items-center gap-1.5 min-w-0"><Avatar name={s.care_staff.full_name} url={s.care_staff.photo_url} size={20} /><span className="text-[11px] font-semibold text-[#1e293b] truncate" style={font}>{s.care_staff.full_name}</span></span>
                              ) : s.status === 'scheduled' ? <span className="text-[11px] font-semibold text-amber-600" style={font}>No worker yet</span> : <span className="text-[11px] text-[#94A3B8]" style={font}>—</span>}
                            </span>
                            <Pill tone={st.tone}>{st.label}</Pill>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[10px] text-[#94A3B8] mt-1.5" style={font}>Click a shift to assign a worker or mark it done. Day {SHIFT_HOURS.day} · Night {SHIFT_HOURS.night}. <Link to="/dashboard/care/schedule" className="text-[#0A6070] hover:underline">Open the full schedule</Link></p>
          </div>
        </div>
      )}

      {payOpen && (
        <PaymentDrawer contractId={c.id} reference={c.reference} amountDue={due} amountPaid={paid} commitment={commitment}
          onClose={() => setPayOpen(false)} onSaved={async () => { setPayOpen(false); setMsg({ kind: 'ok', text: 'Payment recorded.' }); await refresh(); }} />
      )}
      {editOpen && <EditContractDrawer contract={c} onClose={() => setEditOpen(false)} onSaved={async text => { setEditOpen(false); setMsg({ kind: 'ok', text }); await refresh(); }} />}
      {assignOpen && <AssignWorkersDrawer contract={c} onClose={() => setAssignOpen(false)} onDone={async text => { setAssignOpen(false); setMsg({ kind: 'ok', text }); await refresh(); }} />}
      {shiftId && <ShiftDrawer shiftId={shiftId} onClose={() => setShiftId(null)} onChanged={refresh} />}
      {confirm === 'cancel' && <ConfirmDialog confirmLabel="Cancel contract" message={`Cancel contract ${c.reference}? Its future shifts will be cancelled. Completed shifts and payments stay on record.`} onConfirm={cancelContract} onCancel={() => setConfirm(null)} />}
      {confirm === 'delete' && <ConfirmDialog message={`Delete contract ${c.reference}? It has no payments or completed shifts.`} onConfirm={deleteContract} onCancel={() => setConfirm(null)} />}
      {confirm && typeof confirm === 'object' && <ConfirmDialog message={`Remove the payment of ${fmtRwf(confirm.payment.amount)}? The parent's balance will go up by that amount.`} confirmLabel="Remove" onConfirm={() => removePayment(confirm.payment)} onCancel={() => setConfirm(null)} />}
    </article>
  );
}

/* ───────────── edit terms ───────────── */

function EditContractDrawer({ contract: c, onClose, onSaved }: { contract: Contract; onClose: () => void; onSaved: (text: string) => void }) {
  const [start, setStart] = useState(c.start_date);
  const [end, setEnd] = useState(c.end_date);
  const [weekdays, setWeekdays] = useState<number[]>(c.weekdays);
  const [shiftType, setShiftType] = useState(c.shift_type);
  const [locType, setLocType] = useState(c.location_type);
  const [locDetail, setLocDetail] = useState(c.location_detail);
  const [notes, setNotes] = useState(c.notes);
  const [signedOn, setSignedOn] = useState(c.signed_on ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const patternChanged = start !== c.start_date || end !== c.end_date || shiftType !== c.shift_type || weekdays.slice().sort().join() !== c.weekdays.slice().sort().join();

  const save = async () => {
    setError('');
    if (!weekdays.length) { setError('Choose at least one day of the week.'); return; }
    if (end < start) { setError('The end date must be on or after the start date.'); return; }
    setSaving(true);
    const { error: e } = await supabase.from('care_contracts').update({
      start_date: start, end_date: end, weekdays, shift_type: shiftType, location_type: locType, location_detail: locDetail.trim(), notes: notes.trim(),
      signed_on: signedOn || null,
    }).eq('id', c.id);
    if (e) { setSaving(false); setError(friendlyError(e.message)); return; }
    let text = 'Contract updated.';
    if (patternChanged) {
      const { data, error: se } = await supabase.rpc('care_sync_shifts', { p_contract: c.id });
      if (se) { setSaving(false); setError(`Saved, but the shifts could not be updated: ${friendlyError(se.message)}`); return; }
      const r = (data as { added: number; removed: number }[] | null)?.[0];
      text = `Contract updated. Shifts: ${r?.added ?? 0} added, ${r?.removed ?? 0} removed. Completed shifts were left alone.`;
    }
    setSaving(false);
    onSaved(text);
  };

  return (
    <Drawer title="Edit contract terms" subtitle={c.reference} onClose={onClose} footer={
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-red-600 font-medium min-w-0" style={font}>{error}</p>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-[12px] font-semibold" style={font}>Cancel</button>
          <button onClick={save} disabled={saving} className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#0A6070] to-[#1AADA0] text-white text-[12px] font-semibold disabled:opacity-60" style={font}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    }>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><Lbl t="Start date" /><input type="date" value={start} onChange={e => setStart(e.target.value)} className={inp} /></div>
          <div><Lbl t="End date" /><input type="date" value={end} min={start} onChange={e => setEnd(e.target.value)} className={inp} /></div>
        </div>
        <div>
          <Lbl t="Days of the week" />
          <div className="flex flex-wrap gap-1.5">
            {[1, 2, 3, 4, 5, 6, 0].map(d => (
              <button key={d} type="button" aria-pressed={weekdays.includes(d)} onClick={() => setWeekdays(w => (w.includes(d) ? w.filter(x => x !== d) : [...w, d]))}
                className={`w-11 py-2 rounded-xl text-[11px] font-bold border ${weekdays.includes(d) ? 'bg-[#0A6070] border-[#0A6070] text-white' : 'bg-white border-slate-200 text-[#64748B]'}`} style={font}>{SHORT_DAYS[d]}</button>
            ))}
          </div>
        </div>
        <div><Lbl t="Shift" /><select value={shiftType} onChange={e => setShiftType(e.target.value as Contract['shift_type'])} className={inp}><option value="day">Day (8:00 AM – 8:00 PM)</option><option value="night">Night (8:00 PM – 8:00 AM)</option><option value="both">Both</option></select></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Lbl t="Where" /><select value={locType} onChange={e => setLocType(e.target.value as 'home' | 'hospital')} className={inp}><option value="home">At home</option><option value="hospital">In hospital</option></select></div>
          <div><Lbl t="Area / hospital" /><input value={locDetail} onChange={e => setLocDetail(e.target.value)} className={inp} /></div>
        </div>
        <div><Lbl t="Date signed" /><input type="date" value={signedOn} onChange={e => setSignedOn(e.target.value)} className={inp} /></div>
        <div><Lbl t="Notes" /><textarea value={notes} onChange={e => setNotes(e.target.value)} className={`${inp} min-h-[70px]`} /></div>
        {patternChanged && <Notice kind="warn">Changing dates, days or shift will update the shifts. Shifts that are still scheduled and no longer fit are removed, together with their worker. New dates get new shifts. Completed shifts are never touched. The price per shift does not change.</Notice>}
      </div>
    </Drawer>
  );
}

/* ───────────── assign workers to many shifts at once ───────────── */

function AssignWorkersDrawer({ contract: c, onClose, onDone }: { contract: Contract; onClose: () => void; onDone: (text: string) => void }) {
  const [dayStaff, setDayStaff] = useState<string | null>(null);
  const [nightStaff, setNightStaff] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const needsDay = c.shift_type !== 'night';
  const needsNight = c.shift_type !== 'day';

  const save = async () => {
    setError('');
    if (!dayStaff && !nightStaff) { setError('Choose at least one worker.'); return; }
    if (dayStaff && dayStaff === nightStaff) { setError('One person cannot do both the day and the night shift on the same day.'); return; }
    setSaving(true);
    const parts: string[] = [];
    for (const [kind, id] of [['day', dayStaff], ['night', nightStaff]] as [ShiftKind, string | null][]) {
      if (!id) continue;
      const r = await bulkAssign(c.id, kind, id);
      if (r.error) { setSaving(false); setError(r.error); return; }
      parts.push(`${r.assigned} ${kind} shift${r.assigned === 1 ? '' : 's'} assigned${r.skipped.length ? ` (${r.skipped.length} skipped because the worker was busy: ${r.skipped.map(d => fmtDay(d, false)).join(', ')})` : ''}`);
    }
    setSaving(false);
    onDone(parts.join('. ') + '.');
  };

  return (
    <Drawer title="Assign workers" subtitle={`${c.reference} · only shifts that have no worker yet`} onClose={onClose} footer={
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-red-600 font-medium min-w-0" style={font}>{error}</p>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-[12px] font-semibold" style={font}>Cancel</button>
          <button onClick={save} disabled={saving} className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#0A6070] to-[#1AADA0] text-white text-[12px] font-semibold disabled:opacity-60" style={font}>{saving ? 'Assigning…' : 'Assign'}</button>
        </div>
      </div>
    }>
      <div className="space-y-4">
        <p className="text-[11px] text-[#64748B]" style={font}>The chosen person is given every open shift of that kind on this contract. Days they are already busy are skipped, and you can fix those one by one.</p>
        {needsDay && <div><Lbl t="Day shifts (8:00 AM – 8:00 PM)" /><StaffSelect role={c.service_code} date={c.start_date} value={dayStaff} onChange={setDayStaff} /></div>}
        {needsNight && <div><Lbl t="Night shifts (8:00 PM – 8:00 AM)" /><StaffSelect role={c.service_code} date={c.start_date} value={nightStaff} onChange={setNightStaff} /></div>}
        <p className="text-[10px] text-[#94A3B8]" style={font}>The list shows who is free on the first day only; busy days later in the contract are skipped automatically.</p>
      </div>
    </Drawer>
  );
}

