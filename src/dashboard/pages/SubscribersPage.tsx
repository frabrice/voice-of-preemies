import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, Mail, MailX, UserCheck, RotateCcw } from 'lucide-react';
import { PageHeader, SearchInput, SummaryCard, EmptyState, fmtDate } from '../components/shared';

interface Contact {
  email: string;
  name: string | null;
  sources: string[];
  first_seen_at: string;
}

export default function SubscribersPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [unsubscribed, setUnsubscribed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'subscribed' | 'unsubscribed'>('all');
  const [busyEmail, setBusyEmail] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [contactsRes, unsubRes] = await Promise.all([
      supabase.from('all_contacts').select('*').order('first_seen_at', { ascending: false }),
      supabase.from('email_unsubscribes').select('email'),
    ]);
    setContacts((contactsRes.data ?? []) as Contact[]);
    setUnsubscribed(new Set((unsubRes.data ?? []).map((u: { email: string }) => u.email)));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleSubscription = async (email: string, isUnsubscribed: boolean) => {
    setBusyEmail(email);
    if (isUnsubscribed) {
      await supabase.from('email_unsubscribes').delete().eq('email', email);
    } else {
      await supabase.from('email_unsubscribes').insert({ email });
    }
    await load();
    setBusyEmail(null);
  };

  const filtered = contacts.filter((c) => {
    const isUnsub = unsubscribed.has(c.email);
    if (filter === 'subscribed' && isUnsub) return false;
    if (filter === 'unsubscribed' && !isUnsub) return false;
    const q = search.toLowerCase();
    return !q || c.email.toLowerCase().includes(q) || (c.name ?? '').toLowerCase().includes(q) || c.sources.some((s) => s.toLowerCase().includes(q));
  });

  const subscribedCount = contacts.filter((c) => !unsubscribed.has(c.email)).length;

  return (
    <div>
      <PageHeader
        title="Subscribers"
        subtitle="Everyone who has ever given us an email — donors, contacts, applicants, and more. Notified whenever a new article, story, or event is published."
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        <SummaryCard icon={Users} label="Total Contacts" value={String(contacts.length)} gradient="from-blue-500 to-sky-400" />
        <SummaryCard icon={Mail} label="Subscribed" value={String(subscribedCount)} gradient="from-emerald-500 to-green-400" />
        <SummaryCard icon={MailX} label="Unsubscribed" value={String(unsubscribed.size)} gradient="from-slate-400 to-slate-500" />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name, email, or source..." />
        <div className="flex gap-1.5">
          {(['all', 'subscribed', 'unsubscribed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold capitalize transition-colors ${filter === f ? 'bg-[#0A6070] text-white' : 'bg-white border border-slate-200 text-[#64748B] hover:bg-slate-50'}`}
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <p className="text-[12px] text-[#94A3B8] text-center py-10">Loading...</p>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Users} message="No contacts found." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-50 bg-slate-50/60">
                  {['Name', 'Email', 'Sources', 'First Seen', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((c) => {
                  const isUnsub = unsubscribed.has(c.email);
                  return (
                    <tr key={c.email} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 text-[12px] font-semibold text-[#1e293b]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{c.name || '—'}</td>
                      <td className="px-4 py-3 text-[11px] text-[#64748B]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{c.email}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {c.sources.map((s) => (
                            <span key={s} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-50 text-cyan-700">{s}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-[#94A3B8] whitespace-nowrap" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{fmtDate(c.first_seen_at)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isUnsub ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-700'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                          {isUnsub ? 'Unsubscribed' : 'Subscribed'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleSubscription(c.email, isUnsub)}
                          disabled={busyEmail === c.email}
                          className="flex items-center gap-1 text-[10px] font-semibold text-[#0A6070] hover:underline disabled:opacity-50"
                          style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                        >
                          {isUnsub ? <><UserCheck className="w-3 h-3" /> Resubscribe</> : <><RotateCcw className="w-3 h-3" /> Unsubscribe</>}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
