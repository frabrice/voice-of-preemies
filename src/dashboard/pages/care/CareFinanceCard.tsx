import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HeartHandshake } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAdminAuth } from '../../../contexts/AdminAuthContext';
import { fmtRwf, font, todayKey } from './shared';

interface Totals { received: number; paidOut: number; fees: number; owedByParents: number; owedToWorkers: number }

/** Home Care money for the Finance overview. All amounts are in Rwandan francs and are read-only here. */
export default function CareFinanceCard() {
  const { can } = useAdminAuth();
  const allowed = can('homecare');
  const [month, setMonth] = useState<Totals | null>(null);
  const [all, setAll] = useState<Totals | null>(null);

  useEffect(() => {
    if (!allowed) return;
    (async () => {
      const monthStart = `${todayKey().slice(0, 7)}-01`;
      const [pin, pout, totals, contracts] = await Promise.all([
        supabase.from('care_payments_in').select('amount, paid_on').is('deleted_at', null),
        supabase.from('care_payouts').select('net, fee, status, paid_on, created_at'),
        supabase.from('care_contract_totals').select('contract_id, balance'),
        supabase.from('care_contracts').select('id').neq('status', 'cancelled').is('deleted_at', null),
      ]);
      if (pin.error || pout.error) return;
      const live = new Set((contracts.data ?? []).map(c => c.id as string));
      const owed = ((totals.data ?? []) as { contract_id: string; balance: number }[]).filter(t => live.has(t.contract_id)).reduce((s, t) => s + Math.max(Number(t.balance), 0), 0);
      const payments = (pin.data ?? []) as { amount: number; paid_on: string }[];
      const payouts = (pout.data ?? []) as { net: number; fee: number; status: string; paid_on: string | null; created_at: string }[];
      const owedToWorkers = payouts.filter(p => p.status === 'due').reduce((s, p) => s + p.net, 0);
      const build = (since: string): Totals => ({
        received: payments.filter(p => p.paid_on >= since).reduce((s, p) => s + p.amount, 0),
        paidOut: payouts.filter(p => p.status === 'paid' && (p.paid_on ?? '') >= since).reduce((s, p) => s + p.net, 0),
        fees: payouts.filter(p => p.created_at.slice(0, 10) >= since).reduce((s, p) => s + p.fee, 0),
        owedByParents: owed, owedToWorkers,
      });
      setMonth(build(monthStart));
      setAll(build('0000-01-01'));
    })();
  }, [allowed]);

  if (!allowed || !month || !all) return null;

  const cells = (t: Totals) => [
    ['Received from parents', t.received, 'text-emerald-600'],
    ['Paid to nurses and caregivers', t.paidOut, 'text-[#1e293b]'],
    ['VoP fees kept', t.fees, 'text-[#0A6070]'],
  ] as const;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4" style={font}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="flex items-center gap-2 text-[12px] font-bold text-[#0f172a]"><HeartHandshake className="w-4 h-4 text-[#7C3AED]" /> Home Care <span className="font-normal text-[#94A3B8]">(RWF, kept separate from the totals above)</span></h3>
        <Link to="/dashboard/care/payouts" className="text-[11px] font-semibold text-[#0A6070] hover:underline">Open Home Care</Link>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {([['This month', month], ['All time', all]] as const).map(([label, t]) => (
          <div key={label}>
            <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1.5">{label}</p>
            <dl className="space-y-1.5 text-[12px]">
              {cells(t).map(([k, v, c]) => <div key={k} className="flex justify-between"><dt className="text-[#64748B]">{k}</dt><dd className={`font-bold ${c}`}>{fmtRwf(v)}</dd></div>)}
            </dl>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 pt-3 border-t border-slate-50 text-[11px] text-[#64748B]">
        <span>Still to collect from parents: <b className="text-amber-600">{fmtRwf(all.owedByParents)}</b></span>
        <span>Still to pay workers: <b className="text-amber-600">{fmtRwf(all.owedToWorkers)}</b></span>
      </div>
    </div>
  );
}
