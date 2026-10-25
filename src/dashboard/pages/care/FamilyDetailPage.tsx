import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams, Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Phone, Mail, MapPin, CreditCard, Languages, FileText } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import Drawer from '../../components/Drawer';
import ConfirmDialog from '../../components/ConfirmDialog';
import { inp, ta, Lbl } from '../../components/shared';
import ContractWizard from './ContractWizard';
import ContractCard from './ContractCard';
import CareDocuments from './CareDocuments';
import {
  Avatar, Btn, CareGate, Contract, ContractTotals, Empty, Family, LANG_LABEL, Lang, Notice, PageTitle, SectionCard, Stat, card, fmtRwf, font, friendlyError,
} from './shared';

export default function FamilyDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [family, setFamily] = useState<Family | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [totals, setTotals] = useState<Map<string, ContractTotals>>(new Map());
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [wizard, setWizard] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [flash, setFlash] = useState<{ kind: 'ok' | 'warn' | 'error'; text: string } | null>(() => {
    const w = (location.state as { warnings?: string[] } | null)?.warnings;
    return w?.length ? { kind: 'warn', text: w.join(' ') } : null;
  });

  const load = useCallback(async () => {
    const [f, c, t] = await Promise.all([
      supabase.from('care_families').select('*').eq('id', id).is('deleted_at', null).maybeSingle(),
      supabase.from('care_contracts').select('*').eq('family_id', id).is('deleted_at', null).order('start_date', { ascending: false }),
      supabase.from('care_contract_totals').select('*'),
    ]);
    if (!f.data) { setMissing(true); setLoading(false); return; }
    setFamily(f.data as Family);
    const list = (c.data ?? []) as Contract[];
    setContracts(list);
    const ids = new Set(list.map(x => x.id));
    setTotals(new Map(((t.data ?? []) as ContractTotals[]).filter(x => ids.has(x.contract_id)).map(x => [x.contract_id, x])));
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <CareGate><p className="text-[12px] text-[#94A3B8] text-center py-16" style={font}>Loading…</p></CareGate>;
  if (missing || !family) {
    return (
      <CareGate>
        <PageTitle title="Family not found" back={{ to: '/dashboard/care/families', label: 'All families' }} />
        <div className={card}><Empty icon={FileText} title="This family does not exist" hint="It may have been deleted." /></div>
      </CareGate>
    );
  }

  const live = contracts.filter(c => c.status !== 'cancelled');
  const due = live.reduce((s, c) => s + Number(totals.get(c.id)?.amount_due ?? 0), 0);
  const paid = live.reduce((s, c) => s + Number(totals.get(c.id)?.amount_paid ?? 0), 0);
  const done = live.reduce((s, c) => s + Number(totals.get(c.id)?.completed_shifts ?? 0), 0);
  const all = live.reduce((s, c) => s + Number(totals.get(c.id)?.billable_shifts ?? 0), 0);
  const balance = due - paid;

  const remove = async () => {
    setDeleting(false);
    const { error } = await supabase.from('care_families').update({ deleted_at: new Date().toISOString() }).eq('id', family.id);
    if (error) { setFlash({ kind: 'error', text: friendlyError(error.message) }); return; }
    navigate('/dashboard/care/families');
  };

  return (
    <CareGate>
      <PageTitle
        title={family.full_name}
        subtitle="Parent profile, contracts, shifts and payments"
        back={{ to: '/dashboard/care/families', label: 'All families' }}
        action={<>
          <Btn variant="ghost" icon={Pencil} onClick={() => setEditing(true)}>Edit details</Btn>
          <Btn icon={Plus} onClick={() => setWizard(true)}>New contract</Btn>
        </>}
      />
      {flash && <div className="mb-3"><Notice kind={flash.kind} onClose={() => setFlash(null)}>{flash.text}</Notice></div>}

      <div className="grid lg:grid-cols-[minmax(0,1fr)_20rem] gap-4 items-start">
        <div className="space-y-4 min-w-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Contract total" value={fmtRwf(due)} hint={`${live.length} contract${live.length === 1 ? '' : 's'}`} />
            <Stat label="Paid so far" value={fmtRwf(paid)} tone="green" />
            <Stat label={balance < 0 ? 'Paid ahead' : 'Still owed'} value={fmtRwf(Math.abs(balance))} tone={balance > 0 ? 'amber' : 'green'} />
            <Stat label="Shifts done" value={`${done} / ${all}`} hint={all ? `${Math.round((done / all) * 100)}% complete` : undefined} />
          </div>

          <SectionCard title="Contracts" subtitle="Open one to see the payment plan, payments and every shift">
            {contracts.length === 0 ? (
              <Empty icon={FileText} title="No contracts yet" hint="Create the first contract to schedule shifts and record payments." action={<Btn icon={Plus} onClick={() => setWizard(true)}>New contract</Btn>} />
            ) : (
              <div className="p-3 space-y-3">
                {contracts.map(c => <ContractCard key={c.id} contract={c} totals={totals.get(c.id)} onChanged={load} defaultOpen={contracts.length === 1} />)}
              </div>
            )}
          </SectionCard>
        </div>

        <aside className="space-y-4 min-w-0">
          <div className={`${card} p-4`}>
            <div className="flex items-center gap-3 mb-3">
              <Avatar name={family.full_name} size={46} tone="violet" />
              <div className="min-w-0">
                <p className="text-[14px] font-bold text-[#0f172a] truncate" style={font}>{family.full_name}</p>
                <p className="text-[10px] text-[#94A3B8]" style={font}>Added {new Date(family.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
            </div>
            <dl className="space-y-2.5 text-[12px]" style={font}>
              <Row icon={Phone} value={family.phone} href={family.phone ? `tel:${family.phone}` : undefined} />
              <Row icon={Mail} value={family.email} href={family.email ? `mailto:${family.email}` : undefined} />
              <Row icon={CreditCard} value={family.national_id ? `ID / passport: ${family.national_id}` : ''} />
              <Row icon={MapPin} value={family.address} />
              <Row icon={Languages} value={`Contract in ${LANG_LABEL[family.preferred_language]}`} />
            </dl>
            {family.notes && <p className="text-[11px] text-[#64748B] bg-slate-50 rounded-xl p-3 mt-3" style={font}>{family.notes}</p>}
          </div>

          <CareDocuments
            link={{ column: 'care_family_id', id: family.id }}
            categoryName="Parent Service Contracts"
            title="Contracts and documents"
            subtitle="Signed agreements, ID copy"
            uploadLabel="Upload"
          />

          {contracts.length === 0 && (
            <button onClick={() => setDeleting(true)} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#94A3B8] hover:text-red-500" style={font}>
              <Trash2 className="w-3.5 h-3.5" /> Delete this family
            </button>
          )}
          <p className="text-[10px] text-[#94A3B8]" style={font}>Need a blank contract? <Link to="/dashboard/documents" className="text-[#0A6070] hover:underline">Open the Templates category</Link>.</p>
        </aside>
      </div>

      {editing && <FamilyForm family={family} onClose={() => setEditing(false)} onSaved={async () => { setEditing(false); setFlash({ kind: 'ok', text: 'Details saved.' }); await load(); }} />}
      {wizard && (
        <ContractWizard
          family={family}
          onClose={() => setWizard(false)}
          onDone={async (_id, warnings) => {
            setWizard(false);
            setFlash(warnings.length ? { kind: 'warn', text: warnings.join(' ') } : { kind: 'ok', text: 'Contract created with its shifts.' });
            await load();
          }}
        />
      )}
      {deleting && <ConfirmDialog message={`Delete ${family.full_name}? They have no contracts, so nothing else is affected.`} onConfirm={remove} onCancel={() => setDeleting(false)} />}
    </CareGate>
  );
}

function Row({ icon: Icon, value, href }: { icon: React.ComponentType<{ className?: string }>; value: string; href?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="w-3.5 h-3.5 text-[#94A3B8] mt-0.5 flex-shrink-0" />
      {href ? <a href={href} className="text-[#1e293b] hover:text-[#0A6070] break-all">{value}</a> : <span className="text-[#1e293b] break-words min-w-0">{value}</span>}
    </div>
  );
}

function FamilyForm({ family, onClose, onSaved }: { family: Family; onClose: () => void; onSaved: () => void }) {
  const [d, setD] = useState({ ...family });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (p: Partial<Family>) => setD(x => ({ ...x, ...p }));
  const save = async () => {
    if (!d.full_name.trim()) { setError('Please enter the parent’s name.'); return; }
    setSaving(true); setError('');
    const { error: e } = await supabase.from('care_families').update({
      full_name: d.full_name.trim(), national_id: d.national_id.trim(), phone: d.phone.trim(), email: d.email.trim(),
      address: d.address.trim(), preferred_language: d.preferred_language, notes: d.notes.trim(),
    }).eq('id', family.id);
    setSaving(false);
    if (e) { setError(friendlyError(e.message)); return; }
    onSaved();
  };
  return (
    <Drawer title="Edit parent details" onClose={onClose} footer={
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-red-600 font-medium min-w-0" style={font}>{error}</p>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-[12px] font-semibold" style={font}>Cancel</button>
          <button onClick={save} disabled={saving} className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#0A6070] to-[#1AADA0] text-white text-[12px] font-semibold disabled:opacity-60" style={font}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    }>
      <div className="space-y-4">
        <div><Lbl t="Full name" /><input value={d.full_name} onChange={e => set({ full_name: e.target.value })} className={inp} /></div>
        <div><Lbl t="National ID or passport number" /><input value={d.national_id} onChange={e => set({ national_id: e.target.value })} className={inp} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Lbl t="Phone" /><input value={d.phone} onChange={e => set({ phone: e.target.value })} className={inp} /></div>
          <div><Lbl t="Email" /><input type="email" value={d.email} onChange={e => set({ email: e.target.value })} className={inp} /></div>
        </div>
        <div><Lbl t="Home address" /><input value={d.address} onChange={e => set({ address: e.target.value })} className={inp} /></div>
        <div><Lbl t="Contract language" /><select value={d.preferred_language} onChange={e => set({ preferred_language: e.target.value as Lang })} className={inp}>{(Object.keys(LANG_LABEL) as Lang[]).map(l => <option key={l} value={l}>{LANG_LABEL[l]}</option>)}</select></div>
        <div><Lbl t="Notes" /><textarea value={d.notes} onChange={e => set({ notes: e.target.value })} className={ta} /></div>
      </div>
    </Drawer>
  );
}
