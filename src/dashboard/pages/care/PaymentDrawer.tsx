import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import Drawer from '../../components/Drawer';
import { inp, Lbl } from '../../components/shared';
import { METHOD_LABEL, fmtRwf, font, friendlyError, todayKey } from './shared';

interface Props {
  contractId: string;
  reference: string;
  amountDue: number;
  amountPaid: number;
  commitment: number;
  onClose: () => void;
  onSaved: () => void;
}

/** Records money received from a parent against one contract. */
export default function PaymentDrawer({ contractId, reference, amountDue, amountPaid, commitment, onClose, onSaved }: Props) {
  const balance = Math.max(amountDue - amountPaid, 0);
  const [amount, setAmount] = useState(String(amountPaid === 0 && commitment > 0 ? commitment : balance));
  const [kind, setKind] = useState<'commitment' | 'weekly' | 'balance' | 'other'>(amountPaid === 0 ? 'commitment' : 'weekly');
  const [method, setMethod] = useState<'momo' | 'cash' | 'bank' | 'other'>('momo');
  const [paidOn, setPaidOn] = useState(todayKey());
  const [reference_, setReference] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const quick = (v: number, k: typeof kind) => { setAmount(String(v)); setKind(k); };

  const save = async () => {
    setError('');
    const n = Math.round(Number(amount));
    if (!Number.isFinite(n) || n <= 0) { setError('Enter the amount received.'); return; }
    setSaving(true);
    const { error: e } = await supabase.from('care_payments_in').insert({
      contract_id: contractId, amount: n, kind, method, paid_on: paidOn, reference: reference_.trim(), note: note.trim(),
    });
    setSaving(false);
    if (e) { setError(friendlyError(e.message)); return; }
    onSaved();
  };

  const over = Number(amount) > balance && balance >= 0;

  return (
    <Drawer
      title="Record a payment"
      subtitle={`Contract ${reference}`}
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-red-600 font-medium min-w-0" style={font}>{error}</p>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={onClose} disabled={saving} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-[12px] font-semibold hover:bg-slate-200" style={font}>Cancel</button>
            <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-[#0A6070] to-[#1AADA0] text-white text-[12px] font-semibold disabled:opacity-60" style={font}>
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save payment
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="rounded-xl bg-slate-50 p-3.5 grid grid-cols-3 gap-2 text-center" style={font}>
          <div><p className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-wider">Total</p><p className="text-[13px] font-bold">{fmtRwf(amountDue)}</p></div>
          <div><p className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-wider">Paid</p><p className="text-[13px] font-bold text-emerald-600">{fmtRwf(amountPaid)}</p></div>
          <div><p className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-wider">Still owed</p><p className="text-[13px] font-bold text-amber-600">{fmtRwf(balance)}</p></div>
        </div>

        <div>
          <Lbl t="Quick fill" />
          <div className="flex flex-wrap gap-2">
            {commitment > 0 && <button type="button" onClick={() => quick(commitment, 'commitment')} className="px-3 py-1.5 rounded-lg bg-[#0A6070]/10 text-[#0A6070] text-[11px] font-semibold hover:bg-[#0A6070]/15" style={font}>Commitment fee · {fmtRwf(commitment)}</button>}
            {balance > 0 && <button type="button" onClick={() => quick(balance, 'balance')} className="px-3 py-1.5 rounded-lg bg-[#0A6070]/10 text-[#0A6070] text-[11px] font-semibold hover:bg-[#0A6070]/15" style={font}>Whole balance · {fmtRwf(balance)}</button>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div><Lbl t="Amount received (RWF)" /><input type="number" min={1} value={amount} onChange={e => setAmount(e.target.value)} className={inp} /></div>
          <div><Lbl t="Date" /><input type="date" value={paidOn} onChange={e => setPaidOn(e.target.value)} className={inp} /></div>
          <div><Lbl t="What is it for?" />
            <select value={kind} onChange={e => setKind(e.target.value as typeof kind)} className={inp}>
              <option value="commitment">Commitment fee (week 1)</option><option value="weekly">A week in advance</option><option value="balance">Remaining balance</option><option value="other">Other</option>
            </select></div>
          <div><Lbl t="Paid by" /><select value={method} onChange={e => setMethod(e.target.value as typeof method)} className={inp}>{Object.entries(METHOD_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        </div>
        {over && <p className="text-[11px] text-amber-700" style={font}>This is more than the {fmtRwf(balance)} currently owed. That is fine if the parent is paying ahead for shifts you will add later.</p>}
        <div><Lbl t="Reference (optional)" /><input value={reference_} onChange={e => setReference(e.target.value)} className={inp} placeholder="MoMo transaction ID or receipt number" /></div>
        <div><Lbl t="Note (optional)" /><input value={note} onChange={e => setNote(e.target.value)} className={inp} /></div>
      </div>
    </Drawer>
  );
}
