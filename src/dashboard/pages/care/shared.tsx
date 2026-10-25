import { useState, type ComponentType, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Copy, Check, ChevronRight } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAdminAuth } from '../../../contexts/AdminAuthContext';
import { addDaysToKey, kigaliDayKey, initials } from '../../../lib/consult';

export { addDaysToKey, kigaliDayKey, initials };
export { fmtRwf, fmtKigaliTime, fmtKigaliDateShort, fmtKigaliDateLong, fmtKigaliDateTime, WEEKDAYS, WEEKDAY_ORDER } from '../../../lib/consult';

export const font = { fontFamily: 'Plus Jakarta Sans, sans-serif' };
export const serif = { fontFamily: 'Cormorant Garamond, serif' };

/* ───────────── types ───────────── */

export type ServiceCode = 'nurse' | 'caregiver';
export type ShiftKind = 'day' | 'night';
export type ShiftType = ShiftKind | 'both';
export type ShiftStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';
export type Lang = 'en' | 'fr' | 'rw';

export interface Service { code: ServiceCode; label: string; rate_per_shift: number; coordination_fee: number }

export interface Staff {
  id: string; role: ServiceCode; full_name: string; phone: string; momo_number: string; momo_name: string; email: string;
  national_id: string; photo_url: string; qualifications: string; status: 'active' | 'paused' | 'ended';
  contract_signed_on: string | null; notes: string; created_at: string; deleted_at: string | null;
}

export interface Family {
  id: string; full_name: string; national_id: string; phone: string; email: string; address: string;
  preferred_language: Lang; notes: string; created_at: string; deleted_at: string | null;
}

export interface Contract {
  id: string; reference: string; family_id: string; service_code: ServiceCode; rate_per_shift: number; coordination_fee: number;
  start_date: string; end_date: string; weekdays: number[]; shift_type: ShiftType; location_type: 'home' | 'hospital';
  location_detail: string; language: Lang; status: 'draft' | 'active' | 'completed' | 'cancelled'; signed_on: string | null;
  notes: string; created_at: string; deleted_at: string | null;
}

export interface ContractTotals {
  contract_id: string; billable_shifts: number; completed_shifts: number; unassigned_shifts: number;
  amount_due: number; amount_paid: number; balance: number;
}

export interface Shift {
  id: string; contract_id: string; shift_date: string; shift: ShiftKind; starts_at: string; ends_at: string; staff_id: string | null;
  rate_per_shift: number; coordination_fee: number; status: ShiftStatus; completed_at: string | null; notes: string;
}

export interface ShiftRich extends Shift {
  care_contracts: { reference: string; family_id: string; service_code: ServiceCode; location_type: 'home' | 'hospital'; location_detail: string; care_families: { full_name: string } | null } | null;
  care_staff: { id: string; full_name: string; role: ServiceCode; photo_url: string } | null;
}

export interface PaymentIn {
  id: string; contract_id: string; amount: number; paid_on: string; method: 'momo' | 'cash' | 'bank' | 'other';
  kind: 'commitment' | 'weekly' | 'balance' | 'other'; reference: string; note: string; created_at: string; deleted_at: string | null;
}

export interface Payout {
  id: string; shift_id: string; staff_id: string; gross: number; fee: number; net: number; status: 'due' | 'paid';
  paid_on: string | null; method: 'momo' | 'cash' | 'bank' | 'other'; reference: string; created_at: string;
}

export interface PayoutRich extends Payout {
  care_shifts: { shift_date: string; shift: ShiftKind; contract_id: string; care_contracts: { reference: string; care_families: { full_name: string } | null } | null } | null;
  care_staff: { id: string; full_name: string; role: ServiceCode; photo_url: string; momo_number: string; momo_name: string } | null;
}

export interface StaffTotals { staff_id: string; shifts_completed: number; shifts_upcoming: number; earned: number; paid: number; due: number; fees_generated: number }

export interface CareRequest {
  id: string; reference: string; parent_name: string; phone: string; email: string; service: ServiceCode | 'unsure';
  shift: ShiftType | 'unsure'; start_date: string | null; duration_note: string; location_type: 'home' | 'hospital';
  location_detail: string; message: string; status: 'new' | 'contacted' | 'converted' | 'declined'; family_id: string | null; created_at: string;
}

/* ───────────── labels ───────────── */

export const SERVICE_LABEL: Record<ServiceCode, string> = { nurse: 'Professional Nurse', caregiver: 'Trained Baby Caregiver' };
export const SERVICE_SHORT: Record<ServiceCode, string> = { nurse: 'Nurse', caregiver: 'Caregiver' };
export const SHIFT_LABEL: Record<ShiftKind, string> = { day: 'Day', night: 'Night' };
export const SHIFT_HOURS: Record<ShiftKind, string> = { day: '8:00 AM – 8:00 PM', night: '8:00 PM – 8:00 AM' };
export const SHIFT_TYPE_LABEL: Record<ShiftType, string> = { day: 'Day shift', night: 'Night shift', both: 'Day and night' };
export const LANG_LABEL: Record<Lang, string> = { en: 'English', fr: 'Français', rw: 'Kinyarwanda' };
export const METHOD_LABEL: Record<string, string> = { momo: 'Mobile Money', cash: 'Cash', bank: 'Bank transfer', other: 'Other' };
export const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const todayKey = () => kigaliDayKey(new Date());

/** "2026-12-01" → "Tue 1 Dec 2026", without any time-zone drift. */
export function fmtDay(key: string | null | undefined, withYear = true): string {
  if (!key) return '—';
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}) }).format(new Date(`${key}T12:00:00Z`));
}

export const dowOf = (key: string) => new Date(`${key}T12:00:00Z`).getUTCDay();

export function weekdaySummary(days: number[]): string {
  const set = new Set(days);
  if (set.size === 7) return 'Every day';
  const order = [1, 2, 3, 4, 5, 6, 0].filter(d => set.has(d));
  if (order.length === 5 && !set.has(6) && !set.has(0)) return 'Mon – Fri';
  return order.map(d => SHORT_DAYS[d]).join(', ');
}

/** The shifts a contract pattern produces. Mirrors the database function care_sync_shifts. */
export function enumerateShifts(start: string, end: string, weekdays: number[], type: ShiftType): { date: string; shift: ShiftKind }[] {
  const out: { date: string; shift: ShiftKind }[] = [];
  if (!start || !end || end < start || weekdays.length === 0) return out;
  const kinds: ShiftKind[] = type === 'both' ? ['day', 'night'] : [type];
  for (let d = start, guard = 0; d <= end && guard < 400; d = addDaysToKey(d, 1), guard++) {
    if (weekdays.includes(dowOf(d))) kinds.forEach(k => out.push({ date: d, shift: k }));
  }
  return out;
}

export const daysBetween = (start: string, end: string) =>
  Math.round((Date.parse(`${end}T12:00:00Z`) - Date.parse(`${start}T12:00:00Z`)) / 86400000) + 1;

export const isSettledShift = (s: Pick<Shift, 'status'>) => s.status === 'cancelled' || s.status === 'no_show';
/** A scheduled shift whose time has passed and nobody has confirmed it yet. */
export const needsConfirmation = (s: Pick<Shift, 'status' | 'ends_at'>) => s.status === 'scheduled' && Date.parse(s.ends_at) < Date.now();

export function friendlyError(message: string): string {
  if (/care_shifts_one_per_day/.test(message)) return 'That person already has a shift on that day (one shift per day).';
  if (/row-level security|permission denied/i.test(message)) return 'You do not have permission to do that.';
  return message;
}

/* ───────────── data helpers ───────────── */

/** Staff who are free on a given date (no other scheduled or completed shift that day). */
export async function busyStaffOn(date: string, exceptShiftId?: string): Promise<Set<string>> {
  let q = supabase.from('care_shifts').select('staff_id').eq('shift_date', date).in('status', ['scheduled', 'completed']).not('staff_id', 'is', null);
  if (exceptShiftId) q = q.neq('id', exceptShiftId);
  const { data } = await q;
  return new Set((data ?? []).map(r => r.staff_id as string));
}

export async function assignShift(shiftId: string, staffId: string | null): Promise<string | null> {
  const { error } = await supabase.from('care_shifts').update({ staff_id: staffId }).eq('id', shiftId);
  return error ? friendlyError(error.message) : null;
}

export async function setShiftStatus(shiftId: string, status: ShiftStatus): Promise<string | null> {
  const { error } = await supabase.from('care_shifts').update({ status }).eq('id', shiftId);
  return error ? friendlyError(error.message) : null;
}

/**
 * Gives one worker every still-open shift of one kind on a contract, skipping days
 * the worker is already busy. Returns what happened so the screen can say so.
 */
export async function bulkAssign(contractId: string, kind: ShiftKind, staffId: string): Promise<{ assigned: number; skipped: string[]; error?: string }> {
  const { data: open, error } = await supabase.from('care_shifts').select('id, shift_date')
    .eq('contract_id', contractId).eq('shift', kind).eq('status', 'scheduled').is('staff_id', null).order('shift_date');
  if (error) return { assigned: 0, skipped: [], error: friendlyError(error.message) };
  if (!open?.length) return { assigned: 0, skipped: [] };
  const first = open[0].shift_date as string;
  const last = open[open.length - 1].shift_date as string;
  const { data: busy } = await supabase.from('care_shifts').select('shift_date').eq('staff_id', staffId).in('status', ['scheduled', 'completed']).gte('shift_date', first).lte('shift_date', last);
  const busyDates = new Set((busy ?? []).map(b => b.shift_date as string));
  const ok = open.filter(o => !busyDates.has(o.shift_date as string));
  const skipped = open.filter(o => busyDates.has(o.shift_date as string)).map(o => o.shift_date as string);
  if (ok.length) {
    const { error: upErr } = await supabase.from('care_shifts').update({ staff_id: staffId }).in('id', ok.map(o => o.id as string));
    if (upErr) return { assigned: 0, skipped, error: friendlyError(upErr.message) };
  }
  return { assigned: ok.length, skipped };
}

/* ───────────── permission gate ───────────── */

export function CareGate({ children }: { children: ReactNode }) {
  const { can } = useAdminAuth();
  if (can('homecare')) return <>{children}</>;
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-3"><Lock className="w-5 h-5 text-red-500" /></div>
      <p className="text-[14px] font-bold text-[#1e293b]" style={font}>No access</p>
      <p className="text-[11px] text-[#94A3B8] mt-1" style={font}>Ask a Super Admin to give you access to Home Care.</p>
    </div>
  );
}

/* ───────────── small UI parts ───────────── */

export const card = 'bg-white rounded-2xl border border-slate-100';
export const selectCls = 'px-3 py-2 rounded-xl border border-slate-200 bg-white text-[12px] text-[#1e293b] focus:outline-none focus:ring-2 focus:ring-[#0A6070]/20 focus:border-[#0A6070]/40';

export function PageTitle({ title, subtitle, action, back }: { title: string; subtitle?: string; action?: ReactNode; back?: { to: string; label: string } }) {
  return (
    <div className="mb-4">
      {back && (
        <Link to={back.to} className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#64748B] hover:text-[#0A6070] mb-1.5" style={font}>
          <ChevronRight className="w-3 h-3 rotate-180" /> {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-[#0f172a] leading-tight" style={serif}>{title}</h1>
          {subtitle && <p className="text-[12px] text-[#64748B] mt-0.5" style={font}>{subtitle}</p>}
        </div>
        {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
      </div>
    </div>
  );
}

export function Btn({ children, onClick, icon: Icon, variant = 'primary', disabled, type = 'button', title }: {
  children: ReactNode; onClick?: () => void; icon?: ComponentType<{ className?: string }>; variant?: 'primary' | 'ghost' | 'danger' | 'soft'; disabled?: boolean; type?: 'button' | 'submit'; title?: string;
}) {
  const cls = {
    primary: 'bg-gradient-to-r from-[#0A6070] to-[#1AADA0] text-white shadow-sm hover:shadow-md',
    ghost: 'bg-white border border-slate-200 text-[#334155] hover:bg-slate-50',
    soft: 'bg-[#0A6070]/10 text-[#0A6070] hover:bg-[#0A6070]/15',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100',
  }[variant];
  return (
    <button type={type} title={title} onClick={onClick} disabled={disabled} className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-semibold whitespace-nowrap transition-all disabled:opacity-50 disabled:cursor-not-allowed ${cls}`} style={font}>
      {Icon && <Icon className="w-3.5 h-3.5" />} {children}
    </button>
  );
}

const TONES: Record<string, string> = {
  green: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700', red: 'bg-red-50 text-red-600', blue: 'bg-sky-50 text-sky-700',
  slate: 'bg-slate-100 text-slate-600', violet: 'bg-violet-50 text-violet-700', teal: 'bg-teal-50 text-teal-700', pink: 'bg-pink-50 text-pink-700',
};
export function Pill({ tone = 'slate', children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  return <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${TONES[tone]}`} style={font}>{children}</span>;
}

export const shiftStatusTone = (s: Pick<Shift, 'status' | 'ends_at'>): { tone: keyof typeof TONES; label: string } => {
  if (s.status === 'completed') return { tone: 'green', label: 'Completed' };
  if (s.status === 'cancelled') return { tone: 'slate', label: 'Cancelled' };
  if (s.status === 'no_show') return { tone: 'red', label: 'No-show' };
  if (needsConfirmation(s)) return { tone: 'amber', label: 'Needs confirming' };
  return { tone: 'blue', label: 'Scheduled' };
};

export const contractStatusTone: Record<Contract['status'], { tone: keyof typeof TONES; label: string }> = {
  draft: { tone: 'amber', label: 'Awaiting signature' },
  active: { tone: 'green', label: 'Active' },
  completed: { tone: 'slate', label: 'Completed' },
  cancelled: { tone: 'red', label: 'Cancelled' },
};

export function Avatar({ name, url, size = 40, tone = 'teal' }: { name: string; url?: string; size?: number; tone?: 'teal' | 'violet' }) {
  const bg = tone === 'violet' ? 'from-violet-500 to-fuchsia-400' : 'from-[#0A6070] to-[#1AADA0]';
  return url ? (
    <img src={url} alt={name} className="rounded-full object-cover flex-shrink-0 border border-slate-100" style={{ width: size, height: size }} />
  ) : (
    <div className={`rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 bg-gradient-to-br ${bg}`} style={{ width: size, height: size, fontSize: size * 0.36, ...font }}>
      {initials(name) || '?'}
    </div>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'green' | 'red' | 'amber' }) {
  const color = tone === 'green' ? 'text-emerald-600' : tone === 'red' ? 'text-red-600' : tone === 'amber' ? 'text-amber-600' : 'text-[#0f172a]';
  return (
    <div className={`${card} p-4`}>
      <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider" style={font}>{label}</p>
      <p className={`text-[20px] font-bold leading-tight mt-1 ${color}`} style={font}>{value}</p>
      {hint && <p className="text-[10px] text-[#64748B] mt-0.5" style={font}>{hint}</p>}
    </div>
  );
}

export function SectionCard({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className={`${card} overflow-hidden`}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-slate-50">
        <div>
          <h2 className="text-[13px] font-bold text-[#0f172a]" style={font}>{title}</h2>
          {subtitle && <p className="text-[11px] text-[#94A3B8]" style={font}>{subtitle}</p>}
        </div>
        {action}
      </div>
      <div>{children}</div>
    </section>
  );
}

export function Empty({ icon: Icon, title, hint, action }: { icon: ComponentType<{ className?: string }>; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-10">
      <div className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center mb-3"><Icon className="w-5 h-5 text-slate-400" /></div>
      <p className="text-[13px] font-bold text-[#1e293b]" style={font}>{title}</p>
      {hint && <p className="text-[11px] text-[#64748B] mt-1 max-w-xs" style={font}>{hint}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function Notice({ kind, children, onClose }: { kind: 'ok' | 'error' | 'warn'; children: ReactNode; onClose?: () => void }) {
  const cls = kind === 'ok' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : kind === 'warn' ? 'bg-amber-50 text-amber-800 border-amber-100' : 'bg-red-50 text-red-700 border-red-100';
  return (
    <div className={`text-[12px] font-medium rounded-xl border px-3 py-2.5 flex items-start gap-2 ${cls}`} style={font} role="status">
      <div className="flex-1 min-w-0">{children}</div>
      {onClose && <button onClick={onClose} className="opacity-60 hover:opacity-100 text-[11px] font-bold" aria-label="Dismiss">✕</button>}
    </div>
  );
}

export function CopyButton({ text, label }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  if (!text) return null;
  return (
    <button
      type="button"
      onClick={async e => { e.stopPropagation(); try { await navigator.clipboard.writeText(text); setDone(true); window.setTimeout(() => setDone(false), 1500); } catch { /* blocked */ } }}
      className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#64748B] hover:text-[#0A6070]"
      title="Copy" style={font}
    >
      {done ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />} {label ?? (done ? 'Copied' : 'Copy')}
    </button>
  );
}

export function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-gradient-to-r from-[#0A6070] to-[#1AADA0]" style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Downloads rows as a CSV file (opens fine in Excel). */
export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const blob = new Blob(['﻿' + rows.map(r => r.map(esc).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
