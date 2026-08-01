import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart, ArrowRight, Loader2, CheckCircle, Building2, Baby, Coffee,
  Users, Globe, HandHeart, BookOpen, Shield,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';

interface Program {
  id: string;
  slug: string;
  title: string;
  tag: string;
  tagline: string | null;
  description: string;
  image_url: string;
  icon_name: string | null;
  services: string[];
  who_for: string;
  how_to_access: string;
  published: boolean;
  sort_order: number;
}

const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  'Core Program':        { bg: 'bg-[#E8644A]/10', text: 'text-[#E8644A]' },
  'Hospital Program':    { bg: 'bg-[#0A6070]/10', text: 'text-[#0A6070]' },
  'Education':           { bg: 'bg-[#E8A020]/10', text: 'text-[#E8A020]' },
  'Community':           { bg: 'bg-[#2D8A5F]/10', text: 'text-[#2D8A5F]' },
  'Advocacy':            { bg: 'bg-[#0A6070]/10', text: 'text-[#0A6070]' },
  'Specialized Support': { bg: 'bg-[#5A7280]/10', text: 'text-[#5A7280]' },
};
const DEFAULT_TAG = { bg: 'bg-[#5A7280]/10', text: 'text-[#5A7280]' };

const ICON_MAP: Record<string, typeof Heart> = {
  Heart, Building2, Baby, Coffee, Users, Globe, HandHeart, BookOpen, Shield,
};

function getIcon(name: string | null) {
  if (!name) return Heart;
  return ICON_MAP[name] ?? Heart;
}

export default function Programs() {
  const { t } = useLanguage();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const navRef = useRef<HTMLDivElement>(null);
  const [navSticky, setNavSticky] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase
      .from('programs')
      .select('id, slug, title, tag, tagline, description, image_url, icon_name, services, who_for, how_to_access, published, sort_order')
      .eq('published', true)
      .is('deleted_at', null)
      .order('sort_order')
      .then(({ data }) => {
        const mapped = (data ?? []).map(p => ({ ...p, services: Array.isArray(p.services) ? p.services : [] }));
        setPrograms(mapped);
        if (mapped.length > 0) setActiveSlug(mapped[0].slug);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setNavSticky(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (programs.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSlug(entry.target.id);
          }
        }
      },
      { rootMargin: '-30% 0px -60% 0px', threshold: 0 }
    );
    Object.values(sectionRefs.current).forEach(el => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [programs]);

  function scrollToProgram(slug: string) {
    const el = sectionRefs.current[slug];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  const tagColor = (tag: string) => TAG_COLORS[tag] ?? DEFAULT_TAG;

  return (
    <div className="page-enter">
      {/* Hero */}
      <section className="pt-28 pb-12 hero-gradient relative overflow-hidden">
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="section-label !text-[#F0A500] mb-3">{t('programs.label')}</p>
          <h1 className="text-4xl md:text-5xl font-light text-white mb-4" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            {t('programs.title')}
          </h1>
          <p className="text-base text-white/80 max-w-2xl mx-auto" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            {t('programs.sub')}
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 40" fill="none" preserveAspectRatio="none" className="w-full h-8">
            <path d="M0 40L1440 40L1440 10C1200 40 960 0 720 10C480 20 240 40 0 10L0 40Z" fill="#FBF8F3" />
          </svg>
        </div>
      </section>

      {/* Sentinel for sticky detection */}
      <div ref={sentinelRef} className="h-0" />

      {/* Programs Navigation Strip */}
      {programs.length > 0 && (
        <div
          ref={navRef}
          className={`bg-white/95 backdrop-blur-md border-b border-[#E8F0F2] z-40 transition-shadow duration-300 ${navSticky ? 'sticky top-[72px] shadow-md' : ''}`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 py-3 overflow-x-auto scrollbar-hide">
              {programs.map((p) => {
                const isActive = activeSlug === p.slug;
                const tc = tagColor(p.tag);
                return (
                  <button
                    key={p.slug}
                    onClick={() => scrollToProgram(p.slug)}
                    className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 whitespace-nowrap ${
                      isActive
                        ? `${tc.bg} ${tc.text}`
                        : 'text-[#5A7280] hover:text-[#1A2B35] hover:bg-[#F5F8FA]'
                    }`}
                    style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                  >
                    {p.title}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Programs Sections */}
      <section className="bg-[#FBF8F3]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-[#0A6070] animate-spin" /></div>
          ) : programs.length === 0 ? (
            <div className="text-center py-20">
              <Heart className="w-12 h-12 text-[#D8E4E8] mx-auto mb-4" />
              <p className="text-[#5A7280] text-lg" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{t('programs.empty')}</p>
            </div>
          ) : (
            <div className="space-y-28">
              {programs.map((program, i) => {
                const Icon = getIcon(program.icon_name);
                const tc = tagColor(program.tag);
                const isEven = i % 2 !== 0;

                return (
                  <div
                    key={program.id}
                    id={program.slug}
                    ref={el => { sectionRefs.current[program.slug] = el; }}
                    className="scroll-mt-36"
                  >
                    <div className={`grid lg:grid-cols-2 gap-10 lg:gap-16 items-center ${isEven ? 'lg:grid-flow-dense' : ''}`}>
                      {/* Image */}
                      <div className={`relative group ${isEven ? 'lg:col-start-2' : ''}`}>
                        <div className="relative rounded-2xl overflow-hidden shadow-lg aspect-[4/3]">
                          {program.image_url ? (
                            <img
                              src={program.image_url}
                              alt={program.title}
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full bg-[#D8E4E8]/40 flex items-center justify-center">
                              <Icon className="w-16 h-16 text-[#D8E4E8]" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        </div>
                        <div className="absolute -top-3 -left-3 w-10 h-10 rounded-xl bg-white shadow-md flex items-center justify-center">
                          <span className="text-sm font-bold text-[#0A6070]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                            {String(program.sort_order).padStart(2, '0')}
                          </span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className={isEven ? 'lg:col-start-1 lg:row-start-1' : ''}>
                        <div className="flex items-center gap-3 mb-4">
                          <div className={`w-10 h-10 rounded-xl ${tc.bg} flex items-center justify-center`}>
                            <Icon className={`w-5 h-5 ${tc.text}`} />
                          </div>
                          <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${tc.bg} ${tc.text}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                            {program.tag}
                          </span>
                        </div>

                        <h2 className="text-3xl lg:text-4xl font-semibold text-[#1A2B35] mb-2" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                          {program.title}
                        </h2>
                        {program.tagline && (
                          <p className="text-base italic text-[#0A6070] mb-4" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                            &ldquo;{program.tagline}&rdquo;
                          </p>
                        )}

                        <p className="text-[#5A7280] text-sm leading-relaxed mb-6" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                          {program.description}
                        </p>

                        {program.services.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-6">
                            {program.services.slice(0, 4).map((s, j) => (
                              <span
                                key={j}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-[#E8F0F2] text-xs text-[#1A2B35] shadow-sm"
                                style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                              >
                                <CheckCircle className={`w-3 h-3 ${tc.text} flex-shrink-0`} />
                                {s}
                              </span>
                            ))}
                            {program.services.length > 4 && (
                              <span className="inline-flex items-center px-3 py-1.5 bg-[#F5F8FA] rounded-lg text-xs text-[#5A7280]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                                {t('programs.more').replace('{n}', String(program.services.length - 4))}
                              </span>
                            )}
                          </div>
                        )}

                        {(program.who_for || program.how_to_access) && (
                          <div className="grid sm:grid-cols-2 gap-3 mb-6">
                            {program.who_for && (
                              <div className="bg-white rounded-xl p-3 border border-[#E8F0F2]">
                                <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-0.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{t('programs.whosfor')}</p>
                                <p className="text-xs text-[#1A2B35] leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{program.who_for}</p>
                              </div>
                            )}
                            {program.how_to_access && (
                              <div className="bg-white rounded-xl p-3 border border-[#E8F0F2]">
                                <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-0.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{t('programs.howtojoin')}</p>
                                <p className="text-xs text-[#1A2B35] leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{program.how_to_access}</p>
                              </div>
                            )}
                          </div>
                        )}

                        <Link
                          to={`/programs/${program.slug}`}
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0A6070] text-white text-sm font-semibold rounded-xl hover:bg-[#084F5C] transition-all duration-200 shadow-sm hover:shadow-md"
                          style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                        >
                          {t('programs.learnmore')} <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 bg-gradient-to-br from-[#0A6070] to-[#084F5C] relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 left-10 w-40 h-40 rounded-full bg-white" />
          <div className="absolute bottom-10 right-20 w-60 h-60 rounded-full bg-white" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-light text-white mb-4" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            {t('programs.cta.title')}
          </h2>
          <p className="text-white/80 text-sm mb-8 max-w-lg mx-auto" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            {t('programs.cta.desc')}
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-[#0A6070] font-bold text-sm rounded-full hover:bg-[#F5F8FA] transition-all shadow-lg hover:shadow-xl"
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          >
            {t('programs.cta.btn')} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
