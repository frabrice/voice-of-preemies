import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Heart, Star, MessageSquare, BookOpen } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';

type Tab = 'stories' | 'appreciations' | 'feedback' | 'news' | 'events';

interface Story { id: string; slug: string; name: string; baby_info: string; tag: string; location: string; year: number; excerpt: string; image_url: string; }
interface Appreciation { id: string; author_name: string; author_role: string; message: string; }
interface Feedback { id: string; author_name: string; subject: string; message: string; }
interface News { id: string; slug: string; title: string; excerpt: string; tag: string; date: string; image_url: string; }
interface EventRow { id: string; slug: string; title: string; date: string; location: string; type: string; description: string; image_url: string; }

export default function Publications() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<Tab>('stories');
  const [stories, setStories] = useState<Story[]>([]);
  const [appreciations, setAppreciations] = useState<Appreciation[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [news, setNews] = useState<News[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [s, a, f, n, e] = await Promise.all([
        supabase.from('stories').select('id,slug,name,baby_info,tag,location,year,excerpt,image_url').eq('published', true).is('deleted_at', null).order('featured', { ascending: false }).order('year', { ascending: false }),
        supabase.from('appreciations').select('id,author_name,author_role,message').eq('status', 'approved').is('deleted_at', null),
        supabase.from('feedback').select('id,author_name,subject,message').is('deleted_at', null).order('created_at', { ascending: false }).limit(20),
        supabase.from('news_articles').select('id,slug,title,excerpt,tag,date,image_url').eq('published', true).is('deleted_at', null).order('date', { ascending: false }).limit(12),
        supabase.from('events').select('id,slug,title,date,location,type,description,image_url').eq('published', true).is('deleted_at', null).order('date', { ascending: false }).limit(12),
      ]);
      setStories(s.data ?? []);
      setAppreciations(a.data ?? []);
      setFeedback(f.data ?? []);
      setNews(n.data ?? []);
      setEvents(e.data ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
    { id: 'stories',       label: t('pub.tab.stories'),      icon: Heart,        color: '#E8644A' },
    { id: 'appreciations', label: t('pub.tab.appreciations'), icon: Star, color: '#E8A020' },
    { id: 'feedback',      label: t('pub.tab.feedback'),      icon: MessageSquare, color: '#0A6070' },
    { id: 'news',          label: t('pub.tab.news'),          icon: BookOpen, color: '#2D8A5F' },
    { id: 'events',        label: t('pub.tab.events'),        icon: Calendar, color: '#1AADA0' },
  ];

  const emptyIcons: Record<Tab, React.ComponentType<{ className?: string }>> = {
    stories: Heart, appreciations: Star, feedback: MessageSquare, news: BookOpen, events: Calendar,
  };
  const emptyMessages: Record<Tab, string> = {
    stories: t('pub.empty.stories'), appreciations: t('pub.empty.appreciations'),
    feedback: t('pub.empty.feedback'), news: t('pub.empty.news'), events: t('pub.empty.events'),
  };
  const EmptyIcon = emptyIcons[activeTab];
  const isEmpty = (activeTab === 'stories' && stories.length === 0) ||
    (activeTab === 'appreciations' && appreciations.length === 0) ||
    (activeTab === 'feedback' && feedback.length === 0) ||
    (activeTab === 'news' && news.length === 0) ||
    (activeTab === 'events' && events.length === 0);

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

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

      <section className="sticky top-16 z-30 bg-white border-b border-[#D8E4E8] shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-0 overflow-x-auto scrollbar-none">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="flex-shrink-0 flex items-center gap-2 px-5 py-4 text-[13px] font-semibold transition-all duration-200 border-b-2 whitespace-nowrap"
                style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', color: activeTab === tab.id ? tab.color : '#5A7280', borderBottomColor: activeTab === tab.id ? tab.color : 'transparent' }}>
                <tab.icon className="w-4 h-4" />{tab.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="min-h-[60vh] bg-[#FBF8F3] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-[#0A6070]/20 border-t-[#0A6070] rounded-full animate-spin" />
            </div>
          ) : isEmpty ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <EmptyIcon className="w-12 h-12 text-[#D8E4E8] mx-auto mb-4" />
                <p className="text-[#5A7280] text-lg" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{emptyMessages[activeTab]}</p>
              </div>
            </div>
          ) : (
            <>
              {/* Stories */}
              {activeTab === 'stories' && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {stories.map(s => (
                    <Link key={s.id} to={`/stories/${s.slug}`} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group block">
                      {s.image_url && <div className="aspect-[16/10] overflow-hidden"><img src={s.image_url} alt={s.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /></div>}
                      <div className="p-5">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: '#E8644A15', color: '#E8644A' }}>{s.tag}</span>
                          <span className="text-[11px] text-[#94A3B8]">{s.location} · {s.year}</span>
                        </div>
                        <h3 className="text-lg font-bold text-[#1e293b] mb-1 group-hover:text-[#0A6070] transition-colors" style={{ fontFamily: 'Cormorant Garamond, serif' }}>{s.name}</h3>
                        {s.baby_info && <p className="text-[12px] text-[#0A6070] font-semibold mb-2">{s.baby_info}</p>}
                        <p className="text-[13px] text-[#64748B] leading-relaxed line-clamp-3">{s.excerpt}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Appreciations */}
              {activeTab === 'appreciations' && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {appreciations.map(a => (
                    <div key={a.id} className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                      <Star className="w-6 h-6 text-[#E8A020] mb-3" fill="#E8A02020" />
                      <p className="text-[14px] text-[#1e293b] leading-relaxed mb-4 italic">"{a.message}"</p>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#E8A020] to-[#F0A500] flex items-center justify-center text-white text-[11px] font-bold">{a.author_name?.charAt(0)}</div>
                        <div>
                          <p className="text-[12px] font-bold text-[#1e293b]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{a.author_name}</p>
                          <p className="text-[10px] text-[#94A3B8]">{a.author_role}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Feedback */}
              {activeTab === 'feedback' && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {feedback.map(f => (
                    <div key={f.id} className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                      <MessageSquare className="w-5 h-5 text-[#0A6070] mb-3" />
                      <p className="text-[13px] font-bold text-[#1e293b] mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{f.subject}</p>
                      <p className="text-[12px] text-[#64748B] leading-relaxed line-clamp-4 mb-3">{f.message}</p>
                      <p className="text-[11px] text-[#94A3B8] font-semibold">— {f.author_name}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* News */}
              {activeTab === 'news' && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {news.map(n => (
                    <Link key={n.id} to={`/news/${n.slug}`} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group block">
                      {n.image_url && <div className="aspect-[16/10] overflow-hidden"><img src={n.image_url} alt={n.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /></div>}
                      <div className="p-5">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: '#2D8A5F15', color: '#2D8A5F' }}>{n.tag}</span>
                          <span className="text-[11px] text-[#94A3B8]">{fmtDate(n.date)}</span>
                        </div>
                        <h3 className="text-lg font-bold text-[#1e293b] mb-1 group-hover:text-[#0A6070] transition-colors" style={{ fontFamily: 'Cormorant Garamond, serif' }}>{n.title}</h3>
                        <p className="text-[13px] text-[#64748B] leading-relaxed line-clamp-3">{n.excerpt}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Events */}
              {activeTab === 'events' && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {events.map(e => (
                    <Link key={e.id} to={`/events/${e.slug}`} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group block">
                      {e.image_url && <div className="aspect-[16/10] overflow-hidden"><img src={e.image_url} alt={e.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /></div>}
                      <div className="p-5">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: '#1AADA015', color: '#1AADA0' }}>{e.type}</span>
                          <span className="text-[11px] text-[#94A3B8]">{fmtDate(e.date)}</span>
                        </div>
                        <h3 className="text-lg font-bold text-[#1e293b] mb-1 group-hover:text-[#0A6070] transition-colors" style={{ fontFamily: 'Cormorant Garamond, serif' }}>{e.title}</h3>
                        <p className="text-[12px] text-[#0A6070] font-semibold mb-2">{e.location}</p>
                        <p className="text-[13px] text-[#64748B] leading-relaxed line-clamp-3">{e.description}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
