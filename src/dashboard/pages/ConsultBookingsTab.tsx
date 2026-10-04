import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { CalendarCheck, CheckCircle2, Phone, Mail, Building2, Clock, RefreshCw, Trash2, Baby, MessageSquare, Smartphone } from 'lucide-react';
import { EmptyState, SearchInput, notifyConsultUpdate } from '../components/shared';
import ConfirmDialog from '../components/ConfirmDialog';
import { BookingStatus, ConsultMode, MODE_LABEL, fmtRwf, fmtKigaliDateLong, fmtKigaliTime } from '../../lib/consult';

export interface BookingRow {
  id: string;
  reference: string;
  provider_id: string;
  starts_at: string;
  ends_at: string;
  mode: ConsultMode;
  parent_name: string;
  phone: string;
  email: string;
  topic: string | null;
  baby_age: string | null;
  payer_name: string;
  booking_fee: number;
  full_fee: number;
  status: BookingStatus;
  confirmed_at: string | null;
  created_at: string;
  consult_providers: { title: string; full_name: string } | null;
}

const font = { fontFamily: 'Plus Jakarta Sans, sans-serif' };
const serif = { fontFamily: 'Cormorant Garamond, serif' };
const DAY_MS = 24 * 60 * 60 * 1000;

const STATUS_STYLE: Record<BookingStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-slate-100 text-slate-600',
  expired: 'bg-slate-100 text-slate-500',
};

type Group = 'pending' | 'upcoming' | 'past' | 'closed';
const GROUPS: { id: Group; label: string }[] = [
  { id: 'pending', label: 'Needs payment check' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'past', label: 'Past' },
  { id: 'closed', label: 'Cancelled / expired' },
];

const holdLapsed = (b: BookingRow) => b.status === 'pending' && Date.now() - Date.parse(b.created_at) > DAY_MS;

function groupOf(b: BookingRow): Group {
  const now = Date.now();
  if (b.status === 'pending') return 'pending';
  if (b.status === 'cancelled' || b.status === 'expired') return 'closed';
  if (b.status === 'completed') return 'past';
  return Date.parse(b.ends_at) >= now ? 'upcoming' : 'past';
}

export default function ConsultBookingsTab({ onPendingCount }: { onPendingCount?: (n: number) => void }) {
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<Group>('pending');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'warn' | 'error'; text: string } | null>(null);
  const [cancelTarget, setCancelTarget] = useState<BookingRow | null>(null);
  const [removeTarget, setRemoveTarget] = useState<BookingRow | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('consult_bookings')
      .select('*, consult_providers(title, full_name)')
      .is('deleted_at', null)
      .order('starts_at', { ascending: false });
    const list = (data ?? []) as unknown as BookingRow[];
    setRows(list);
    setLoading(false);
    onPendingCount?.(list.filter(b => b.status === 'pending').length);
  }, [onPendingCount]);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    const c: Record<Group, number> = { pending: 0, upcoming: 0, past: 0, closed: 0 };
    rows.forEach(b => { c[groupOf(b)]++; });
    return c;
  }, [rows]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = rows
      .filter(b => groupOf(b) === group)
      .filter(b => !q || [b.parent_name, b.phone, b.email, b.reference, b.payer_name, b.consult_providers?.full_name]
        .some(v => v?.toLowerCase().includes(q)));
    // Upcoming reads best soonest-first; everything else newest-first.
    return group === 'upcoming' ? [...list].sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at)) : list;
  }, [rows, group, search]);

  const flash = (kind: 'ok' | 'warn' | 'error', text: string) => {
    setNotice({ kind, text });
    window.setTimeout(() => setNotice(n => (n?.text === text ? null : n)), 7000);
  };

  const confirmBooking = async (b: BookingRow) => {
    setBusyId(b.id);
    const { error } = await supabase
      .from('consult_bookings')
      .update({ status: 'confirmed', confirmed_at: new Date().toISOString(), cancelled_at: null })
      .eq('id', b.id);
    if (error) {
      flash('error', error.code === '23505'
        ? 'Cannot confirm: another booking now holds that time slot.'
        : 'Could not confirm this booking. Please try again.');
    } else {
      const sent = await notifyConsultUpdate(b.id, 'confirmed');
      flash(sent ? 'ok' : 'warn', sent
        ? `Confirmed. A confirmation email was sent to ${b.email}.`
        : 'Confirmed, but the confirmation email could not be sent. Use "Resend email" to try again.');
    }
    setBusyId(null);
    load();
  };

  const cancelBooking = async (b: BookingRow) => {
    setCancelTarget(null);
    setBusyId(b.id);
    const { error } = await supabase
      .from('consult_bookings')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', b.id);
    if (error) {
      flash('error', 'Could not cancel this booking. Please try again.');
    } else {
      const sent = await notifyConsultUpdate(b.id, 'cancelled');
      flash(sent ? 'ok' : 'warn', sent
        ? `Cancelled. ${b.parent_name} was emailed.`
        : 'Cancelled, but the cancellation email could not be sent. Use "Resend email" to try again.');
    }
    setBusyId(null);
    load();
  };

  const markCompleted = async (b: BookingRow) => {
    setBusyId(b.id);
    await supabase.from('consult_bookings').update({ status: 'completed' }).eq('id', b.id);
    setBusyId(null);
    load();
  };

  const resend = async (b: BookingRow) => {
    setBusyId(b.id);
    const sent = await notifyConsultUpdate(b.id, b.status === 'cancelled' ? 'cancelled' : 'confirmed');
    flash(sent ? 'ok' : 'warn', sent ? `Email sent to ${b.email}.` : 'The email could not be sent.');
    setBusyId(null);
  };

  const remove = async (b: BookingRow) => {
    setRemoveTarget(null);
    await supabase.from('consult_bookings').update({ deleted_at: new Date().toISOString() }).eq('id', b.id);
    load();
  };

  const noticeStyle = { ok: 'bg-emerald-50 text-emerald-700 border-emerald-100', warn: 'bg-amber-50 text-amber-700 border-amber-100', error: 'bg-red-50 text-red-700 border-red-100' };

  return (
    <div className="space-y-3">
      {notice && <div className={`text-[12px] font-medium rounded-xl border px-3 py-2 ${noticeStyle[notice.kind]}`} style={font}>{notice.text}</div>}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <SearchInput value={search} onChange={setSearch} placeholder="Search name, phone, reference, payer..." />
        <div className="flex flex-wrap gap-1">
          {GROUPS.map(g => (
            <button key={g.id} onClick={() => setGroup(g.id)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-colors ${group === g.id ? 'bg-[#0A6070] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`} style={font}>
              {g.label} <span className={group === g.id ? 'text-white/70' : 'text-slate-400'}>{counts[g.id]}</span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-[12px] text-[#94A3B8] text-center py-8">Loading...</p>
      ) : visible.length === 0 ? (
        <EmptyState icon={CalendarCheck} message={group === 'pending' ? 'No bookings are waiting for a payment check.' : 'Nothing here yet.'} />
      ) : (
        <div className="space-y-2">
          {visible.map(b => {
            const busy = busyId === b.id;
            const lapsed = holdLapsed(b);
            const who = b.consult_providers ? `${b.consult_providers.title ? b.consult_providers.title + ' ' : ''}${b.consult_providers.full_name}` : 'Provider';
            return (
              <div key={b.id} className="bg-white rounded-xl border border-slate-100 p-4">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[14px] font-bold text-[#1e293b]" style={serif}>{b.parent_name}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${STATUS_STYLE[b.status]}`} style={font}>{b.status}</span>
                      <span className="text-[10px] font-mono text-[#94A3B8]">{b.reference}</span>
                      {lapsed && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600" style={font}>24h hold lapsed</span>}
                    </div>
                    <p className="text-[12px] text-[#1e293b] font-semibold flex items-center gap-1.5" style={font}>
                      <Clock className="w-3 h-3 text-[#94A3B8]" />
                      {who} · {fmtKigaliDateLong(b.starts_at)}, {fmtKigaliTime(b.starts_at)}
                    </p>
                    <p className="text-[11px] text-[#64748B] flex flex-wrap items-center gap-x-3 gap-y-1" style={font}>
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{b.phone}</span>
                      <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{b.email}</span>
                      <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{MODE_LABEL[b.mode]}</span>
                    </p>
                    <p className="text-[11px] text-[#64748B] flex items-center gap-1" style={font}>
                      <Smartphone className="w-3 h-3" /> MoMo payer: <span className="font-semibold text-[#1e293b]">{b.payer_name}</span> · expecting <span className="font-semibold text-[#1e293b]">{fmtRwf(b.booking_fee)}</span>
                    </p>
                    {b.baby_age && <p className="text-[11px] text-[#64748B] flex items-center gap-1" style={font}><Baby className="w-3 h-3" /> Baby: {b.baby_age}</p>}
                    {b.topic && <p className="text-[11px] text-[#64748B] flex items-start gap-1" style={font}><MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0" /> <span>{b.topic}</span></p>}
                  </div>

                  <div className="flex flex-wrap lg:flex-col items-stretch gap-2 flex-shrink-0 lg:w-40">
                    {(b.status === 'pending' || b.status === 'expired') && (
                      <button onClick={() => confirmBooking(b)} disabled={busy}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#0A6070] text-white text-[11px] font-semibold disabled:opacity-60">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {busy ? 'Working...' : 'Mark paid & confirm'}
                      </button>
                    )}
                    {b.status === 'confirmed' && (
                      <>
                        <button onClick={() => markCompleted(b)} disabled={busy} className="px-3 py-2 rounded-xl bg-blue-50 text-blue-700 text-[11px] font-semibold disabled:opacity-60">Mark completed</button>
                        <button onClick={() => resend(b)} disabled={busy} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 text-slate-600 text-[11px] font-semibold disabled:opacity-60">
                          <RefreshCw className="w-3 h-3" /> Resend email
                        </button>
                      </>
                    )}
                    {(b.status === 'pending' || b.status === 'confirmed') && (
                      <button onClick={() => setCancelTarget(b)} disabled={busy} className="px-3 py-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 text-[11px] font-semibold disabled:opacity-60">Cancel booking</button>
                    )}
                    {b.status === 'cancelled' && (
                      <button onClick={() => resend(b)} disabled={busy} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 text-slate-600 text-[11px] font-semibold disabled:opacity-60">
                        <RefreshCw className="w-3 h-3" /> Resend email
                      </button>
                    )}
                    {(b.status === 'cancelled' || b.status === 'expired') && (
                      <button onClick={() => setRemoveTarget(b)} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[#94A3B8] hover:text-red-500 hover:bg-red-50 text-[11px] font-semibold">
                        <Trash2 className="w-3 h-3" /> Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {cancelTarget && (
        <ConfirmDialog
          message={`Cancel ${cancelTarget.parent_name}'s booking? They will be emailed, and the time slot opens up again. Refunds are handled separately.`}
          confirmLabel="Cancel booking"
          onConfirm={() => cancelBooking(cancelTarget)}
          onCancel={() => setCancelTarget(null)}
        />
      )}
      {removeTarget && (
        <ConfirmDialog
          message={`Remove this ${removeTarget.status} booking from the list?`}
          confirmLabel="Remove"
          onConfirm={() => remove(removeTarget)}
          onCancel={() => setRemoveTarget(null)}
        />
      )}
    </div>
  );
}
