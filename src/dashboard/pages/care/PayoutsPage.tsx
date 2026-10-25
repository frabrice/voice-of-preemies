import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Banknote, Download, Smartphone } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import PayoutDrawer from './PayoutDrawer';
import {
  Avatar, Btn, CareGate, CopyButton, Empty, Notice, PageTitle, PayoutRich, Pill, SERVICE_SHORT, SHIFT_LABEL, Stat, card, downloadCsv, fmtDay, fmtRwf, font, METHOD_LABEL, selectCls,
} from './shared';

const select = '*, care_shifts(shift_date, shift, contract_id, care_contracts(reference, care_families(full_name))), care_staff(id, full_name, role, photo_url, momo_number, momo_name)';

export default function PayoutsPage() {
  const [rows, setRows] = useState<PayoutRich[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState<'due' | 'paid'>('due');
  const [staffFilter, setStaffFilter] = useState('all');
  const [paying, setPaying] = useState<PayoutRich[] | null>(null);
  const [flash, setFlash] = useState('');

  const load = useCallback(async () => {
    const { data, error: e } = await supabase.from('care_payouts').select(select).order('created_at', { ascending: false });
    if (e) setError(e.message);
    setRows((data ?? []) as PayoutRich[]);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const due = rows.filter(r => r.status === 'due');
  const paid = rows.filter(r => r.status === 'paid');
  const people = useMemo(() => {
    const m = new Map<string, string>();
    rows.forEach(r => { if (r.care_staff) m.set(r.care_staff.id, r.care_staff.full_name); });
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const dueGroups = useMemo(() => {
    const m = new Map<string, PayoutRich[]>();
    due.filter(r => staffFilter === 'all' || r.staff_id === staffFilter).forEach(r => { const a = m.get(r.staff_id) ?? []; a.push(r); m.set(r.staff_id, a); });
    return [...m.values()].map(list => list.sort((a, b) => (a.care_shifts?.shift_date ?? '').localeCompare(b.care_shifts?.shift_date ?? '')))
      .sort((a, b) => b.reduce((s, p) => s + p.net, 0) - a.reduce((s, p) => s + p.net, 0));
  }, [due, staffFilter]);

  const paidShown = paid.filter(r => staffFilter === 'all' || r.staff_id === staffFilter)
    .sort((a, b) => (b.paid_on ?? '').localeCompare(a.paid_on ?? ''));

  const dueTotal = due.reduce((s, p) => s + p.net, 0);
  const paidTotal = paid.reduce((s, p) => s + p.net, 0);
  const feeTotal = rows.reduce((s, p) => s + p.fee, 0);

  const exportCsv = () => {
    const list = view === 'due' ? dueGroups.flat() : paidShown;
    downloadCsv(`payouts-${view}.csv`, [
      ['Worker', 'Role', 'MoMo number', 'Shift date', 'Shift', 'Family', 'Contract', 'Client rate', 'VoP fee', 'Net to worker', 'Status', 'Paid on', 'Method', 'Reference'],
      ...list.map(p => [p.care_staff?.full_name ?? '', p.care_staff ? SERVICE_SHORT[p.care_staff.role] : '', p.care_staff?.momo_number ?? '', p.care_shifts?.shift_date ?? '',
        p.care_shifts ? SHIFT_LABEL[p.care_shifts.shift] : '', p.care_shifts?.care_contracts?.care_families?.full_name ?? '', p.care_shifts?.care_contracts?.reference ?? '',
        p.gross, p.fee, p.net, p.status, p.paid_on ?? '', p.status === 'paid' ? METHOD_LABEL[p.method] : '', p.reference]),
    ]);
  };

  return (
    <CareGate>
      <PageTitle
        title="Payouts"
        subtitle="After each completed shift the worker’s share is added here automatically: the client rate minus the Voice of Preemies fee."
        action={<Btn variant="ghost" icon={Download} onClick={exportCsv}>Download list</Btn>}
      />
      {flash && <div className="mb-3"><Notice kind="ok" onClose={() => setFlash('')}>{flash}</Notice></div>}
      {error && <div className="mb-3"><Notice kind="error">Could not load payouts: {error}</Notice></div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label="Waiting to be paid" value={fmtRwf(dueTotal)} tone={dueTotal > 0 ? 'amber' : undefined} hint={`${due.length} shift${due.length === 1 ? '' : 's'} · ${new Set(due.map(d => d.staff_id)).size} people`} />
        <Stat label="Paid out so far" value={fmtRwf(paidTotal)} tone="green" hint={`${paid.length} shifts`} />
        <Stat label="VoP fees earned" value={fmtRwf(feeTotal)} hint="on completed shifts" />
        <Stat label="Shifts completed" value={String(rows.length)} />
      </div>

      <div className={`${card} p-3 mb-3 flex flex-wrap items-center gap-2`}>
        <div className="flex p-0.5 rounded-xl bg-slate-100">
          {(['due', 'paid'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} aria-pressed={view === v} className={`px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${view === v ? 'bg-white text-[#0A6070] shadow-sm' : 'text-[#64748B]'}`} style={font}>
              {v === 'due' ? `To pay (${due.length})` : `Paid (${paid.length})`}
            </button>
          ))}
        </div>
        <select value={staffFilter} onChange={e => setStaffFilter(e.target.value)} className={selectCls} style={font} aria-label="Filter by person">
          <option value="all">Everyone</option>
          {people.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
      </div>

      {loading ? <p className="text-[12px] text-[#94A3B8] text-center py-10" style={font}>Loading…</p> : view === 'due' ? (
        dueGroups.length === 0 ? (
          <div className={card}><Empty icon={Banknote} title="Nobody is waiting to be paid" hint="When a shift is marked completed, the worker’s payout shows up here." /></div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-3">
            {dueGroups.map(list => {
              const w = list[0].care_staff;
              const total = list.reduce((s, p) => s + p.net, 0);
              return (
                <section key={list[0].staff_id} className={`${card} overflow-hidden`}>
                  <div className="flex items-center gap-3 p-4">
                    <Avatar name={w?.full_name ?? '?'} url={w?.photo_url} size={44} />
                    <div className="min-w-0 flex-1" style={font}>
                      <Link to={`/dashboard/care/team/${list[0].staff_id}`} className="text-[13px] font-bold text-[#0f172a] hover:text-[#0A6070] truncate block">{w?.full_name}</Link>
                      {w?.momo_number ? (
                        <p className="flex items-center gap-1.5 text-[11px] text-[#334155]"><Smartphone className="w-3 h-3 text-[#0A6070]" /> <b>{w.momo_number}</b> <CopyButton text={w.momo_number} /></p>
                      ) : <p className="text-[11px] text-amber-700 font-semibold">No MoMo number saved</p>}
                    </div>
                    <div className="text-right" style={font}>
                      <p className="text-[16px] font-bold text-[#0f172a]">{fmtRwf(total)}</p>
                      <p className="text-[10px] text-[#94A3B8]">{list.length} shift{list.length === 1 ? '' : 's'}</p>
                    </div>
                  </div>
                  <div className="border-t border-slate-50 divide-y divide-slate-50 max-h-44 overflow-y-auto">
                    {list.map(p => (
                      <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-1.5 text-[11px]" style={font}>
                        <span className="text-[#334155] truncate">{fmtDay(p.care_shifts?.shift_date, false)} · {p.care_shifts ? SHIFT_LABEL[p.care_shifts.shift] : ''} <span className="text-[#94A3B8]">· {p.care_shifts?.care_contracts?.care_families?.full_name}</span></span>
                        <b>{fmtRwf(p.net)}</b>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 border-t border-slate-100 bg-slate-50/60 flex justify-end">
                    <Btn onClick={() => setPaying(list)}>Pay {fmtRwf(total)}</Btn>
                  </div>
                </section>
              );
            })}
          </div>
        )
      ) : (
        paidShown.length === 0 ? (
          <div className={card}><Empty icon={Banknote} title="Nothing paid out yet" /></div>
        ) : (
          <div className={`${card} overflow-x-auto`}>
            <table className="w-full text-[11px]" style={font}>
              <thead><tr className="text-left text-[9px] text-[#94A3B8] uppercase tracking-wider bg-slate-50"><th className="px-4 py-2">Paid on</th><th className="px-2 py-2">Worker</th><th className="px-2 py-2">Shift</th><th className="px-2 py-2">Family</th><th className="px-2 py-2 text-right">Amount</th><th className="px-4 py-2">How</th></tr></thead>
              <tbody className="divide-y divide-slate-50">
                {paidShown.map(p => (
                  <tr key={p.id}>
                    <td className="px-4 py-2 whitespace-nowrap">{fmtDay(p.paid_on)}</td>
                    <td className="px-2 py-2"><Link to={`/dashboard/care/team/${p.staff_id}`} className="font-semibold hover:text-[#0A6070]">{p.care_staff?.full_name}</Link></td>
                    <td className="px-2 py-2 whitespace-nowrap">{fmtDay(p.care_shifts?.shift_date, false)} · {p.care_shifts ? SHIFT_LABEL[p.care_shifts.shift] : ''}</td>
                    <td className="px-2 py-2 truncate max-w-[10rem]">{p.care_shifts?.care_contracts?.care_families?.full_name}</td>
                    <td className="px-2 py-2 text-right font-bold">{fmtRwf(p.net)}</td>
                    <td className="px-4 py-2 text-[#64748B]">{METHOD_LABEL[p.method]}{p.reference ? ` · ${p.reference}` : ''} <Pill tone="green">Paid</Pill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {paying && <PayoutDrawer payouts={paying} onClose={() => setPaying(null)} onPaid={async (n, total) => { setPaying(null); setFlash(`Recorded ${fmtRwf(total)} paid for ${n} shift${n === 1 ? '' : 's'}.`); await load(); }} />}
    </CareGate>
  );
}
