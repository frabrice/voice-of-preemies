import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart, Users, Building2, BookOpen, ArrowRight,
  Globe, Shield, HandHeart, Sparkles,
  ChevronLeft, ChevronRight, Newspaper, Calendar
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import SupportModal, { type SupportRole } from '../components/SupportModal';
import { supabase } from '../lib/supabase';

const SLIDES = [
  {
    image: 'https://res.cloudinary.com/dbhyrnypc/image/upload/v1779951323/akagofero_r83ks8.png',
    lineKey: 'hero.slide.1' as const,
  },
  {
    image: 'https://res.cloudinary.com/dbhyrnypc/image/upload/v1779951323/Tender_moment_in_the_NICU_vkmzge.png',
    lineKey: 'hero.slide.2' as const,
  },
  {
    image: 'https://res.cloudinary.com/dbhyrnypc/image/upload/v1779951322/Serene_moments_in_a_cozy_nursery_t13cjj.png',
    lineKey: 'hero.slide.3' as const,
  },
  {
    image: 'https://res.cloudinary.com/dbhyrnypc/image/upload/v1779951322/Supportive_conversation_in_a_cozy_space_mh9heg.png',
    lineKey: 'hero.slide.4' as const,
  },
  {
    image: 'https://res.cloudinary.com/dbhyrnypc/image/upload/v1779951323/Holding_hands_in_neonatal_care_dnak8z.png',
    lineKey: 'hero.slide.5' as const,
  },
];

const SLIDE_DURATION = 6000;

const pillarKeys = [
  {
    titleKey: 'home.pillar.support' as const,
    descKey: 'home.pillar.support.desc' as const,
    icon: Heart,
    color: 'from-rose-50 to-red-50',
    accent: '#E8644A',
    num: '01',
  },
  {
    titleKey: 'home.pillar.education' as const,
    descKey: 'home.pillar.education.desc' as const,
    icon: BookOpen,
    color: 'from-teal-50 to-cyan-50',
    accent: '#1AADA0',
    num: '02',
  },
  {
    titleKey: 'home.pillar.awareness' as const,
    descKey: 'home.pillar.awareness.desc' as const,
    icon: Globe,
    color: 'from-amber-50 to-yellow-50',
    accent: '#E8A020',
    num: '03',
  },
  {
    titleKey: 'home.pillar.hospital' as const,
    descKey: 'home.pillar.hospital.desc' as const,
    icon: Building2,
    color: 'from-emerald-50 to-green-50',
    accent: '#2D8A5F',
    num: '04',
  },
];

interface FeaturedProgram { id: string; slug: string; title: string; description: string; image_url: string; }
interface FeaturedStory { id: string; slug: string; name: string; baby_info: string; location: string; year: number; excerpt: string; image_url: string; }
interface LatestItem { id: string; type: 'news' | 'story' | 'event'; slug: string; title: string; excerpt: string; image_url: string; date: string; }




export default function Home() {
  const { t } = useLanguage();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalRole, setModalRole] = useState<SupportRole | undefined>(undefined);
  const [featuredStory, setFeaturedStory] = useState<FeaturedStory | null>(null);
  const [featuredPrograms, setFeaturedPrograms] = useState<FeaturedProgram[]>([]);
  const [latestItems, setLatestItems] = useState<LatestItem[]>([]);

  useEffect(() => {
    supabase
      .from('stories')
      .select('id, slug, name, baby_info, location, year, excerpt, image_url')
      .eq('published', true)
      .is('deleted_at', null)
      .order('year', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setFeaturedStory(data));

    supabase
      .from('programs')
      .select('id, slug, title, description, image_url')
      .eq('published', true)
      .is('deleted_at', null)
      .order('sort_order')
      .limit(3)
      .then(({ data }) => setFeaturedPrograms(data ?? []));

    Promise.all([
      supabase.from('news_articles').select('id, slug, title, excerpt, image_url, date').eq('published', true).is('deleted_at', null).order('date', { ascending: false }).limit(3),
      supabase.from('stories').select('id, slug, name, excerpt, image_url, created_at').eq('published', true).is('deleted_at', null).order('created_at', { ascending: false }).limit(3),
      supabase.from('events').select('id, slug, title, description, image_url, date').eq('published', true).is('deleted_at', null).order('date', { ascending: false }).limit(3),
    ]).then(([news, stories, events]) => {
      const items: LatestItem[] = [
        ...(news.data ?? []).map((n): LatestItem => ({ id: n.id, type: 'news', slug: n.slug, title: n.title, excerpt: n.excerpt, image_url: n.image_url, date: n.date })),
        ...(stories.data ?? []).map((s): LatestItem => ({ id: s.id, type: 'story', slug: s.slug, title: s.name, excerpt: s.excerpt, image_url: s.image_url, date: s.created_at })),
        ...(events.data ?? []).map((e): LatestItem => ({ id: e.id, type: 'event', slug: e.slug, title: e.title, excerpt: e.description, image_url: e.image_url, date: e.date })),
      ];
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setLatestItems(items.slice(0, 3));
    });
  }, []);

  // Slideshow state
  const [current, setCurrent] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = useCallback((index: number) => {
    if (transitioning || index === current) return;
    setPrev(current);
    setTransitioning(true);
    setProgress(0);
    setCurrent(index);
    setTimeout(() => { setPrev(null); setTransitioning(false); }, 900);
  }, [current, transitioning]);

  const goNext = useCallback(() => {
    goTo((current + 1) % SLIDES.length);
  }, [current, goTo]);

  const goPrev = useCallback(() => {
    goTo((current - 1 + SLIDES.length) % SLIDES.length);
  }, [current, goTo]);

  // Auto-advance + progress bar
  useEffect(() => {
    setProgress(0);
    const start = Date.now();

    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      setProgress(Math.min((elapsed / SLIDE_DURATION) * 100, 100));
    }, 30);

    timerRef.current = setTimeout(() => {
      goNext();
    }, SLIDE_DURATION);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [current, goNext]);

  const openModal = (role?: SupportRole) => {
    setModalRole(role);
    setModalOpen(true);
  };

  return (
    <div>
      {/* ─── HERO ─────────────────────────────────────────────────────────────── */}
      <div className="h-[68px] xl:h-[116px] w-full bg-white" aria-hidden="true" />
      <style>{`
        .hero-section {
          min-height: calc(100vh - 68px);
          height: calc(100vh - 68px);
        }
        .hero-section {
          min-height: calc(100svh - 68px);
          height: calc(100svh - 68px);
        }
        @media (min-width: 1280px) {
          .hero-section {
            min-height: calc(100vh - 116px);
            height: calc(100vh - 116px);
          }
        }
      `}</style>
      <section className="hero-section relative overflow-hidden">

        {/* ── Slide images (cross-fade) ── */}
        {SLIDES.map((slide, i) => {
          const isActive = i === current;
          const isPrev = i === prev;
          return (
            <div
              key={i}
              aria-hidden={!isActive}
              className="absolute inset-0 transition-opacity duration-[900ms] ease-in-out"
              style={{ opacity: isActive ? 1 : isPrev ? 0 : 0, zIndex: isActive ? 2 : isPrev ? 1 : 0 }}
            >
              <img
                src={slide.image}
                alt={t(slide.lineKey)}
                className="w-full h-full object-cover object-top"
                loading={i === 0 ? 'eager' : 'lazy'}
              />
            </div>
          );
        })}

        {/* ── Bottom gradient for text legibility ── */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            zIndex: 3,
            background: 'linear-gradient(to top, rgba(5,20,26,0.82) 0%, rgba(5,20,26,0.55) 30%, rgba(5,20,26,0.10) 60%, rgba(0,0,0,0) 100%)',
          }}
        />

        {/* ── Left vignette for depth ── */}
        <div
          className="absolute inset-0 pointer-events-none hidden xl:block"
          style={{ zIndex: 3, background: 'linear-gradient(to right, rgba(5,20,26,0.30) 0%, transparent 40%)' }}
        />

        {/* ── Side nav arrows ── */}
        <button
          onClick={goPrev}
          aria-label="Previous slide"
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-black/25 hover:bg-black/45 border border-white/20 text-white transition-all duration-200 backdrop-blur-sm"
          style={{ zIndex: 4 }}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={goNext}
          aria-label="Next slide"
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-black/25 hover:bg-black/45 border border-white/20 text-white transition-all duration-200 backdrop-blur-sm"
          style={{ zIndex: 4 }}
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* ── Bottom content zone ── */}
        <div
          className="absolute bottom-0 left-0 right-0 z-10 px-5 sm:px-8 lg:px-12 pb-7 sm:pb-9"
          style={{ zIndex: 4 }}
        >
          <div className="max-w-[1400px] mx-auto">

            {/* Slide headline — cross-fades with the slide */}
            <div className="relative overflow-hidden mb-5 sm:mb-6" style={{ minHeight: '1.2em' }}>
              {SLIDES.map((slide, i) => (
                <p
                  key={i}
                  className="transition-all duration-700 ease-in-out"
                  style={{
                    fontFamily: 'Cormorant Garamond, serif',
                    fontSize: 'clamp(28px, 5vw, 58px)',
                    fontWeight: 300,
                    lineHeight: 1.15,
                    letterSpacing: '-0.01em',
                    color: 'rgba(255,255,255,0.97)',
                    position: i === current ? 'relative' : 'absolute',
                    top: 0,
                    left: 0,
                    opacity: i === current ? 1 : 0,
                    transform: i === current ? 'translateY(0)' : 'translateY(8px)',
                    pointerEvents: i === current ? 'auto' : 'none',
                    maxWidth: '860px',
                  }}
                >
                  {t(slide.lineKey)}
                </p>
              ))}
            </div>

            {/* CTA buttons */}
            <div className="flex flex-wrap gap-3 mb-7 sm:mb-8">
              <button
                onClick={() => openModal()}
                className="group inline-flex items-center gap-2 px-5 sm:px-7 py-3 sm:py-3.5 rounded-full font-bold text-[13px] sm:text-sm text-white transition-all duration-200 shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #0A6070 0%, #1AADA0 100%)',
                  boxShadow: '0 6px 24px rgba(10,96,112,0.40)',
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                }}
              >
                <Heart className="w-3.5 h-3.5 fill-white flex-shrink-0" />
                {t('btn.getSupport')}
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform flex-shrink-0" />
              </button>
              <Link
                to="/donate#choose"
                className="inline-flex items-center gap-2 px-5 sm:px-7 py-3 sm:py-3.5 rounded-full font-bold text-[13px] sm:text-sm bg-white text-[#0A6070] hover:bg-white/95 transition-all duration-200"
                style={{ boxShadow: '0 6px 20px rgba(0,0,0,0.18)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
              >
                {t('btn.donate')}
              </Link>
              <Link
                to="/prematurity"
                className="inline-flex items-center gap-2 px-5 sm:px-7 py-3 sm:py-3.5 rounded-full font-semibold text-[13px] sm:text-sm text-white border border-white/30 hover:border-white/55 hover:bg-white/10 transition-all duration-200 backdrop-blur-sm"
                style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                {t('hero.learnPrematurity')}
                <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" />
              </Link>
            </div>

            {/* Progress indicators */}
            <div className="flex items-center gap-2">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className="relative overflow-hidden rounded-full transition-all duration-300"
                  style={{
                    height: '3px',
                    width: i === current ? '48px' : '20px',
                    background: 'rgba(255,255,255,0.30)',
                  }}
                >
                  {i === current && (
                    <span
                      className="absolute inset-y-0 left-0 rounded-full bg-white transition-none"
                      style={{ width: `${progress}%` }}
                    />
                  )}
                </button>
              ))}
            </div>

          </div>
        </div>

      </section>

      {/* ─── WHAT WE DO ───────────────────────────────────────────────────────── */}
      <section className="py-24 bg-[#FBF8F3]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-end mb-16">
            <div>
              <p className="section-label mb-4">{t('home.mission.label')}</p>
              <h2 className="section-title">{t('home.mission.title')}</h2>
            </div>
            <p className="text-[#5A7280] text-base leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              {t('home.mission.sub')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {pillarKeys.map((pillar, i) => (
              <div
                key={i}
                className={`relative rounded-3xl bg-gradient-to-br ${pillar.color} p-8 overflow-hidden group hover:shadow-lg transition-all duration-300`}
              >
                <span
                  className="absolute top-5 right-5 text-6xl font-bold opacity-[0.08] select-none"
                  style={{ fontFamily: 'Cormorant Garamond, serif', color: pillar.accent }}
                >
                  {pillar.num}
                </span>
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-sm"
                  style={{ backgroundColor: `${pillar.accent}18` }}
                >
                  <pillar.icon className="w-6 h-6" style={{ color: pillar.accent }} />
                </div>
                <h3 className="text-xl font-semibold text-[#1A2B35] mb-3" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                  {t(pillar.titleKey)}
                </h3>
                <p className="text-sm text-[#5A7280] leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  {t(pillar.descKey)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURED SERVICES ────────────────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <p className="section-label mb-3">{t('home.services.label')}</p>
              <h2 className="section-title">{t('home.services.title')}</h2>
            </div>
            <Link to="/programs" className="btn-secondary self-start" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              {t('misc.allPrograms')} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {featuredPrograms.length > 0 && (
            <div className="grid md:grid-cols-3 gap-6">
              {featuredPrograms.map((program) => (
                <Link
                  key={program.id}
                  to={`/programs/${program.slug}`}
                  className="card group"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                >
                  <div className="h-56 overflow-hidden relative">
                    {program.image_url ? (
                      <img
                        src={program.image_url}
                        alt={program.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    ) : (
                      <div className="w-full h-full hero-gradient" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  </div>
                  <div className="p-7">
                    <h3 className="text-xl font-semibold text-[#1A2B35] mb-2 group-hover:text-[#0A6070] transition-colors" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                      {program.title}
                    </h3>
                    <p className="text-sm text-[#5A7280] mb-5 leading-relaxed line-clamp-3" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                      {program.description}
                    </p>
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0A6070] group-hover:gap-3 transition-all" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                      {t('btn.learnMore')} <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── TESTIMONIAL ──────────────────────────────────────────────────────── */}
      {featuredStory && (
        <section className="py-24 bg-[#FBF8F3]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
              <div className="grid md:grid-cols-2">
                <div className="relative h-64 md:h-auto">
                  {featuredStory.image_url ? (
                    <img
                      src={featuredStory.image_url}
                      alt={featuredStory.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full hero-gradient" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1A2B35]/40 to-transparent" />
                </div>
                <div className="p-10 md:p-14 flex flex-col justify-center">
                  <p className="section-label mb-5">{t('home.story.label')}</p>
                  {/* Big decorative quote */}
                  <div
                    className="text-[80px] leading-none mb-1 font-bold"
                    style={{ fontFamily: 'Cormorant Garamond, serif', color: '#0A6070', opacity: 0.3, lineHeight: '0.6' }}
                  >
                    "
                  </div>
                  <blockquote
                    className="text-2xl font-light text-[#1A2B35] leading-relaxed mb-7"
                    style={{ fontFamily: 'Cormorant Garamond, serif' }}
                  >
                    {featuredStory.excerpt}
                  </blockquote>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#0A6070]/10 flex items-center justify-center">
                      <Heart className="w-5 h-5 text-[#0A6070] fill-[#0A6070]" />
                    </div>
                    <div>
                      <p className="font-bold text-[#1A2B35] text-sm" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{featuredStory.name}</p>
                      <p className="text-xs text-[#5A7280]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{featuredStory.baby_info || `${featuredStory.location} · ${featuredStory.year}`}</p>
                    </div>
                  </div>
                  <Link
                    to={`/stories/${featuredStory.slug}`}
                    className="btn-secondary mt-8 self-start"
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  >
                    {t('misc.readStories')} <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─── LATEST FROM US ───────────────────────────────────────────────────── */}
      {latestItems.length > 0 && (
        <section className="py-24 bg-white">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
              <div>
                <p className="section-label mb-3">{t('home.news.label')}</p>
                <h2 className="section-title">{t('home.news.title')}</h2>
              </div>
              <Link to="/publications" className="btn-secondary self-start" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                {t('btn.allNews')} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {latestItems.map((item) => {
                const href = item.type === 'news' ? `/news/${item.slug}` : item.type === 'story' ? `/stories/${item.slug}` : `/events/${item.slug}`;
                const Icon = item.type === 'event' ? Calendar : item.type === 'story' ? Heart : Newspaper;
                const tagKey = item.type === 'news' ? 'misc.tag.news' : item.type === 'story' ? 'misc.tag.story' : 'misc.tag.event';
                return (
                  <Link
                    key={`${item.type}-${item.id}`}
                    to={href}
                    className="card group"
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  >
                    <div className="h-48 overflow-hidden relative">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                      ) : (
                        <div className="w-full h-full hero-gradient" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                      <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 bg-white/95 text-[#0A6070] text-xs font-semibold px-3 py-1.5 rounded-full" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                        <Icon className="w-3.5 h-3.5" /> {t(tagKey)}
                      </span>
                    </div>
                    <div className="p-6">
                      <h3 className="text-lg font-semibold text-[#1A2B35] mb-2 group-hover:text-[#0A6070] transition-colors line-clamp-2" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                        {item.title}
                      </h3>
                      <p className="text-sm text-[#5A7280] mb-4 leading-relaxed line-clamp-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                        {item.excerpt}
                      </p>
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0A6070] group-hover:gap-3 transition-all" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                        {t('btn.readMore')} <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ─── DONATION CTA ─────────────────────────────────────────────────────── */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #0A6070 0%, #1AADA0 50%, #E8644A 100%)' }} />
        <div className="absolute inset-0 opacity-[0.06]" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }} />
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-10">
          <img
            src="https://images.pexels.com/photos/33512002/pexels-photo-33512002.jpeg?auto=compress&cs=tinysrgb&w=800"
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Sparkles className="w-10 h-10 text-[#E8A020] mx-auto mb-6 opacity-80" />
          <h2 className="section-title-white mb-5">{t('home.cta.title')}</h2>
          <p className="text-white/75 text-lg mb-10 max-w-2xl mx-auto leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            {t('home.cta.sub')}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/donate#choose"
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-full font-bold text-sm bg-white text-[#0A6070] hover:bg-white/95 transition-all shadow-xl"
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            >
              <Heart className="w-4 h-4 fill-[#0A6070]" />
              {t('btn.donateNow')}
            </Link>
            <Link
              to="/get-involved"
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-full font-bold text-sm text-white border-2 border-white/30 hover:bg-white/10 hover:border-white/50 transition-all"
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              {t('home.getinvolved')}
            </Link>
          </div>
        </div>
      </section>

      {/* ─── BOTTOM CTA TRIO ──────────────────────────────────────────────────── */}
      <section className="py-16" style={{ background: 'linear-gradient(135deg, #0A6070 0%, #1AADA0 100%)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { icon: Users, title: 'Parent Community', desc: 'Join a group of parents who understand.', path: '/support' },
              { icon: Shield, title: 'For Professionals', desc: 'Resources for healthcare partners.', path: '/healthcare' },
              { icon: HandHeart, title: 'Request Support', desc: 'Reach out to our team directly.', path: '/support' },
            ].map((item, i) => (
              <Link
                key={i}
                to={item.path}
                className="group flex flex-col items-center text-center p-8 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 transition-all duration-200"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center mb-4 group-hover:bg-white/25 transition-colors">
                  <item.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                  {item.title}
                </h3>
                <p className="text-sm text-white/70 mb-4" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  {item.desc}
                </p>
                <span className="text-xs font-semibold text-[#E8A020] flex items-center gap-1 group-hover:gap-2 transition-all" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  {t('btn.learnMore')} <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <SupportModal open={modalOpen} initialRole={modalRole} onClose={() => setModalOpen(false)} />
    </div>
  );
}