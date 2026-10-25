import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Pencil, Wallet, Phone, Mail, Smartphone, CreditCard, GraduationCap, Trash2, CalendarClock, UserRoundCheck } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import ConfirmDialog from '../../components/ConfirmDialog';
import { fmtDate } from '../../components/shared';
import { StaffForm } from './TeamPage';
import PayoutDrawer from './PayoutDrawer';
import ShiftDrawer from './ShiftDrawer';
import CareDocuments from './CareDocuments';
import {
  Avatar, Btn, CareGate, CopyButton, Empty, METHOD_LABEL, Notice, PageTitle, PayoutRich, Pill, SERVICE_LABEL, SHIFT_LABEL, ShiftRich, Staff, StaffTotals, Stat, SectionCard,
  card, fmtDay, fmtRwf, font, friendlyError, shiftStatusTone,
} from './shared';

const shiftSelect = '*, care_contracts(reference, family_id, service_code, location_type, location_detail, care_families(full_name)), care_staff(id, full_name, role, photo_url)';
const payoutSelect = '*, care_shifts(shift_date, shift, contract_id, care_contracts(reference, care_families(full_name))), care_staff(id, full_name, role, photo_url, momo_number, momo_name)';

export default function StaffDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [staff, setStaff] = useState<Staff | null>(null);
  const [totals, setTotals] = useState<StaffTotals | null>(null);
  const [upcoming, setUpcoming] = useState<ShiftRich[]>([]);
  const [payouts, setPayouts] = useState<PayoutRich[]>([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [paying, setPaying] = useState(false);
  const [shiftId, setShiftId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [flash, setFlash] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [showAllHistory, setShowAllHistory] = useState(false);

  const load = useCallback(async () => {
    const [s, t, sh, po] = await Promise.all([
      supabase.from('care_staff').select('*').eq('id', id).is('deleted_at', null).maybeSingle(),
      supabase.from('care_staff_totals').select('*').eq('staff_id', id).maybeSingle(),
      supabase.from('care_shifts').select(shiftSelect).eq('staff_id', id).eq('status', 'scheduled').order('shift_date').order('shift'),
      supabase.from('care_payouts').select(payoutSelect).eq('staff_id', id),
    ]);
    if (!s.data) { setMissing(true); setLoading(false); return; }
    setStaff(s.data as Staff);
    setTotals((t.data as StaffTotals | null) ?? null);
    setUpcoming((sh.data ?? []) as ShiftRich[]);
    setPayouts(((po.data ?? []) as PayoutRich[]).sort((a, b) => (b.care_shifts?.shift_date ?? '').localeCompare(a.care_shifts?.shift_date ?? '')));
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const due = useMemo(() => payouts.filter(p => p.status === 'due'), [payouts]);
  const paid = useMemo(() => payouts.filter(p => p.status === 'paid'), [payouts]);
  const paidGroups = useMemo(() => {
    const m = new Map<string, { date: string; method: string; reference: string; total: number; count: number }>();
    paid.forEach(p => {
      const key = `${p.paid_on}|${p.method}|${p.reference}`;
      const g = m.get(key) ?? { date: p.paid_on ?? '', method: p.method, reference: p.reference, total: 0, count: 0 };
      g.total += p.net; g.count += 1; m.set(key, g);
    });
    return [...m.values()].sort((a, b) => b.date.localeCompare(a.date));
  }, [paid]);

  if (loading) return <CareGate><p className="text-[12px] text-[#94A3B8] text-center py-16" style={font}>Loading…</p></CareGate>;
  if (missing || !staff) {
    return (
      <CareGate>
        <PageTitle title="Not found" back={{ to: '/dashboard/care/team', label: 'Care Team' }} />
        <div className={card}><Empty icon={UserRoundCheck} title="This person does not exist" hint="They may have been deleted." /></div>
      </CareGate>
    );
  }

  const nextShifts = upcoming.filter(s => Date.parse(s.ends_at) >= Date.now());
  const toConfirm = upcoming.filter(s => Date.parse(s.ends_at) < Date.now());
  const history = payouts.slice().sort((a, b) => (b.care_shifts?.shift_date ?? '').localeCompare(a.care_shifts?.shift_date ?? ''));
  const dueTotal = Number(totals?.due ?? 0);

  const remove = async () => {
    setDeleting(false);
    const { error } = await supabase.from('care_staff').update({ deleted_at: new Date().toISOString() }).eq('id', staff.id);
    if (error) { setFlash({ kind: 'error', text: friendlyError(error.message) }); return; }
    navigate('/dashboard/care/team');
  };
  const canDelete = payouts.length === 0 && upcoming.length === 0;

  return (
    <CareGate>
      <PageTitle
        title={staff.full_name}
        subtitle={`${SERVICE_LABEL[staff.role]} · work, pay and schedule`}
        back={{ to: '/dashboard/care/team', label: 'Care Team' }}
        action={<>
          {dueTotal > 0 && <Btn icon={Wallet} onClick={() => setPaying(true)}>Pay {fmtRwf(dueTotal)}</Btn>}
          <Btn variant="ghost" icon={Pencil} onClick={() => setEditing(true)}>Edit profile</Btn>
        </>}
      />
      {flash && <div className="mb-3"><Notice kind={flash.kind} onClose={() => setFlash(null)}>{flash.text}</Notice></div>}

      <div className="grid lg:grid-cols-[minmax(0,1fr)_20rem] gap-4 items-start">
        <div className="space-y-4 min-w-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Shifts done" value={String(totals?.shifts_completed ?? 0)} hint={`${totals?.shifts_upcoming ?? 0} coming up`} />
            <Stat label="Earned through VoP" value={fmtRwf(Number(totals?.earned ?? 0))} hint="after the VoP fee" />
            <Stat label="Already paid" value={fmtRwf(Number(totals?.paid ?? 0))} tone="green" />
            <Stat label="Waiting to be paid" value={fmtRwf(dueTotal)} tone={dueTotal > 0 ? 'amber' : undefined} hint={`${due.length} shift${due.length === 1 ? '' : 's'}`} />
          </div>

          {toConfirm.length > 0 && (
            <SectionCard title="Past shifts to confirm" subtitle="These have finished. Mark them completed so the worker is paid.">
              <ShiftList shifts={toConfirm} onOpen={setShiftId} />
            </SectionCard>
          )}

          <SectionCard title="Upcoming shifts" subtitle="Click a shift to change it">
            {nextShifts.length === 0 ? <Empty icon={CalendarClock} title="No upcoming shifts" hint="Shifts appear here once this person is assigned to a family’s schedule." /> : <ShiftList shifts={nextShifts} onOpen={setShiftId} />}
          </SectionCard>

          <SectionCard
            title="Work history and pay"
            subtitle="Every completed shift and what it paid"
            action={history.length > 8 ? <button onClick={() => setShowAllHistory(v => !v)} className="text-[11px] font-semibold text-[#0A6070] hover:underline" style={font}>{showAllHistory ? 'Show fewer' : `Show all ${history.length}`}</button> : undefined}
          >
            {history.length === 0 ? <Empty icon={Wallet} title="No completed shifts yet" /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]" style={font}>
                  <thead><tr className="text-left text-[9px] text-[#94A3B8] uppercase tracking-wider bg-slate-50"><th className="px-4 py-2">Date</th><th className="px-2 py-2">Family</th><th className="px-2 py-2 text-right">Client rate</th><th className="px-2 py-2 text-right">VoP fee</th><th className="px-2 py-2 text-right">Paid to worker</th><th className="px-4 py-2">Status</th></tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {(showAllHistory ? history : history.slice(0, 8)).map(p => (
                      <tr key={p.id}>
                        <td className="px-4 py-2 whitespace-nowrap">{fmtDay(p.care_shifts?.shift_date, false)} · {p.care_shifts ? SHIFT_LABEL[p.care_shifts.shift] : ''}</td>
                        <td className="px-2 py-2 truncate max-w-[10rem]">{p.care_shifts?.care_contracts?.care_families?.full_name}</td>
                        <td className="px-2 py-2 text-right text-[#64748B]">{fmtRwf(p.gross)}</td>
                        <td className="px-2 py-2 text-right text-[#64748B]">− {fmtRwf(p.fee)}</td>
                        <td className="px-2 py-2 text-right font-bold">{fmtRwf(p.net)}</td>
                        <td className="px-4 py-2">{p.status === 'paid' ? <Pill tone="green">Paid {fmtDay(p.paid_on, false)}</Pill> : <Pill tone="amber">Waiting</Pill>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Payments received" subtitle="Money VoP has sent to this person">
            {paidGroups.length === 0 ? <Empty icon={Wallet} title="Nothing paid yet" /> : (
              <div className="divide-y divide-slate-50">
                {paidGroups.map((g, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[11px]" style={font}>
                    <span className="text-[#334155]"><b>{fmtDate(g.date)}</b> <span className="text-[#94A3B8]">· {g.count} shift{g.count === 1 ? '' : 's'} · {METHOD_LABEL[g.method]}{g.reference ? ` · ${g.reference}` : ''}</span></span>
                    <b className="text-[12px]">{fmtRwf(g.total)}</b>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        <aside className="space-y-4 min-w-0">
          <div className={`${card} p-4`}>
            <div className="flex flex-col items-center text-center mb-4">
              <Avatar name={staff.full_name} url={staff.photo_url} size={88} />
              <p className="text-[15px] font-bold text-[#0f172a] mt-3" style={font}>{staff.full_name}</p>
              <div className="flex gap-1.5 mt-1.5">
                <Pill tone={staff.role === 'nurse' ? 'teal' : 'pink'}>{SERVICE_LABEL[staff.role]}</Pill>
                <Pill tone={staff.status === 'active' ? 'green' : staff.status === 'paused' ? 'amber' : 'slate'}>{staff.status === 'active' ? 'Active' : staff.status === 'paused' ? 'Paused' : 'Left'}</Pill>
              </div>
            </div>
            <dl className="space-y-3 text-[12px]" style={font}>
              <div className="rounded-xl bg-[#0A6070]/5 border border-[#0A6070]/10 p-3">
                <dt className="flex items-center gap-1.5 text-[9px] font-bold text-[#0A6070] uppercase tracking-wider"><Smartphone className="w-3 h-3" /> We pay on this MoMo number</dt>
                {staff.momo_number ? (
                  <dd className="mt-1 flex items-center justify-between gap-2"><span className="text-[15px] font-bold tracking-wide text-[#0f172a]">{staff.momo_number}</span><CopyButton text={staff.momo_number} /></dd>
                ) : <dd className="mt-1 text-amber-700 font-semibold text-[11px]">Not saved yet. <button onClick={() => setEditing(true)} className="underline">Add it</button></dd>}
                {staff.momo_name && <dd className="text-[10px] text-[#64748B]">Account name: {staff.momo_name}</dd>}
              </div>
              {staff.phone && <div className="flex items-start gap-2.5"><Phone className="w-3.5 h-3.5 text-[#94A3B8] mt-0.5" /><a href={`tel:${staff.phone}`} className="hover:text-[#0A6070]">{staff.phone}</a></div>}
              {staff.email && <div className="flex items-start gap-2.5"><Mail className="w-3.5 h-3.5 text-[#94A3B8] mt-0.5" /><a href={`mailto:${staff.email}`} className="hover:text-[#0A6070] break-all">{staff.email}</a></div>}
              {staff.national_id && <div className="flex items-start gap-2.5"><CreditCard className="w-3.5 h-3.5 text-[#94A3B8] mt-0.5" /><span>{staff.national_id}</span></div>}
              {staff.qualifications && <div className="flex items-start gap-2.5"><GraduationCap className="w-3.5 h-3.5 text-[#94A3B8] mt-0.5" /><span className="text-[#334155]">{staff.qualifications}</span></div>}
              <p className="text-[10px] text-[#94A3B8]">Contract signed: {staff.contract_signed_on ? fmtDate(staff.contract_signed_on) : 'not recorded'}</p>
            </dl>
            {staff.notes && <p className="text-[11px] text-[#64748B] bg-slate-50 rounded-xl p-3 mt-3" style={font}>{staff.notes}</p>}
          </div>

          <CareDocuments
            link={{ column: 'care_staff_id', id: staff.id }}
            categoryName="Nurse/Caregiver Contracts"
            title="Contract and documents"
            subtitle="Signed agreement, ID copy, certificates"
            uploadLabel="Upload"
          />

          {canDelete ? (
            <button onClick={() => setDeleting(true)} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#94A3B8] hover:text-red-500" style={font}><Trash2 className="w-3.5 h-3.5" /> Delete this person</button>
          ) : (
            <p className="text-[10px] text-[#94A3B8]" style={font}>This person has shifts or pay on record, so they can’t be deleted. Set their status to “Ended” instead. <Link to="/dashboard/care/payouts" className="text-[#0A6070] hover:underline">See all payouts</Link></p>
          )}
        </aside>
      </div>

      {editing && <StaffForm staff={staff} onClose={() => setEditing(false)} onSaved={async () => { setEditing(false); setFlash({ kind: 'ok', text: 'Profile saved.' }); await load(); }} />}
      {paying && due.length > 0 && <PayoutDrawer payouts={due} onClose={() => setPaying(false)} onPaid={async (n, total) => { setPaying(false); setFlash({ kind: 'ok', text: `Recorded ${fmtRwf(total)} paid for ${n} shift${n === 1 ? '' : 's'}.` }); await load(); }} />}
      {shiftId && <ShiftDrawer shiftId={shiftId} onClose={() => setShiftId(null)} onChanged={load} />}
      {deleting && <ConfirmDialog message={`Delete ${staff.full_name}? They have no shifts or pay on record.`} onConfirm={remove} onCancel={() => setDeleting(false)} />}
    </CareGate>
  );
}

function ShiftList({ shifts, onOpen }: { shifts: ShiftRich[]; onOpen: (id: string) => void }) {
  return (
    <div className="divide-y divide-slate-50">
      {shifts.map(s => {
        const st = shiftStatusTone(s);
        return (
          <button key={s.id} onClick={() => onOpen(s.id)} className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-slate-50/70">
            <span className="min-w-0" style={font}>
              <span className="block text-[12px] font-semibold text-[#1e293b]">{fmtDay(s.shift_date)} · {SHIFT_LABEL[s.shift]} shift</span>
              <span className="block text-[10px] text-[#94A3B8] truncate">{s.care_contracts?.care_families?.full_name} · {s.care_contracts?.location_type === 'hospital' ? 'Hospital' : 'Home'}{s.care_contracts?.location_detail ? `, ${s.care_contracts.location_detail}` : ''}</span>
            </span>
            <Pill tone={st.tone}>{st.label}</Pill>
          </button>
        );
      })}
    </div>
  );
}
