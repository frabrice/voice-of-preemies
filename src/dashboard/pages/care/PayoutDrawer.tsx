import { useMemo, useState } from 'react';
import { Loader2, Smartphone } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import Drawer from '../../components/Drawer';
import { inp, Lbl } from '../../components/shared';
import { Avatar, CopyButton, METHOD_LABEL, PayoutRich, SHIFT_LABEL, fmtDay, fmtRwf, font, friendlyError, todayKey } from './shared';

interface Props {
  payouts: PayoutRich[];  // due payouts of ONE worker
  onClose: () => void;
  onPaid: (count: number, total: number) => void;
}

/** Marks a worker's pending payouts as paid, after you have sent the money (e.g. by MoMo). */
export default function PayoutDrawer({ payouts, onClose, onPaid }: Props) {
  const worker = payouts[0]?.care_staff;
  const [picked, setPicked] = useState<Set<string>>(new Set(payouts.map(p => p.id)));
  const [method, setMethod] = useState<'momo' | 'cash' | 'bank' | 'other'>('momo');
  const [reference, setReference] = useState('');
  const [paidOn, setPaidOn] = useState(todayKey());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const chosen = useMemo(() => payouts.filter(p => picked.has(p.id)), [payouts, picked]);
  const total = chosen.reduce((s, p) => s + p.net, 0);

  const toggle = (id: string) => setPicked(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const save = async () => {
    if (!chosen.length) { setError('Tick at least one shift.'); return; }
    setSaving(true); setError('');
    const { error: e } = await supabase.from('care_payouts')
      .update({ status: 'paid', paid_on: paidOn, method, reference: reference.trim() })
      .in('id', chosen.map(p => p.id)).eq('status', 'due');
    setSaving(false);
    if (e) { setError(friendlyError(e.message)); return; }
    onPaid(chosen.length, total);
  };

  return (
    <Drawer
      title={`Pay ${worker?.full_name ?? 'worker'}`}
      subtitle="Send the money first, then record it here"
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-red-600 font-medium min-w-0" style={font}>{error}</p>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={onClose} disabled={saving} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-[12px] font-semibold" style={font}>Cancel</button>
            <button onClick={save} disabled={saving || !chosen.length} className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-[#0A6070] to-[#1AADA0] text-white text-[12px] font-semibold disabled:opacity-60" style={font}>
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Mark {fmtRwf(total)} as paid
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {worker && (
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3.5">
            <Avatar name={worker.full_name} url={worker.photo_url} size={44} />
            <div className="min-w-0 flex-1" style={font}>
              <p className="text-[13px] font-bold text-[#0f172a] truncate">{worker.full_name}</p>
              {worker.momo_number ? (
                <p className="flex items-center gap-1.5 text-[12px] text-[#334155]"><Smartphone className="w-3.5 h-3.5 text-[#0A6070]" /> <b className="tracking-wide">{worker.momo_number}</b> {worker.momo_name && <span className="text-[#94A3B8]">· {worker.momo_name}</span>} <CopyButton text={worker.momo_number} /></p>
              ) : <p className="text-[11px] text-amber-700 font-semibold">No MoMo number saved. Add it on their page first.</p>}
            </div>
          </div>
        )}

        <div>
          <Lbl t="Shifts being paid" />
          <div className="rounded-xl border border-slate-100 divide-y divide-slate-50 overflow-hidden">
            {payouts.map(p => (
              <label key={p.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50/60">
                <input type="checkbox" checked={picked.has(p.id)} onChange={() => toggle(p.id)} className="accent-[#0A6070]" />
                <span className="min-w-0 flex-1" style={font}>
                  <span className="block text-[12px] font-semibold text-[#1e293b] truncate">{fmtDay(p.care_shifts?.shift_date)} · {p.care_shifts ? SHIFT_LABEL[p.care_shifts.shift] : ''}</span>
                  <span className="block text-[10px] text-[#94A3B8] truncate">{p.care_shifts?.care_contracts?.care_families?.full_name} · {p.care_shifts?.care_contracts?.reference}</span>
                </span>
                <span className="text-right" style={font}>
                  <span className="block text-[12px] font-bold text-[#0f172a]">{fmtRwf(p.net)}</span>
                  <span className="block text-[9px] text-[#94A3B8]">{fmtRwf(p.gross)} − {fmtRwf(p.fee)} fee</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div><Lbl t="Paid by" /><select value={method} onChange={e => setMethod(e.target.value as typeof method)} className={inp}>{Object.entries(METHOD_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div><Lbl t="Date paid" /><input type="date" value={paidOn} onChange={e => setPaidOn(e.target.value)} className={inp} /></div>
          <div className="col-span-2"><Lbl t="Transaction reference (optional)" /><input value={reference} onChange={e => setReference(e.target.value)} className={inp} placeholder="MoMo transaction ID" /></div>
        </div>
      </div>
    </Drawer>
  );
}
