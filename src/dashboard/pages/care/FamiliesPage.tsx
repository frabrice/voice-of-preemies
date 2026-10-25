import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, UsersRound, Phone, ChevronRight } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { SearchInput } from '../../components/shared';
import ContractWizard from './ContractWizard';
import {
  Avatar, Btn, CareGate, Contract, ContractTotals, Empty, Family, Notice, PageTitle, Pill, card, fmtDay, fmtRwf, font, selectCls, todayKey,
} from './shared';

type Row = { family: Family; contracts: Contract[]; due: number; paid: number; unassigned: number };

export default function FamiliesPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'owing' | 'ended'>('all');
  const [wizard, setWizard] = useState(false);
  const [flash, setFlash] = useState<{ kind: 'ok' | 'warn'; text: string } | null>(null);

  const load = useCallback(async () => {
    const [f, c, t] = await Promise.all([
      supabase.from('care_families').select('*').is('deleted_at', null).order('created_at', { ascending: false }),
      supabase.from('care_contracts').select('*').is('deleted_at', null),
      supabase.from('care_contract_totals').select('*'),
    ]);
    if (f.error || c.error || t.error) { setLoadError((f.error ?? c.error ?? t.error)!.message); setLoading(false); return; }
    const totals = new Map((t.data as ContractTotals[]).map(x => [x.contract_id, x]));
    const contracts = c.data as Contract[];
    setRows((f.data as Family[]).map(family => {
      const mine = contracts.filter(x => x.family_id === family.id);
      let due = 0, paid = 0, unassigned = 0;
      mine.filter(x => x.status !== 'cancelled').forEach(x => {
        const tt = totals.get(x.id);
        due += Number(tt?.amount_due ?? 0); paid += Number(tt?.amount_paid ?? 0); unassigned += Number(tt?.unassigned_shifts ?? 0);
      });
      return { family, contracts: mine, due, paid, unassigned };
    }));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const today = todayKey();
  const shown = useMemo(() => {
    const tokens = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return rows.filter(r => {
      const hay = `${r.family.full_name} ${r.family.phone} ${r.family.email} ${r.family.national_id} ${r.contracts.map(c => c.reference).join(' ')}`.toLowerCase();
      if (!tokens.every(t => hay.includes(t))) return false;
      const active = r.contracts.some(c => (c.status === 'active' || c.status === 'draft') && c.end_date >= today);
      if (filter === 'active') return active;
      if (filter === 'owing') return r.due - r.paid > 0;
      if (filter === 'ended') return r.contracts.length > 0 && !active;
      return true;
    });
  }, [rows, q, filter, today]);

  const owingTotal = rows.reduce((s, r) => s + Math.max(r.due - r.paid, 0), 0);

  return (
    <CareGate>
      <PageTitle
        title="Families"
        subtitle="Every parent, their contracts, the workers on their shifts and what they have paid."
        action={<Btn icon={Plus} onClick={() => setWizard(true)}>Add parent and contract</Btn>}
      />
      {flash && <div className="mb-3"><Notice kind={flash.kind} onClose={() => setFlash(null)}>{flash.text}</Notice></div>}
      {loadError && <div className="mb-3"><Notice kind="error">Could not load families: {loadError}</Notice></div>}

      <div className={`${card} p-3 mb-3 flex flex-wrap items-center gap-2`}>
        <SearchInput value={q} onChange={setQ} placeholder="Search name, phone, ID or contract number…" />
        <select value={filter} onChange={e => setFilter(e.target.value as typeof filter)} className={selectCls} style={font} aria-label="Filter families">
          <option value="all">All families ({rows.length})</option>
          <option value="active">With a running contract</option>
          <option value="owing">Owing money</option>
          <option value="ended">Only finished contracts</option>
        </select>
        {owingTotal > 0 && <span className="ml-auto text-[11px] text-[#64748B]" style={font}>Still to collect: <b className="text-amber-600">{fmtRwf(owingTotal)}</b></span>}
      </div>

      {loading ? <p className="text-[12px] text-[#94A3B8] text-center py-10" style={font}>Loading…</p> : shown.length === 0 ? (
        <div className={card}>
          <Empty icon={UsersRound} title={rows.length === 0 ? 'No families yet' : 'No families match'} hint={rows.length === 0 ? 'Add the first parent together with their contract. Shifts, workers and payment can all be set in one go.' : 'Try a different search or filter.'}
            action={rows.length === 0 ? <Btn icon={Plus} onClick={() => setWizard(true)}>Add parent and contract</Btn> : undefined} />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {shown.map(({ family: f, contracts, due, paid, unassigned }) => {
            const running = contracts.filter(c => (c.status === 'active' || c.status === 'draft') && c.end_date >= today);
            const balance = due - paid;
            const latest = [...contracts].sort((a, b) => b.start_date.localeCompare(a.start_date))[0];
            return (
              <Link key={f.id} to={`/dashboard/care/families/${f.id}`} className={`${card} p-4 hover:shadow-md hover:border-slate-200 transition-all block`}>
                <div className="flex items-start gap-3">
                  <Avatar name={f.full_name} size={42} tone="violet" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-[#0f172a] truncate" style={font}>{f.full_name}</p>
                    <p className="text-[11px] text-[#64748B] flex items-center gap-1 truncate" style={font}><Phone className="w-3 h-3" /> {f.phone || 'No phone'}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#CBD5E1] mt-1" />
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {running.length > 0 ? <Pill tone="green">{running.length} running contract{running.length > 1 ? 's' : ''}</Pill> : contracts.length ? <Pill tone="slate">Finished</Pill> : <Pill tone="amber">No contract</Pill>}
                  {balance > 0 && <Pill tone="amber">Owes {fmtRwf(balance)}</Pill>}
                  {unassigned > 0 && <Pill tone="red">{unassigned} shifts need a worker</Pill>}
                </div>
                {latest && <p className="text-[10px] text-[#94A3B8] mt-2.5" style={font}>{latest.reference} · {fmtDay(latest.start_date, false)} → {fmtDay(latest.end_date, false)}</p>}
              </Link>
            );
          })}
        </div>
      )}

      {wizard && (
        <ContractWizard
          onClose={() => setWizard(false)}
          onDone={(familyId, warnings) => {
            setWizard(false);
            if (warnings.length) setFlash({ kind: 'warn', text: warnings.join(' ') });
            navigate(`/dashboard/care/families/${familyId}`, { state: { warnings } });
          }}
        />
      )}
    </CareGate>
  );
}
