import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, XCircle, UserX, RotateCcw, Loader2, ExternalLink } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import Drawer from '../../components/Drawer';
import { inp, Lbl } from '../../components/shared';
import {
  Avatar, Btn, Notice, Pill, SERVICE_SHORT, SHIFT_HOURS, SHIFT_LABEL, ServiceCode, ShiftRich, Staff, assignShift, busyStaffOn,
  fmtDay, fmtKigaliTime, fmtRwf, font, friendlyError, setShiftStatus, shiftStatusTone, ShiftStatus,
} from './shared';

/** Picks a worker of the right type who is free on the shift's date. */
export function StaffSelect({ role, date, shiftId, value, onChange, disabled }: {
  role: ServiceCode; date: string; shiftId?: string; value: string | null; onChange: (id: string | null) => void; disabled?: boolean;
}) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    (async () => {
      const [{ data }, b] = await Promise.all([
        supabase.from('care_staff').select('*').eq('role', role).eq('status', 'active').is('deleted_at', null).order('full_name'),
        busyStaffOn(date, shiftId),
      ]);
      if (!live) return;
      setStaff((data ?? []) as Staff[]);
      setBusy(b);
      setLoading(false);
    })();
    return () => { live = false; };
  }, [role, date, shiftId]);

  return (
    <select value={value ?? ''} onChange={e => onChange(e.target.value || null)} disabled={disabled || loading} className={inp} style={font}>
      <option value="">{loading ? 'Loading…' : `Not assigned yet`}</option>
      {staff.map(s => (
        <option key={s.id} value={s.id} disabled={busy.has(s.id) && s.id !== value}>
          {s.full_name}{busy.has(s.id) && s.id !== value ? ' — busy that day' : ''}
        </option>
      ))}
      {!loading && staff.length === 0 && <option disabled>No active {SERVICE_SHORT[role].toLowerCase()}s yet</option>}
    </select>
  );
}

export default function ShiftDrawer({ shiftId, onClose, onChanged }: { shiftId: string; onClose: () => void; onChanged: () => void }) {
  const [shift, setShift] = useState<ShiftRich | null>(null);
  const [payout, setPayout] = useState<{ status: 'due' | 'paid'; net: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmUndo, setConfirmUndo] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from('care_shifts')
      .select('*, care_contracts(reference, family_id, service_code, location_type, location_detail, care_families(full_name)), care_staff(id, full_name, role, photo_url)')
      .eq('id', shiftId).maybeSingle();
    setShift((data as ShiftRich | null) ?? null);
    const { data: p } = await supabase.from('care_payouts').select('status, net').eq('shift_id', shiftId).maybeSingle();
    setPayout((p as { status: 'due' | 'paid'; net: number } | null) ?? null);
  }, [shiftId]);

  useEffect(() => { load(); }, [load]);

  const run = async (fn: () => Promise<string | null>) => {
    setBusy(true); setError('');
    const err = await fn();
    setBusy(false);
    if (err) { setError(err); return; }
    await load();
    onChanged();
  };

  if (!shift) {
    return <Drawer title="Shift" onClose={onClose}><p className="text-[12px] text-[#94A3B8] text-center py-8" style={font}>Loading…</p></Drawer>;
  }

  const c = shift.care_contracts;
  const role = c?.service_code ?? 'nurse';
  const st = shiftStatusTone(shift);
  const net = shift.rate_per_shift - shift.coordination_fee;
  const started = Date.parse(shift.starts_at) <= Date.now();
  const paid = payout?.status === 'paid';

  const setStatus = (status: ShiftStatus) => run(() => setShiftStatus(shift.id, status));

  return (
    <Drawer
      title={`${SHIFT_LABEL[shift.shift]} shift · ${fmtDay(shift.shift_date)}`}
      subtitle={`${fmtKigaliTime(shift.starts_at)} – ${fmtKigaliTime(shift.ends_at)}${shift.shift === 'night' ? ' (next morning)' : ''}`}
      onClose={onClose}
    >
      <div className="space-y-5">
        {error && <Notice kind="error" onClose={() => setError('')}>{error}</Notice>}

        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={st.tone}>{st.label}</Pill>
          <Pill tone="violet">{SERVICE_SHORT[role]}</Pill>
          {payout && <Pill tone={paid ? 'green' : 'amber'}>{paid ? 'Worker paid' : 'Payout due'}</Pill>}
        </div>

        <div className="rounded-xl bg-slate-50 p-3.5 space-y-1.5" style={font}>
          <div className="flex justify-between text-[12px]"><span className="text-[#64748B]">Family</span>
            {c ? <Link to={`/dashboard/care/families/${c.family_id}`} className="font-semibold text-[#0A6070] inline-flex items-center gap-1 hover:underline">{c.care_families?.full_name ?? 'Family'} <ExternalLink className="w-3 h-3" /></Link> : '—'}
          </div>
          <div className="flex justify-between text-[12px]"><span className="text-[#64748B]">Contract</span><span className="font-semibold text-[#1e293b]">{c?.reference}</span></div>
          <div className="flex justify-between text-[12px]"><span className="text-[#64748B]">Where</span><span className="font-semibold text-[#1e293b] text-right">{c?.location_type === 'hospital' ? 'Hospital' : 'Home'}{c?.location_detail ? ` · ${c.location_detail}` : ''}</span></div>
          <div className="flex justify-between text-[12px]"><span className="text-[#64748B]">Hours</span><span className="font-semibold text-[#1e293b]">{SHIFT_HOURS[shift.shift]}</span></div>
        </div>

        <div className="rounded-xl border border-slate-100 p-3.5 space-y-1.5" style={font}>
          <div className="flex justify-between text-[12px]"><span className="text-[#64748B]">Parent pays for this shift</span><span className="font-semibold">{fmtRwf(shift.rate_per_shift)}</span></div>
          <div className="flex justify-between text-[12px]"><span className="text-[#64748B]">Voice of Preemies fee</span><span className="font-semibold">− {fmtRwf(shift.coordination_fee)}</span></div>
          <div className="flex justify-between text-[13px] pt-1.5 border-t border-slate-100"><span className="font-bold text-[#1e293b]">Paid to the worker</span><span className="font-bold text-[#0A6070]">{fmtRwf(net)}</span></div>
        </div>

        <div>
          <Lbl t={`${SERVICE_SHORT[role]} on this shift`} />
          {shift.care_staff && (
            <Link to={`/dashboard/care/team/${shift.care_staff.id}`} className="flex items-center gap-2.5 mb-2 group">
              <Avatar name={shift.care_staff.full_name} url={shift.care_staff.photo_url} size={32} />
              <span className="text-[12px] font-semibold text-[#1e293b] group-hover:text-[#0A6070]" style={font}>{shift.care_staff.full_name}</span>
            </Link>
          )}
          <StaffSelect
            role={role} date={shift.shift_date} shiftId={shift.id} value={shift.staff_id}
            disabled={busy || paid || shift.status === 'cancelled'}
            onChange={id => run(() => assignShift(shift.id, id))}
          />
          {paid && <p className="text-[10px] text-[#94A3B8] mt-1" style={font}>This shift is already paid out, so the worker is locked.</p>}
        </div>

        <div>
          <Lbl t="Shift status" />
          <div className="flex flex-wrap gap-2">
            {shift.status === 'scheduled' && (
              <>
                <Btn icon={CheckCircle2} onClick={() => setStatus('completed')} disabled={busy || !shift.staff_id || !started} title={!shift.staff_id ? 'Assign a worker first' : !started ? 'The shift has not started yet' : undefined}>
                  Mark completed
                </Btn>
                <Btn variant="ghost" icon={UserX} onClick={() => setStatus('no_show')} disabled={busy || !started}>Worker did not come</Btn>
                <Btn variant="danger" icon={XCircle} onClick={() => setStatus('cancelled')} disabled={busy}>Cancel shift</Btn>
              </>
            )}
            {shift.status !== 'scheduled' && (
              <Btn variant="ghost" icon={RotateCcw} onClick={() => (shift.status === 'completed' ? setConfirmUndo(true) : setStatus('scheduled'))} disabled={busy || paid}>
                Put back to scheduled
              </Btn>
            )}
            {busy && <Loader2 className="w-4 h-4 animate-spin text-[#94A3B8] self-center" />}
          </div>
          {shift.status === 'scheduled' && !shift.staff_id && <p className="text-[10px] text-amber-700 mt-1.5" style={font}>Assign a worker before marking the shift completed.</p>}
          {shift.status === 'scheduled' && shift.staff_id && !started && <p className="text-[10px] text-[#94A3B8] mt-1.5" style={font}>You can mark the shift completed once it has started.</p>}
          {shift.status === 'completed' && !paid && <p className="text-[10px] text-[#64748B] mt-1.5" style={font}>The payout of {fmtRwf(net)} is waiting in Payouts.</p>}
          {confirmUndo && (
            <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800" style={font}>
              This will remove the pending payout of {fmtRwf(net)}. Continue?
              <div className="flex gap-2 mt-2">
                <Btn variant="ghost" onClick={() => setConfirmUndo(false)}>Keep it completed</Btn>
                <Btn onClick={async () => { setConfirmUndo(false); await setStatus('scheduled'); }}>Yes, put back</Btn>
              </div>
            </div>
          )}
        </div>

        <div>
          <Lbl t="Notes" />
          <NoteField shiftId={shift.id} initial={shift.notes} onSaved={onChanged} onError={m => setError(friendlyError(m))} />
        </div>
      </div>
    </Drawer>
  );
}

function NoteField({ shiftId, initial, onSaved, onError }: { shiftId: string; initial: string; onSaved: () => void; onError: (m: string) => void }) {
  const [v, setV] = useState(initial);
  const [saved, setSaved] = useState(false);
  const save = async () => {
    if (v === initial) return;
    const { error } = await supabase.from('care_shifts').update({ notes: v }).eq('id', shiftId);
    if (error) { onError(error.message); return; }
    setSaved(true); onSaved(); window.setTimeout(() => setSaved(false), 1500);
  };
  return (
    <div>
      <textarea value={v} onChange={e => setV(e.target.value)} onBlur={save} rows={3} className={`${inp} resize-y`} placeholder="Anything worth remembering about this shift" style={font} />
      {saved && <p className="text-[10px] text-emerald-600 mt-1" style={font}>Saved</p>}
    </div>
  );
}
