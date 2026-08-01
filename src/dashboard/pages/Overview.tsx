import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import {
  Heart, Building2, Headphones, Globe, Newspaper, BookOpen, Users, FileText,
  Mail, UserCheck, UserPlus, TrendingUp, HeartHandshake, CalendarDays,
  ArrowRight, ArrowUpRight, DollarSign, Clock, Database, FolderOpen,
  Wallet, Settings as SettingsIcon, ShieldCheck
} from 'lucide-react';

interface Counts { news: number; stories: number; programs: number; team: number; resources: number; contacts: number; donations: number; volunteers: number; joinRequests: number; totalDonated: number; }
interface StatRow { label: string; value: string; icon: string; }
interface NewsRow { id: string; title: string; tag: string; date: string; published: boolean; }
interface ContactRow { id: string; name: string; subject: string; status: string; created_at: string; }

export default function Overview() {
  const { adminRole, can } = useAdminAuth();
  const [counts, setCounts] = useState<Counts>({ news: 0, stories: 0, programs: 0, team: 0, resources: 0, contacts: 0, donations: 0, volunteers: 0, joinRequests: 0, totalDonated: 0 });
  const [siteStats, setSiteStats] = useState<StatRow[]>([]);
  const [recentNews, setRecentNews] = useState<NewsRow[]>([]);
  const [recentContacts, setRecentContacts] = useState<ContactRow[]>([]);

  useEffect(() => {
    const load = async () => {
      const [
        { count: news }, { count: stories }, { count: programs }, { count: team },
        { count: resources }, { count: contacts }, { count: donations }, { count: volunteers },
        { count: joinRequests },
        { data: statsData }, { data: newsData }, { data: contactData }, { data: donationData },
      ] = await Promise.all([
        supabase.from('news_articles').select('*', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('stories').select('*', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('programs').select('*', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('team_members').select('*', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('resources').select('*', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('contact_submissions').select('*', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('donation_records').select('*', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('volunteers').select('*', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('join_requests').select('*', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('site_stats').select('*').order('sort_order'),
        supabase.from('news_articles').select('id,title,tag,date,published').is('deleted_at', null).order('date', { ascending: false }).limit(5),
        supabase.from('contact_submissions').select('id,name,subject,status,created_at').is('deleted_at', null).order('created_at', { ascending: false }).limit(5),
        supabase.from('donation_records').select('amount').is('deleted_at', null),
      ]);
      const totalDonated = (donationData ?? []).reduce((s: number, r: { amount: number }) => s + Number(r.amount), 0);
      setCounts({ news: news ?? 0, stories: stories ?? 0, programs: programs ?? 0, team: team ?? 0, resources: resources ?? 0, contacts: contacts ?? 0, donations: donations ?? 0, volunteers: volunteers ?? 0, joinRequests: joinRequests ?? 0, totalDonated });
      setSiteStats(statsData ?? []);
      setRecentNews(newsData ?? []);
      setRecentContacts(contactData ?? []);
    };
    load();
  }, []);

  const statIconMap: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = { Heart, Building2, Headphones, Globe };
  const statGradients = ['from-teal-500 to-cyan-400', 'from-blue-500 to-sky-400', 'from-rose-500 to-pink-400', 'from-amber-500 to-yellow-400'];

  const allCards = [
    { label: 'News Articles', count: counts.news, icon: Newspaper, path: '/dashboard/website', gradient: 'from-blue-500 to-sky-400', bg: 'from-blue-50 to-sky-50', text: 'text-blue-600', ring: 'ring-blue-100', perm: 'website' as const },
    { label: 'Stories', count: counts.stories, icon: BookOpen, path: '/dashboard/website', gradient: 'from-amber-500 to-yellow-400', bg: 'from-amber-50 to-yellow-50', text: 'text-amber-600', ring: 'ring-amber-100', perm: 'website' as const },
    { label: 'Programs', count: counts.programs, icon: HeartHandshake, path: '/dashboard/website', gradient: 'from-rose-500 to-pink-400', bg: 'from-rose-50 to-pink-50', text: 'text-rose-600', ring: 'ring-rose-100', perm: 'website' as const },
    { label: 'Team Members', count: counts.team, icon: Users, path: '/dashboard/database', gradient: 'from-violet-500 to-purple-400', bg: 'from-violet-50 to-purple-50', text: 'text-violet-600', ring: 'ring-violet-100', perm: 'database' as const },
    { label: 'Resources', count: counts.resources, icon: FileText, path: '/dashboard/website', gradient: 'from-lime-500 to-green-400', bg: 'from-lime-50 to-green-50', text: 'text-lime-600', ring: 'ring-lime-100', perm: 'website' as const },
    { label: 'Contact Messages', count: counts.contacts, icon: Mail, path: '/dashboard/contact', gradient: 'from-cyan-500 to-teal-400', bg: 'from-cyan-50 to-teal-50', text: 'text-cyan-600', ring: 'ring-cyan-100', perm: 'contact' as const },
    { label: 'Donations', count: counts.donations, icon: TrendingUp, path: '/dashboard/donations', gradient: 'from-red-500 to-rose-400', bg: 'from-red-50 to-rose-50', text: 'text-red-600', ring: 'ring-red-100', perm: 'donations' as const },
    { label: 'Volunteers', count: counts.volunteers, icon: UserCheck, path: '/dashboard/database', gradient: 'from-emerald-500 to-green-400', bg: 'from-emerald-50 to-green-50', text: 'text-emerald-600', ring: 'ring-emerald-100', perm: 'database' as const },
    { label: 'Community Signups', count: counts.joinRequests, icon: UserPlus, path: '/dashboard/contact', gradient: 'from-teal-500 to-emerald-400', bg: 'from-teal-50 to-emerald-50', text: 'text-teal-600', ring: 'ring-teal-100', perm: 'contact' as const },
  ];
  const contentCards = allCards.filter(c => can(c.perm));

  const allQuick = [
    { label: 'Website', path: '/dashboard/website', icon: Globe, gradient: 'from-blue-500 to-sky-400', perm: 'website' as const },
    { label: 'Database', path: '/dashboard/database', icon: Database, gradient: 'from-violet-500 to-purple-400', perm: 'database' as const },
    { label: 'Contact', path: '/dashboard/contact', icon: Mail, gradient: 'from-cyan-500 to-teal-400', perm: 'contact' as const },
    { label: 'Donations', path: '/dashboard/donations', icon: HeartHandshake, gradient: 'from-rose-500 to-pink-400', perm: 'donations' as const },
    { label: 'Events', path: '/dashboard/events', icon: CalendarDays, gradient: 'from-indigo-500 to-blue-400', perm: 'events' as const },
    { label: 'Documents', path: '/dashboard/documents', icon: FolderOpen, gradient: 'from-orange-500 to-amber-400', perm: 'documents' as const },
    { label: 'Finance', path: '/dashboard/finance', icon: Wallet, gradient: 'from-emerald-500 to-green-400', perm: 'finance' as const },
    { label: 'Users', path: '/dashboard/users', icon: ShieldCheck, gradient: 'from-red-500 to-rose-400', perm: 'users' as const },
    { label: 'Settings', path: '/dashboard/settings', icon: SettingsIcon, gradient: 'from-slate-500 to-slate-400', perm: 'settings' as const },
  ];
  const quickAccess = allQuick.filter(q => can(q.perm));

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#0f172a]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Dashboard Overview</h1>
          <p className="text-[11px] text-[#64748B] mt-0.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Welcome back — here's what's happening with Voice of Preemies.</p>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-[#94A3B8] bg-white/80 rounded-xl px-2.5 py-1.5 border border-slate-100 self-start" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          <Clock className="w-3 h-3" />
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#0A6070]/10 to-[#1AADA0]/10 border border-[#0A6070]/20">
        <ShieldCheck className="w-3.5 h-3.5 text-[#0A6070]" />
        <span className="text-[11px] font-bold text-[#0A6070] capitalize" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{adminRole.replace('_', ' ')}</span>
      </div>

      {siteStats.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {siteStats.map((stat, i) => {
            const Icon = statIconMap[stat.icon] ?? Heart;
            return (
              <div key={stat.label} className="relative rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                <div className={`absolute inset-0 bg-gradient-to-br ${statGradients[i % statGradients.length]}`} />
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.5) 0%, transparent 60%)' }} />
                <div className="relative p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-xl bg-white/25 flex items-center justify-center">
                      <Icon className="text-white" style={{ width: 15, height: 15 }} />
                    </div>
                    {can('website') && (
                      <Link to="/dashboard/website" className="text-white/60 hover:text-white transition-colors">
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-white" style={{ fontFamily: 'Cormorant Garamond, serif' }}>{stat.value}</p>
                  <p className="text-white/75 text-[10px] mt-0.5 font-medium" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{stat.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {can('donations') && (
        <div className="relative rounded-2xl overflow-hidden shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A6070] via-[#0d7a8c] to-[#1AADA0]" />
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10" />
          <div className="absolute bottom-0 left-1/3 w-24 h-24 rounded-full bg-white/5" />
          <div className="relative px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-white/70 text-[9px] uppercase tracking-widest font-semibold" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Total Recorded Donations</p>
                <p className="text-2xl font-bold text-white mt-0.5" style={{ fontFamily: 'Cormorant Garamond, serif' }}>${counts.totalDonated.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
            <Link to="/dashboard/donations" className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-[11px] font-semibold px-3 py-2 rounded-xl transition-all border border-white/20" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Manage Donations <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {contentCards.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {contentCards.map((c, i) => (
            <Link key={i} to={c.path} className={`group bg-gradient-to-br ${c.bg} rounded-xl p-3 border ring-1 ${c.ring} hover:shadow-md transition-all hover:-translate-y-0.5`}>
              <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${c.gradient} flex items-center justify-center mb-2 shadow-sm group-hover:scale-110 transition-transform`}>
                <c.icon className="text-white" style={{ width: 13, height: 13 }} />
              </div>
              <p className={`text-xl font-bold ${c.text}`} style={{ fontFamily: 'Cormorant Garamond, serif' }}>{c.count}</p>
              <p className="text-[10px] text-[#64748B] mt-0.5 font-medium leading-tight" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{c.label}</p>
            </Link>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        {can('website') && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between border-b border-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-sky-400 flex items-center justify-center">
                  <Newspaper className="text-white" style={{ width: 11, height: 11 }} />
                </div>
                <h3 className="font-bold text-[#0f172a] text-[12px]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Recent News</h3>
              </div>
              <Link to="/dashboard/website" className="flex items-center gap-1 text-[10px] text-[#0A6070] font-semibold hover:gap-1.5 transition-all" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                View all <ArrowRight className="w-2.5 h-2.5" />
              </Link>
            </div>
            <div className="divide-y divide-slate-50">
              {recentNews.map((n) => (
                <div key={n.id} className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors">
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-[#1e293b] truncate" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{n.title}</p>
                    <p className="text-[10px] text-[#94A3B8] mt-0.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{n.tag} · {n.date}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${n.published ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    {n.published ? 'Live' : 'Draft'}
                  </span>
                </div>
              ))}
              {recentNews.length === 0 && <p className="px-4 py-5 text-[11px] text-[#94A3B8] text-center" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>No articles yet.</p>}
            </div>
          </div>
        )}

        {can('contact') && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between border-b border-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-400 flex items-center justify-center">
                  <Mail className="text-white" style={{ width: 11, height: 11 }} />
                </div>
                <h3 className="font-bold text-[#0f172a] text-[12px]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Recent Messages</h3>
              </div>
              <Link to="/dashboard/contact" className="flex items-center gap-1 text-[10px] text-[#0A6070] font-semibold hover:gap-1.5 transition-all" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                View all <ArrowRight className="w-2.5 h-2.5" />
              </Link>
            </div>
            <div className="divide-y divide-slate-50">
              {recentContacts.map((c) => (
                <div key={c.id} className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors">
                  <div className="min-w-0 flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-slate-600">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-[#1e293b] truncate" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{c.name}</p>
                      <p className="text-[10px] text-[#94A3B8] mt-0.5 truncate" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{c.subject} · {formatDate(c.created_at)}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${c.status === 'unread' ? 'bg-red-100 text-red-600' : c.status === 'replied' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    {c.status}
                  </span>
                </div>
              ))}
              {recentContacts.length === 0 && <p className="px-4 py-5 text-[11px] text-[#94A3B8] text-center" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>No messages yet.</p>}
            </div>
          </div>
        )}
      </div>

      {quickAccess.length > 0 && (
        <div>
          <h3 className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Quick Access</h3>
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2.5">
            {quickAccess.map((q) => (
              <Link key={q.path} to={q.path} className="flex flex-col items-center gap-1.5 p-3 bg-white/70 rounded-xl border border-slate-100 hover:shadow-md hover:-translate-y-0.5 transition-all group">
                <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${q.gradient} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`}>
                  <q.icon className="text-white" style={{ width: 14, height: 14 }} />
                </div>
                <span className="text-[10px] font-semibold text-[#334155] text-center leading-tight" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{q.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
