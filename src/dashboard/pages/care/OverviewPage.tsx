import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, CalendarCheck, AlertTriangle, Inbox, Phone, Mail, ExternalLink, Pencil, Check, X, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { inp, Lbl, fmtDateTime } from '../../components/shared';
import ContractWizard, { WizardPrefill } from './ContractWizard';
import ShiftDrawer from './ShiftDrawer';
import {
  Btn, CareGate, CareRequest, ContractTotals, Empty, Notice, PageTitle, Pill, SERVICE_SHORT, SHIFT_LABEL, Service, ShiftRich, ShiftType, Stat, SectionCard,
  addDaysToKey, fmtDay, fmtRwf, font, friendlyError, setShiftStatus, shiftStatusTone, todayKey, SHIFT_TYPE_LABEL, SERVICE_LABEL,
} from './shared';
import { useNavigate } from 'react-router-dom';

const shiftSelect = '*, care_contracts(reference, family_id, service_code, location_type, location_detail, care_families(full_name)), care_staff(id, full_name, role, photo_url)';

export default function OverviewPage() {
  const navigate = useNavigate();
  const today = todayKey();
  const [todayShifts, setTodayShifts] = useState<ShiftRich[]>([]);
  const [attention, setAttention] = useState<ShiftRich[]>([]);
  const [openSoon, setOpenSoon] = useState<ShiftRich[]>([]);
  const [requests, setRequests] = useState<CareRequest[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [money, setMoney] = useState({ received: 0, paidOut: 0, due: 0, fees: 0, owed: 0 });
  const [loading, setLoading] = useState(true);
  const [wizard, setWizard] = useState<WizardPrefill | null>(null);
  const [shiftId, setShiftId] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ kind: 'ok' | 'warn' | 'error'; text: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editPrices, setEditPrices] = useState(false);

  const load = useCallback(async () => {
    const monthStart = `${today.slice(0, 7)}-01`;
    const nextWeek = addDaysToKey(today, 7);
    const [t, a, o, r, s, pin, pout, totals] = await Promise.all([
      supabase.from('care_shifts').select(shiftSelect).eq('shift_date', today).neq('status', 'cancelled').order('starts_at'),
      supabase.from('care_shifts').select(shiftSelect).eq('status', 'scheduled').lt('ends_at', new Date().toISOString()).order('starts_at'),
      supabase.from('care_shifts').select(shiftSelect).eq('status', 'scheduled').is('staff_id', null).gte('shift_date', today).lte('shift_date', nextWeek).order('starts_at'),
      supabase.from('care_requests').select('*').is('deleted_at', null).in('status', ['new', 'contacted']).order('created_at', { ascending: false }),
      supabase.from('care_services').select('*').order('code'),
      supabase.from('care_payments_in').select('amount').is('deleted_at', null).gte('paid_on', monthStart),
      supabase.from('care_payouts').select('net, fee, status, paid_on, created_at'),
      supabase.from('care_contract_totals').select('balance, contract_id'),
    ]);
    setTodayShifts((t.data ?? []) as ShiftRich[]);
    setAttention((a.data ?? []) as ShiftRich[]);
    setOpenSoon((o.data ?? []) as ShiftRich[]);
    setRequests((r.data ?? []) as CareRequest[]);
    setServices((s.data ?? []) as Service[]);
    const payouts = (pout.data ?? []) as { net: number; fee: number; status: string; paid_on: string | null; created_at: string }[];
    const { data: live } = await supabase.from('care_contracts').select('id').neq('status', 'cancelled').is('deleted_at', null);
    const liveIds = new Set((live ?? []).map(x => x.id as string));
    setMoney({
      received: ((pin.data ?? []) as { amount: number }[]).reduce((x, p) => x + p.amount, 0),
      paidOut: payouts.filter(p => p.status === 'paid' && (p.paid_on ?? '') >= monthStart).reduce((x, p) => x + p.net, 0),
      due: payouts.filter(p => p.status === 'due').reduce((x, p) => x + p.net, 0),
      fees: payouts.filter(p => p.created_at.slice(0, 7) === today.slice(0, 7)).reduce((x, p) => x + p.fee, 0),
      owed: ((totals.data ?? []) as Pick<ContractTotals, 'balance' | 'contract_id'>[]).filter(x => liveIds.has(x.contract_id)).reduce((x, p) => x + Math.max(Number(p.balance), 0), 0),
    });
    setLoading(false);
  }, [today]);

  useEffect(() => { load(); }, [load]);

  const quickStatus = async (s: ShiftRich, status: 'completed' | 'no_show') => {
    setBusyId(s.id);
    const err = await setShiftStatus(s.id, status);
    setBusyId(null);
    if (err) { setFlash({ kind: 'error', text: err }); return; }
    setFlash({ kind: 'ok', text: status === 'completed' ? 'Shift completed. The worker’s payout is now waiting in Payouts.' : 'Marked as a no-show.' });
    await load();
  };

  const setRequestStatus = async (r: CareRequest, status: CareRequest['status']) => {
    const { error } = await supabase.from('care_requests').update({ status }).eq('id', r.id);
    if (error) { setFlash({ kind: 'error', text: friendlyError(error.message) }); return; }
    await load();
  };

  const startFromRequest = (r: CareRequest) => setWizard({
    parent_name: r.parent_name, phone: r.phone, email: r.email, service: r.service === 'unsure' ? undefined : r.service,
    shift_type: r.shift === 'unsure' ? undefined : (r.shift as ShiftType), start_date: r.start_date ?? undefined,
    location_type: r.location_type, location_detail: r.location_detail, notes: [r.duration_note && `Wanted: ${r.duration_note}`, r.message].filter(Boolean).join(' · '), requestId: r.id,
  });

  return (
    <CareGate>
      <PageTitle
        title="Home Care"
        subtitle="Nurses and caregivers placed with families. What needs doing today, and where the money stands."
        action={<>
          <a href="/home-care" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0A6070] hover:underline" style={font}>Public page <ExternalLink className="w-3 h-3" /></a>
          <Btn icon={Plus} onClick={() => setWizard({})}>Add parent and contract</Btn>
        </>}
      />
      {flash && <div className="mb-3"><Notice kind={flash.kind} onClose={() => setFlash(null)}>{flash.text}</Notice></div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Stat label="Shifts today" value={String(todayShifts.length)} hint={`${todayShifts.filter(s => !s.staff_id && s.status === 'scheduled').length} without a worker`} />
        <Stat label="To confirm" value={String(attention.length)} tone={attention.length ? 'amber' : undefined} hint="finished, not marked yet" />
        <Stat label="Need a worker (7 days)" value={String(openSoon.length)} tone={openSoon.length ? 'red' : 'green'} />
        <Stat label="Waiting to be paid" value={fmtRwf(money.due)} tone={money.due ? 'amber' : undefined} hint="to nurses and caregivers" />
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_22rem] gap-4 items-start">
        <div className="space-y-4 min-w-0">
          {attention.length > 0 && (
            <SectionCard title="Confirm finished shifts" subtitle="Marking a shift completed adds the worker’s pay to Payouts">
              <div className="divide-y divide-slate-50">
                {attention.slice(0, 8).map(s => (
                  <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                    <button onClick={() => setShiftId(s.id)} className="text-left min-w-0" style={font}>
                      <span className="block text-[12px] font-semibold text-[#1e293b] truncate">{s.care_contracts?.care_families?.full_name} · {fmtDay(s.shift_date, false)} · {SHIFT_LABEL[s.shift]}</span>
                      <span className={`block text-[10px] ${s.care_staff ? 'text-[#64748B]' : 'text-amber-700 font-semibold'}`}>{s.care_staff?.full_name ?? 'No worker was assigned'}</span>
                    </button>
                    <div className="flex gap-1.5">
                      <Btn icon={busyId === s.id ? Loader2 : Check} onClick={() => quickStatus(s, 'completed')} disabled={busyId === s.id || !s.staff_id} title={!s.staff_id ? 'Assign a worker first' : undefined}>Completed</Btn>
                      <Btn variant="ghost" icon={X} onClick={() => quickStatus(s, 'no_show')} disabled={busyId === s.id}>No-show</Btn>
                    </div>
                  </div>
                ))}
                {attention.length > 8 && <p className="px-4 py-2 text-[11px] text-[#64748B]" style={font}>…and {attention.length - 8} more on the <Link to="/dashboard/care/schedule" className="text-[#0A6070] hover:underline">schedule</Link>.</p>}
              </div>
            </SectionCard>
          )}

          <SectionCard title="Today" subtitle={fmtDay(today)} action={<Link to="/dashboard/care/schedule" className="text-[11px] font-semibold text-[#0A6070] hover:underline" style={font}>Full schedule</Link>}>
            {loading ? <p className="text-[12px] text-[#94A3B8] text-center py-6" style={font}>Loading…</p> : todayShifts.length === 0 ? (
              <Empty icon={CalendarCheck} title="No shifts today" hint="Shifts appear here when a contract covers today." />
            ) : (
              <div className="divide-y divide-slate-50">
                {todayShifts.map(s => {
                  const st = shiftStatusTone(s);
                  return (
                    <button key={s.id} onClick={() => setShiftId(s.id)} className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-slate-50/70">
                      <span className="min-w-0" style={font}>
                        <span className="block text-[12px] font-semibold text-[#1e293b] truncate">{s.care_contracts?.care_families?.full_name}</span>
                        <span className={`block text-[10px] ${s.care_staff ? 'text-[#64748B]' : 'text-amber-700 font-semibold'}`}>{SHIFT_LABEL[s.shift]} · {s.care_staff?.full_name ?? 'No worker yet'}</span>
                      </span>
                      <Pill tone={st.tone}>{st.label}</Pill>
                    </button>
                  );
                })}
              </div>
            )}
          </SectionCard>

          {openSoon.length > 0 && (
            <SectionCard title="Shifts that still need a worker" subtitle="Next 7 days">
              <div className="divide-y divide-slate-50">
                {openSoon.slice(0, 10).map(s => (
                  <button key={s.id} onClick={() => setShiftId(s.id)} className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-slate-50/70">
                    <span style={font}>
                      <span className="block text-[12px] font-semibold text-[#1e293b]">{s.care_contracts?.care_families?.full_name}</span>
                      <span className="block text-[10px] text-[#64748B]">{fmtDay(s.shift_date)} · {SHIFT_LABEL[s.shift]} · needs a {s.care_contracts ? SERVICE_SHORT[s.care_contracts.service_code].toLowerCase() : 'worker'}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600"><AlertTriangle className="w-3 h-3" /> Assign</span>
                  </button>
                ))}
              </div>
            </SectionCard>
          )}
        </div>

        <aside className="space-y-4 min-w-0">
          <SectionCard title="This month" subtitle="In Rwandan francs">
            <dl className="p-4 space-y-2.5 text-[12px]" style={font}>
              <div className="flex justify-between"><dt className="text-[#64748B]">Received from parents</dt><dd className="font-bold text-emerald-600">{fmtRwf(money.received)}</dd></div>
              <div className="flex justify-between"><dt className="text-[#64748B]">Paid to workers</dt><dd className="font-bold">{fmtRwf(money.paidOut)}</dd></div>
              <div className="flex justify-between"><dt className="text-[#64748B]">VoP fees earned</dt><dd className="font-bold text-[#0A6070]">{fmtRwf(money.fees)}</dd></div>
              <div className="flex justify-between pt-2 border-t border-slate-100"><dt className="text-[#64748B]">Still to collect from parents</dt><dd className="font-bold text-amber-600">{fmtRwf(money.owed)}</dd></div>
              <div className="flex justify-between"><dt className="text-[#64748B]">Still to pay workers</dt><dd className="font-bold text-amber-600">{fmtRwf(money.due)}</dd></div>
            </dl>
          </SectionCard>

          <SectionCard title="Requests from the website" subtitle="People who asked for a nurse or caregiver">
            {requests.length === 0 ? <Empty icon={Inbox} title="No new requests" hint="Requests sent from the public Home Care page appear here." /> : (
              <div className="divide-y divide-slate-50">
                {requests.map(r => (
                  <div key={r.id} className="p-4 space-y-2" style={font}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[12px] font-bold text-[#0f172a] truncate">{r.parent_name}</p>
                        <p className="text-[10px] text-[#94A3B8]">{r.reference} · {fmtDateTime(r.created_at)}</p>
                      </div>
                      <Pill tone={r.status === 'new' ? 'red' : 'amber'}>{r.status === 'new' ? 'New' : 'Contacted'}</Pill>
                    </div>
                    <p className="text-[11px] text-[#334155]">
                      {r.service === 'unsure' ? 'Not sure which service' : SERVICE_LABEL[r.service]} · {r.shift === 'unsure' ? 'shift not chosen' : SHIFT_TYPE_LABEL[r.shift]}
                      {r.start_date ? ` · from ${fmtDay(r.start_date)}` : ''}{r.duration_note ? ` · ${r.duration_note}` : ''} · {r.location_type === 'hospital' ? 'hospital' : 'home'}{r.location_detail ? `, ${r.location_detail}` : ''}
                    </p>
                    {r.message && <p className="text-[11px] text-[#64748B] bg-slate-50 rounded-lg p-2">{r.message}</p>}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                      <a href={`tel:${r.phone}`} className="inline-flex items-center gap-1 text-[#0A6070] font-semibold"><Phone className="w-3 h-3" /> {r.phone}</a>
                      {r.email && <a href={`mailto:${r.email}`} className="inline-flex items-center gap-1 text-[#0A6070] font-semibold"><Mail className="w-3 h-3" /> {r.email}</a>}
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <Btn onClick={() => startFromRequest(r)}>Create contract</Btn>
                      {r.status === 'new' && <Btn variant="ghost" onClick={() => setRequestStatus(r, 'contacted')}>Mark contacted</Btn>}
                      <Btn variant="ghost" onClick={() => setRequestStatus(r, 'declined')}>Dismiss</Btn>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Prices" subtitle="Used for new contracts only" action={<button onClick={() => setEditPrices(true)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0A6070] hover:underline" style={font}><Pencil className="w-3 h-3" /> Change</button>}>
            <div className="p-4 space-y-2.5">
              {services.map(s => (
                <div key={s.code} className="rounded-xl bg-slate-50 p-3" style={font}>
                  <p className="text-[12px] font-bold text-[#0f172a]">{s.label}</p>
                  <p className="text-[11px] text-[#64748B]">{fmtRwf(s.rate_per_shift)} per shift · VoP keeps {fmtRwf(s.coordination_fee)} · worker gets <b className="text-[#0A6070]">{fmtRwf(s.rate_per_shift - s.coordination_fee)}</b></p>
                </div>
              ))}
            </div>
          </SectionCard>
        </aside>
      </div>

      {wizard && (
        <ContractWizard
          prefill={wizard}
          onClose={() => setWizard(null)}
          onDone={(familyId, warnings) => { setWizard(null); navigate(`/dashboard/care/families/${familyId}`, { state: { warnings } }); }}
        />
      )}
      {shiftId && <ShiftDrawer shiftId={shiftId} onClose={() => setShiftId(null)} onChanged={load} />}
      {editPrices && <PricesDrawer services={services} onClose={() => setEditPrices(false)} onSaved={async () => { setEditPrices(false); setFlash({ kind: 'ok', text: 'Prices updated. Existing contracts keep their old price.' }); await load(); }} />}
    </CareGate>
  );
}

function PricesDrawer({ services, onClose, onSaved }: { services: Service[]; onClose: () => void; onSaved: () => void }) {
  const [vals, setVals] = useState(Object.fromEntries(services.map(s => [s.code, { rate: String(s.rate_per_shift), fee: String(s.coordination_fee) }])));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setError('');
    for (const s of services) {
      const r = Number(vals[s.code].rate), f = Number(vals[s.code].fee);
      if (!Number.isInteger(r) || r <= 0) { setError(`Enter a valid price for ${s.label}.`); return; }
      if (!Number.isInteger(f) || f < 0 || f >= r) { setError(`The fee for ${s.label} must be less than the price.`); return; }
    }
    setSaving(true);
    for (const s of services) {
      const { error: e } = await supabase.from('care_services').update({ rate_per_shift: Number(vals[s.code].rate), coordination_fee: Number(vals[s.code].fee), updated_at: new Date().toISOString() }).eq('code', s.code);
      if (e) { setSaving(false); setError(friendlyError(e.message)); return; }
    }
    setSaving(false);
    onSaved();
  };

  // Local import of Drawer is avoided to keep this file light: a simple modal.
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 space-y-4">
        <div><h3 className="text-[15px] font-bold text-[#0f172a]" style={font}>Change prices</h3><p className="text-[11px] text-[#64748B]" style={font}>Only contracts created from now on use the new prices. Existing contracts and shifts keep the price they were signed at.</p></div>
        {services.map(s => (
          <div key={s.code} className="rounded-xl border border-slate-100 p-3 space-y-2">
            <p className="text-[12px] font-bold text-[#0f172a]" style={font}>{s.label}</p>
            <div className="grid grid-cols-2 gap-3">
              <div><Lbl t="Price per shift (RWF)" /><input type="number" min={1} value={vals[s.code].rate} onChange={e => setVals(v => ({ ...v, [s.code]: { ...v[s.code], rate: e.target.value } }))} className={inp} /></div>
              <div><Lbl t="VoP fee per shift (RWF)" /><input type="number" min={0} value={vals[s.code].fee} onChange={e => setVals(v => ({ ...v, [s.code]: { ...v[s.code], fee: e.target.value } }))} className={inp} /></div>
            </div>
            <p className="text-[10px] text-[#64748B]" style={font}>Worker receives {fmtRwf(Math.max((Number(vals[s.code].rate) || 0) - (Number(vals[s.code].fee) || 0), 0))} per shift.</p>
          </div>
        ))}
        {error && <p className="text-[11px] text-red-600 font-medium" style={font}>{error}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-[12px] font-semibold" style={font}>Cancel</button>
          <button onClick={save} disabled={saving} className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#0A6070] to-[#1AADA0] text-white text-[12px] font-semibold disabled:opacity-60" style={font}>{saving ? 'Saving…' : 'Save prices'}</button>
        </div>
      </div>
    </div>
  );
}

