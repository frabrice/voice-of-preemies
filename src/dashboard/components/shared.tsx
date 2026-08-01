import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

/* ── Input helpers ── */
export const inp = 'w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-[12px] text-[#1e293b] focus:outline-none focus:ring-2 focus:ring-[#0A6070]/20 focus:border-[#0A6070]/40 transition-all';
export const ta = 'w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-[12px] text-[#1e293b] focus:outline-none focus:ring-2 focus:ring-[#0A6070]/20 focus:border-[#0A6070]/40 transition-all resize-y min-h-[80px]';

export function Lbl({ t }: { t: string }) {
  return <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{t}</label>;
}

/* ── Formatters ── */
export const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
export const fmtDateTime = (d?: string | null) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
export const fmtMoney = (n: number | string | null | undefined, currency = 'USD') => {
  const v = Number(n ?? 0);
  const symbol = currency === 'RWF' ? 'RWF' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
  if (currency === 'RWF') return `${symbol} ${v.toLocaleString('en-US')}`;
  return `${symbol}${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/* ── useCrud hook ── */
export function useCrud<T extends { id: string }>(table: string, hasDeletedAt = true) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase.from(table).select('*');
    if (hasDeletedAt) query = query.is('deleted_at', null);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (!error) setItems((data ?? []) as unknown as T[]);
    setLoading(false);
  }, [table, hasDeletedAt]);

  useEffect(() => { load(); }, [load]);

  const create = async (row: Record<string, unknown>) => {
    const { error } = await supabase.from(table).insert(row);
    if (!error) load();
    return !error;
  };

  const update = async (id: string, row: Record<string, unknown>) => {
    const { error } = await supabase.from(table).update(row).eq('id', id);
    if (!error) load();
    return !error;
  };

  const softDelete = async (id: string) => {
    if (hasDeletedAt) {
      const { error } = await supabase.from(table).update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (!error) load();
      return !error;
    } else {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (!error) load();
      return !error;
    }
  };

  return { items, loading, load, create, update, softDelete };
}

/* ── UI components ── */
export function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    active: 'bg-emerald-100 text-emerald-700',
    unread: 'bg-red-100 text-red-700',
    replied: 'bg-emerald-100 text-emerald-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
    completed: 'bg-blue-100 text-blue-700',
    draft: 'bg-slate-100 text-slate-600',
    published: 'bg-emerald-100 text-emerald-700',
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${colors[status] ?? 'bg-slate-100 text-slate-600'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      {status}
    </span>
  );
}

export function EmptyState({ icon: Icon, message }: { icon: React.ComponentType<{ className?: string }>; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Icon className="w-8 h-8 text-slate-300 mb-2" />
      <p className="text-[12px] text-[#94A3B8]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{message}</p>
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Search...' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full sm:w-64 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-[12px] focus:outline-none focus:ring-2 focus:ring-[#0A6070]/20"
      style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
    />
  );
}

export function SummaryCard({ icon: Icon, label, value, gradient }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; gradient: string }) {
  return (
    <div className="bg-white/80 rounded-2xl border border-slate-100 shadow-sm p-4">
      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-2 shadow-sm`}>
        <Icon className="text-white" />
      </div>
      <p className="text-xl font-bold text-[#0f172a]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>{value}</p>
      <p className="text-[10px] text-[#64748B] mt-0.5 font-medium" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{label}</p>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
      <div>
        <h1 className="text-lg font-bold text-[#0f172a]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>{title}</h1>
        {subtitle && <p className="text-[11px] text-[#64748B] mt-0.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/* ── Publication notifications ── */
export async function notifyPublication(payload: { type: 'news' | 'story' | 'event'; title: string; excerpt?: string | null; path?: string }) {
  try {
    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-publication-notification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
      body: JSON.stringify(payload),
    });
  } catch { /* email is best-effort; don't block the admin */ }
}

export function AddButton({ onClick, label = 'Add New' }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#0A6070] to-[#1AADA0] text-white text-[11px] font-semibold shadow-sm hover:shadow-md transition-all"
      style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
    >
      + {label}
    </button>
  );
}
