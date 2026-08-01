import { useState, useEffect } from 'react';
import { Calendar, ArrowRight, Tag, Loader2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';

interface Article {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  tag: string;
  date: string;
  image_url: string;
  published: boolean;
  featured: boolean;
}

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  type: string;
  image_url: string;
  registration_url: string;
  published: boolean;
}

const TAG_COLORS: Record<string, string> = {
  Event:       'bg-[#E8644A]/10 text-[#E8644A]',
  Partnership: 'bg-[#0A6070]/10 text-[#0A6070]',
  Story:       'bg-[#E8A020]/10 text-[#E8A020]',
  Research:    'bg-[#2D8A5F]/10 text-[#2D8A5F]',
  Education:   'bg-[#5A7280]/10 text-[#5A7280]',
  Advocacy:    'bg-[#E8644A]/10 text-[#E8644A]',
  News:        'bg-[#0A6070]/10 text-[#0A6070]',
};
const DEFAULT_TAG_COLOR = 'bg-[#5A7280]/10 text-[#5A7280]';

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

export default function News() {
  const { t } = useLanguage();
  const [articles, setArticles] = useState<Article[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('news_articles').select('*').eq('published', true).is('deleted_at', null).order('date', { ascending: false }),
      supabase.from('events').select('*').eq('published', true).is('deleted_at', null).order('date', { ascending: true }),
    ]).then(([{ data: arts }, { data: evts }]) => {
      setArticles(arts ?? []);
      setEvents(evts ?? []);
      setLoading(false);
    });
  }, []);

  const featured = articles.find(a => a.featured) ?? articles[0] ?? null;
  const rest = featured ? articles.filter(a => a.id !== featured.id) : [];

  return (
    <div className="page-enter">
      {/* Hero */}
      <section className="pt-36 pb-20 hero-gradient relative overflow-hidden">
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="section-label !text-[#F0A500] mb-4">{t('news.label')}</p>
          <h1 className="text-5xl md:text-6xl font-light text-white mb-6" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            {t('news.title')}
          </h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            {t('news.sub')}
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none">
            <path d="M0 60L1440 60L1440 20C1200 60 960 0 720 20C480 40 240 60 0 20L0 60Z" fill="#FBF8F3" />
          </svg>
        </div>
      </section>

      {loading ? (
        <section className="py-20 bg-[#FBF8F3]">
          <div className="flex justify-center"><Loader2 className="w-8 h-8 text-[#0A6070] animate-spin" /></div>
        </section>
      ) : (
        <>
          {/* Featured article */}
          {featured && (
            <section className="py-16 bg-[#FBF8F3]">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <p className="section-label mb-6">{t('news.featured')}</p>
                <div className="bg-white rounded-3xl overflow-hidden shadow-sm grid md:grid-cols-5">
                  <div className="md:col-span-3 h-64 md:h-auto">
                    {featured.image_url ? (
                      <img src={featured.image_url} alt={featured.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-[#D8E4E8]/40" />
                    )}
                  </div>
                  <div className="md:col-span-2 p-8 md:p-10 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-5">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${TAG_COLORS[featured.tag] ?? DEFAULT_TAG_COLOR}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                        {featured.tag}
                      </span>
                      <span className="text-xs text-[#5A7280]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{fmtDate(featured.date)}</span>
                    </div>
                    <h2 className="text-3xl font-semibold text-[#1A2B35] mb-4 leading-tight" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                      {featured.title}
                    </h2>
                    <p className="text-sm text-[#5A7280] mb-6 leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                      {featured.excerpt}
                    </p>
                    <button className="btn-primary self-start !text-sm">
                      {t('btn.readFullStory')} <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Articles grid */}
          {rest.length > 0 && (
            <section className="py-16 bg-[#FBF8F3]">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="section-title mb-10">{t('news.latest')}</h2>
                <div className="grid md:grid-cols-3 gap-6">
                  {rest.map(article => (
                    <article key={article.id} className="card group">
                      <div className="h-48 overflow-hidden">
                        {article.image_url ? (
                          <img src={article.image_url} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full bg-[#D8E4E8]/40" />
                        )}
                      </div>
                      <div className="p-6">
                        <div className="flex items-center gap-3 mb-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${TAG_COLORS[article.tag] ?? DEFAULT_TAG_COLOR}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                            {article.tag}
                          </span>
                          <span className="text-xs text-[#5A7280]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{fmtDate(article.date)}</span>
                        </div>
                        <h3 className="text-lg font-semibold text-[#1A2B35] mb-2 group-hover:text-[#0A6070] transition-colors leading-snug" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                          {article.title}
                        </h3>
                        <p className="text-sm text-[#5A7280] line-clamp-3" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                          {article.excerpt}
                        </p>
                        <button className="mt-4 text-sm font-semibold text-[#E8644A] flex items-center gap-1 hover:gap-2 transition-all" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                          {t('news.readmore')} <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          )}

          {articles.length === 0 && (
            <section className="py-20 bg-[#FBF8F3]">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <p className="text-[#5A7280] text-lg" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>No news articles published yet.</p>
              </div>
            </section>
          )}

          {/* Upcoming Events */}
          <section className="py-16 bg-white border-t border-[#D8E4E8]">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-end justify-between mb-10">
                <div>
                  <p className="section-label mb-3">{t('news.events.label')}</p>
                  <h2 className="section-title">{t('news.events.title')}</h2>
                </div>
              </div>
              {events.length === 0 ? (
                <p className="text-[#5A7280] text-center py-8" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>No upcoming events at this time.</p>
              ) : (
                <div className="space-y-4">
                  {events.map(event => (
                    <div key={event.id} className="flex flex-col sm:flex-row sm:items-center gap-5 p-6 bg-[#FBF8F3] rounded-2xl hover:bg-[#EDF5F7] transition-colors">
                      <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-[#0A6070] flex flex-col items-center justify-center text-white">
                        <span className="text-xs font-semibold" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                          {new Date(event.date).toLocaleString('en', { month: 'short' }).toUpperCase()}
                        </span>
                        <span className="text-2xl font-bold leading-tight" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                          {new Date(event.date).getDate()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Tag className="w-3.5 h-3.5 text-[#E8644A]" />
                          <span className="text-xs text-[#E8644A] font-semibold" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{event.type}</span>
                        </div>
                        <h3 className="text-lg font-semibold text-[#1A2B35]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                          {event.title}
                        </h3>
                        <p className="text-sm text-[#5A7280] flex items-center gap-1.5 mt-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                          <Calendar className="w-3.5 h-3.5" />
                          {fmtDate(event.date)}{event.location ? ` · ${event.location}` : ''}
                        </p>
                      </div>
                      {event.registration_url ? (
                        <a
                          href={event.registration_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 btn-secondary !text-xs !py-2 !px-4"
                        >
                          {t('news.register')}
                        </a>
                      ) : (
                        <button className="flex-shrink-0 btn-secondary !text-xs !py-2 !px-4">
                          {t('news.register')}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
