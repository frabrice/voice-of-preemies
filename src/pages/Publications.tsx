import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Newspaper, Heart, Calendar, CalendarHeart, ExternalLink, Download } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';

type ItemType = 'news' | 'story' | 'event';
type Filter = 'all' | ItemType;

interface FeedItem {
  id: string;
  type: ItemType;
  slug: string;
  title: string;
  excerpt: string;
  image_url: string;
  date: string;
}

interface UpcomingHighlight {
  id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  note: string;
  link_url: string;
  flyer_url: string;
  plan: string;
}

function fmtRange(start: string, end: string | null) {
  const s = new Date(start);
  const sMon = s.toLocaleDateString('en-US', { month: 'short' });
  if (!end || end === start) return `${sMon} ${s.getDate()}`;
  const e = new Date(end);
  const eMon = e.toLocaleDateString('en-US', { month: 'short' });
  if (sMon === eMon) return `${sMon} ${s.getDate()}–${e.getDate()}`;
  return `${sMon} ${s.getDate()} – ${eMon} ${e.getDate()}`;
}

/** Forces a real download (not just an inline open) as a universally-openable PNG, regardless of the source format or cross-origin host. */
function downloadUrl(url: string) {
  if (!url.includes('res.cloudinary.com') || url.includes('/fl_attachment')) return url;
  return url.replace('/upload/', '/upload/f_png,fl_attachment/');
}

const TYPE_META: Record<ItemType, { icon: React.ComponentType<{ className?: string }>; color: string; href: (slug: string) => string }> = {
  news: { icon: Newspaper, color: '#2D8A5F', href: slug => `/news/${slug}` },
  story: { icon: Heart, color: '#E8644A', href: slug => `/stories/${slug}` },
  event: { icon: Calendar, color: '#1AADA0', href: slug => `/events/${slug}` },
};

export default function Publications() {
  const { t } = useLanguage();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingHighlight[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const [s, n, e, up] = await Promise.all([
        supabase.from('stories').select('id,slug,name,excerpt,image_url,created_at').eq('published', true).is('deleted_at', null),
        supabase.from('news_articles').select('id,slug,title,excerpt,image_url,date').eq('published', true).is('deleted_at', null),
        supabase.from('events').select('id,slug,title,description,image_url,date').eq('published', true).is('deleted_at', null),
        supabase.from('upcoming_highlights').select('id,title,start_date,end_date,note,link_url,flyer_url,plan').order('start_date', { ascending: true }),
      ]);

      const combined: FeedItem[] = [
        ...(s.data ?? []).map((r): FeedItem => ({ id: r.id, type: 'story', slug: r.slug, title: r.name, excerpt: r.excerpt, image_url: r.image_url, date: r.created_at })),
        ...(n.data ?? []).map((r): FeedItem => ({ id: r.id, type: 'news', slug: r.slug, title: r.title, excerpt: r.excerpt, image_url: r.image_url, date: r.date })),
        ...(e.data ?? []).map((r): FeedItem => ({ id: r.id, type: 'event', slug: r.slug, title: r.title, excerpt: r.description, image_url: r.image_url, date: r.date })),
      ];
      combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const stillUpcoming = (up.data ?? []).filter(d => (d.end_date ?? d.start_date) >= today);

      setItems(combined);
      setUpcoming(stillUpcoming);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = filter === 'all' ? items : items.filter(i => i.type === filter);
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: t('pub.filter.all') },
    { id: 'news', label: t('misc.tag.news') },
    { id: 'story', label: t('misc.tag.story') },
    { id: 'event', label: t('misc.tag.event') },
  ];

  return (
    <div className="page-enter">
      <section className="pt-28 pb-0 hero-gradient relative overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#F0A500] mb-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{t('pub.label')}</p>
            <h1 className="text-3xl md:text-4xl font-light text-white leading-tight" style={{ fontFamily: 'Cormorant Garamond, serif' }}>{t('pub.title')}</h1>
          </div>
          <p className="text-sm text-white/70 max-w-sm sm:text-right" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{t('pub.sub')}</p>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 40" fill="none">
            <path d="M0 40L1440 40L1440 10C1200 35 960 0 720 12C480 24 240 38 0 10L0 40Z" fill="#FBF8F3" />
          </svg>
        </div>
      </section>

      <div className="min-h-[60vh] bg-[#FBF8F3] py-12">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            {/* ── Main feed ── */}
            <div className="w-full lg:w-[66%]">
              <div className="flex items-center gap-2 mb-6 overflow-x-auto scrollbar-none">
                {filters.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className="flex-shrink-0 px-4 py-2 rounded-full text-[12px] font-bold transition-all whitespace-nowrap"
                    style={{
                      fontFamily: 'Plus Jakarta Sans, sans-serif',
                      background: filter === f.id ? '#0A6070' : '#fff',
                      color: filter === f.id ? '#fff' : '#5A7280',
                      border: filter === f.id ? '1px solid #0A6070' : '1px solid #D8E4E8',
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-8 h-8 border-2 border-[#0A6070]/20 border-t-[#0A6070] rounded-full animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <Newspaper className="w-12 h-12 text-[#D8E4E8] mx-auto mb-4" />
                    <p className="text-[#5A7280] text-lg" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{t('pub.empty')}</p>
                  </div>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filtered.map(item => {
                    const meta = TYPE_META[item.type];
                    const Icon = meta.icon;
                    return (
                      <Link key={`${item.type}-${item.id}`} to={meta.href(item.slug)} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group block">
                        <div className="aspect-[16/10] overflow-hidden relative">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                          ) : (
                            <div className="w-full h-full hero-gradient" />
                          )}
                        </div>
                        <div className="p-5">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: `${meta.color}15`, color: meta.color }}>
                              <Icon className="w-3 h-3" />{t(`misc.tag.${item.type}`)}
                            </span>
                            <span className="text-[11px] text-[#94A3B8]">{fmtDate(item.date)}</span>
                          </div>
                          <h3 className="text-lg font-bold text-[#1e293b] mb-1 group-hover:text-[#0A6070] transition-colors" style={{ fontFamily: 'Cormorant Garamond, serif' }}>{item.title}</h3>
                          <p className="text-[13px] text-[#64748B] leading-relaxed line-clamp-3">{item.excerpt}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Mark Your Calendar sidebar ── */}
            <aside className="w-full lg:w-[31%] lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <CalendarHeart className="w-4 h-4 text-[#E8644A]" />
                  <h2 className="text-sm font-bold uppercase tracking-widest text-[#1A2B35]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{t('pub.upcoming.title')}</h2>
                </div>
                {upcoming.length === 0 ? (
                  <p className="text-[12px] text-[#94A3B8]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{t('pub.upcoming.empty')}</p>
                ) : (
                  <div className="divide-y divide-[#F0F0F0]">
                    {upcoming.map(d => (
                      <div key={d.id} className="py-4 first:pt-0 last:pb-0">
                        <div className="flex items-start gap-3">
                          {d.flyer_url && (
                            <img src={d.flyer_url} alt={d.title} className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-[#F0F0F0]" />
                          )}
                          <div className="min-w-0 flex-1">
                            <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1.5" style={{ background: '#0A607015', color: '#0A6070' }}>
                              {fmtRange(d.start_date, d.end_date)}
                            </span>
                            <p className="text-[13px] font-semibold text-[#1e293b] leading-snug" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{d.title}</p>
                            {d.note && <p className="text-[11px] text-[#64748B] mt-0.5 leading-snug">{d.note}</p>}
                          </div>
                        </div>

                        {d.plan && (
                          <div className="mt-2.5 bg-[#FBF8F3] rounded-xl px-3 py-2.5 border-l-2 border-[#E8644A]">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-[#E8644A] mb-0.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>VIP · Voice of Preemies Plan</p>
                            <p className="text-[11px] text-[#334155] leading-snug">{d.plan}</p>
                          </div>
                        )}

                        <div className="flex items-center gap-3 mt-2.5 flex-wrap">
                          {d.flyer_url && (
                            <a href={downloadUrl(d.flyer_url)} download className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0A6070] hover:underline" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                              <Download className="w-3 h-3" /> Download Flyer
                            </a>
                          )}
                          {d.link_url && (
                            <a href={d.link_url} className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0A6070] hover:underline" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                              {t('btn.learnMore')} <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
