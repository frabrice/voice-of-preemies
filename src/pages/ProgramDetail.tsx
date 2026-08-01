import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  Heart, ArrowLeft, ArrowRight, Loader2, CheckCircle, Building2, Baby, Coffee,
  Users, Globe, HandHeart, BookOpen, Shield, MapPin, Clock,
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
  long_description: string | null;
  image_url: string;
  icon_name: string | null;
  services: string[];
  who_for: string;
  how_to_access: string;
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

export default function ProgramDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [program, setProgram] = useState<Program | null>(null);
  const [related, setRelated] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    window.scrollTo(0, 0);

    supabase
      .from('programs')
      .select('id, slug, title, tag, tagline, description, long_description, image_url, icon_name, services, who_for, how_to_access, sort_order')
      .eq('slug', slug)
      .eq('published', true)
      .is('deleted_at', null)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) {
          navigate('/programs', { replace: true });
          return;
        }
        setProgram({ ...data, services: Array.isArray(data.services) ? data.services : [] });
        setLoading(false);

        supabase
          .from('programs')
          .select('id, slug, title, tag, tagline, description, long_description, image_url, icon_name, services, who_for, how_to_access, sort_order')
          .eq('published', true)
          .is('deleted_at', null)
          .neq('slug', slug)
          .order('sort_order')
          .limit(3)
          .then(({ data: rel }) => {
            setRelated((rel ?? []).map(p => ({ ...p, services: Array.isArray(p.services) ? p.services : [] })));
          });
      });
  }, [slug, navigate]);

  if (loading) {
    return (
      <div className="page-enter min-h-screen flex items-center justify-center bg-[#FBF8F3]">
        <Loader2 className="w-8 h-8 text-[#0A6070] animate-spin" />
      </div>
    );
  }

  if (!program) return null;

  const Icon = getIcon(program.icon_name);
  const tc = TAG_COLORS[program.tag] ?? DEFAULT_TAG;

  return (
    <div className="page-enter">
      {/* Hero with Image */}
      <section className="relative h-[380px] md:h-[440px] overflow-hidden">
        {program.image_url ? (
          <img
            src={program.image_url}
            alt={program.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 hero-gradient" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />

        <div className="relative h-full flex flex-col justify-end max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
          {/* Back link */}
          <Link
            to="/programs"
            className="absolute top-28 left-4 sm:left-6 lg:left-8 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/15 backdrop-blur-md text-white text-xs font-semibold rounded-lg hover:bg-white/25 transition-colors"
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          >
            <ArrowLeft className="w-3.5 h-3.5" /> {t('programs.back')}
          </Link>

          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
              <Icon className="w-5 h-5 text-white" />
            </div>
            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-white/15 backdrop-blur-sm text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              {program.tag}
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-white mb-3" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            {program.title}
          </h1>
          {program.tagline && (
            <p className="text-lg text-white/85 italic max-w-2xl" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              &ldquo;{program.tagline}&rdquo;
            </p>
          )}
        </div>
      </section>

      {/* Content */}
      <section className="bg-[#FBF8F3] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Description */}
              <div className="mb-10">
                <p className="text-[#1A2B35] text-base leading-[1.8] whitespace-pre-line" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  {program.long_description || program.description}
                </p>
              </div>

              {/* Services */}
              {program.services.length > 0 && (
                <div className="mb-10">
                  <h2 className="text-2xl font-semibold text-[#1A2B35] mb-6" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                    {t('programs.services')}
                  </h2>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {program.services.map((service, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-4 bg-white rounded-xl border border-[#E8F0F2] shadow-sm hover:shadow-md transition-shadow duration-200"
                      >
                        <CheckCircle className={`w-5 h-5 ${tc.text} flex-shrink-0 mt-0.5`} />
                        <span className="text-sm text-[#1A2B35] leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                          {service}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Request Support CTA */}
              <div className="bg-gradient-to-br from-[#0A6070] to-[#084F5C] rounded-2xl p-8 text-center">
                <h3 className="text-2xl font-light text-white mb-3" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                  {t('programs.cta.title')}
                </h3>
                <p className="text-white/75 text-sm mb-6 max-w-md mx-auto" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  {t('programs.cta.desc')}
                </p>
                <Link
                  to="/support#request"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#0A6070] font-bold text-sm rounded-full hover:bg-[#F5F8FA] transition-all shadow-md"
                  style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                >
                  {t('programs.requestsupport')} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-28 space-y-6">
                {/* Quick Info Card */}
                <div className="bg-white rounded-2xl border border-[#E8F0F2] shadow-sm overflow-hidden">
                  <div className={`px-6 py-4 border-b border-[#E8F0F2] ${tc.bg}`}>
                    <div className="flex items-center gap-2">
                      <Icon className={`w-5 h-5 ${tc.text}`} />
                      <h3 className={`text-sm font-bold ${tc.text}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                        Quick Info
                      </h3>
                    </div>
                  </div>
                  <div className="p-6 space-y-5">
                    {program.who_for && (
                      <div className="flex items-start gap-3">
                        <Users className="w-4 h-4 text-[#94A3B8] flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{t('programs.whosfor')}</p>
                          <p className="text-xs text-[#1A2B35] leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{program.who_for}</p>
                        </div>
                      </div>
                    )}
                    {program.how_to_access && (
                      <div className="flex items-start gap-3">
                        <MapPin className="w-4 h-4 text-[#94A3B8] flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{t('programs.howtojoin')}</p>
                          <p className="text-xs text-[#1A2B35] leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{program.how_to_access}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <Clock className="w-4 h-4 text-[#94A3B8] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Program Type</p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${tc.bg} ${tc.text}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                          {program.tag}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact CTA */}
                <div className="bg-[#FBF8F3] rounded-2xl border border-[#E8F0F2] p-6 text-center">
                  <Heart className="w-8 h-8 text-[#E8644A] mx-auto mb-3" />
                  <p className="text-xs text-[#5A7280] mb-4" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    Questions about this program?
                  </p>
                  <Link
                    to="/contact"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0A6070] text-white text-xs font-bold rounded-xl hover:bg-[#084F5C] transition-colors w-full justify-center"
                    style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                  >
                    {t('programs.cta.btn')} <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Related Programs */}
      {related.length > 0 && (
        <section className="py-16 bg-white border-t border-[#E8F0F2]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-semibold text-[#1A2B35] mb-8" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              {t('programs.related')}
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {related.map((rel) => {
                const RelIcon = getIcon(rel.icon_name);
                const rtc = TAG_COLORS[rel.tag] ?? DEFAULT_TAG;
                return (
                  <Link
                    key={rel.id}
                    to={`/programs/${rel.slug}`}
                    className="group bg-[#FBF8F3] rounded-2xl overflow-hidden border border-[#E8F0F2] hover:shadow-lg transition-all duration-300"
                  >
                    <div className="relative h-44 overflow-hidden">
                      {rel.image_url ? (
                        <img
                          src={rel.image_url}
                          alt={rel.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-[#D8E4E8]/40 flex items-center justify-center">
                          <RelIcon className="w-10 h-10 text-[#D8E4E8]" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                    </div>
                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <RelIcon className={`w-4 h-4 ${rtc.text}`} />
                        <span className={`text-[10px] font-bold ${rtc.text}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                          {rel.tag}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-[#1A2B35] mb-1 group-hover:text-[#0A6070] transition-colors" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                        {rel.title}
                      </h3>
                      <p className="text-xs text-[#5A7280] line-clamp-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                        {rel.description}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
