import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Loader2, MapPin, Calendar, Heart, Users } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';

interface EventItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  date: string;
  end_date: string | null;
  location: string;
  type: string;
  image_url: string;
  gallery_urls: string[];
  organizer: string;
}

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  workshop: { bg: 'bg-[#E8A020]/10', text: 'text-[#E8A020]' },
  conference: { bg: 'bg-[#0A6070]/10', text: 'text-[#0A6070]' },
  fundraiser: { bg: 'bg-[#E8644A]/10', text: 'text-[#E8644A]' },
  meeting: { bg: 'bg-[#5A7280]/10', text: 'text-[#5A7280]' },
  training: { bg: 'bg-[#1AADA0]/10', text: 'text-[#1AADA0]' },
  Community: { bg: 'bg-[#2D8A5F]/10', text: 'text-[#2D8A5F]' },
  Awareness: { bg: 'bg-[#E8644A]/10', text: 'text-[#E8644A]' },
};
const DEFAULT_TYPE = { bg: 'bg-[#5A7280]/10', text: 'text-[#5A7280]' };

export default function EventDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [related, setRelated] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    window.scrollTo(0, 0);

    supabase
      .from('events')
      .select('id, slug, title, description, date, end_date, location, type, image_url, gallery_urls, organizer')
      .eq('slug', slug)
      .eq('published', true)
      .is('deleted_at', null)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) {
          navigate('/publications', { replace: true });
          return;
        }
        setEvent(data);
        setLoading(false);

        supabase
          .from('events')
          .select('id, slug, title, description, date, end_date, location, type, image_url, gallery_urls, organizer')
          .eq('published', true)
          .is('deleted_at', null)
          .neq('slug', slug)
          .order('date', { ascending: false })
          .limit(3)
          .then(({ data: rel }) => setRelated(rel ?? []));
      });
  }, [slug, navigate]);

  if (loading) {
    return (
      <div className="page-enter min-h-screen flex items-center justify-center bg-[#FBF8F3]">
        <Loader2 className="w-8 h-8 text-[#0A6070] animate-spin" />
      </div>
    );
  }

  if (!event) return null;

  const tc = TYPE_COLORS[event.type] ?? DEFAULT_TYPE;
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const dateRange = event.end_date && event.end_date !== event.date
    ? `${fmtDate(event.date)} – ${fmtDate(event.end_date)}`
    : fmtDate(event.date);

  return (
    <div className="page-enter">
      {/* Hero with Image */}
      <section className="relative h-[380px] md:h-[440px] overflow-hidden">
        {event.image_url ? (
          <img src={event.image_url} alt={event.title} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 hero-gradient" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />

        <div className="relative h-full flex flex-col justify-end max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
          <Link
            to="/publications"
            className="absolute top-28 left-4 sm:left-6 lg:left-8 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/15 backdrop-blur-md text-white text-xs font-semibold rounded-lg hover:bg-white/25 transition-colors"
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          >
            <ArrowLeft className="w-3.5 h-3.5" /> {t('pub.title')}
          </Link>

          <div className="flex items-center gap-3 mb-3">
            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-white/15 backdrop-blur-sm text-white capitalize" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              {event.type}
            </span>
            <span className="flex items-center gap-1.5 text-white/80 text-xs" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              <Calendar className="w-3.5 h-3.5" /> {dateRange}
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-white mb-3 max-w-4xl" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            {event.title}
          </h1>
          {event.location && (
            <p className="flex items-center gap-1.5 text-white/85 text-sm" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              <MapPin className="w-4 h-4" /> {event.location}
            </p>
          )}
        </div>
      </section>

      {/* Content */}
      <section className="bg-[#FBF8F3] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2">
              <div className="mb-10">
                <p className="text-[#1A2B35] text-base leading-[1.8] whitespace-pre-line" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  {event.description}
                </p>
              </div>

              {event.gallery_urls?.length > 0 && (
                <div className="mb-10">
                  <h3 className="text-lg font-semibold text-[#1A2B35] mb-4" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Photos from the Event</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {event.gallery_urls.map((url, i) => (
                      <div key={i} className="aspect-square rounded-xl overflow-hidden">
                        <img src={url} alt={`${event.title} — photo ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" loading="lazy" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-28 space-y-6">
                <div className="bg-white rounded-2xl border border-[#E8F0F2] shadow-sm overflow-hidden">
                  <div className={`px-6 py-4 border-b border-[#E8F0F2] ${tc.bg}`}>
                    <div className="flex items-center gap-2">
                      <Calendar className={`w-5 h-5 ${tc.text}`} />
                      <h3 className={`text-sm font-bold ${tc.text}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Event Info</h3>
                    </div>
                  </div>
                  <div className="p-6 space-y-5">
                    <div className="flex items-start gap-3">
                      <Calendar className="w-4 h-4 text-[#94A3B8] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>When</p>
                        <p className="text-xs text-[#1A2B35] leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{dateRange}</p>
                      </div>
                    </div>
                    {event.location && (
                      <div className="flex items-start gap-3">
                        <MapPin className="w-4 h-4 text-[#94A3B8] flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Where</p>
                          <p className="text-xs text-[#1A2B35] leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{event.location}</p>
                        </div>
                      </div>
                    )}
                    {event.organizer && (
                      <div className="flex items-start gap-3">
                        <Users className="w-4 h-4 text-[#94A3B8] flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Organized By</p>
                          <p className="text-xs text-[#1A2B35] leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{event.organizer}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <Calendar className="w-4 h-4 text-[#94A3B8] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Type</p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize ${tc.bg} ${tc.text}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{event.type}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#FBF8F3] rounded-2xl border border-[#E8F0F2] p-6 text-center">
                  <Heart className="w-8 h-8 text-[#E8644A] mx-auto mb-3" />
                  <p className="text-xs text-[#5A7280] mb-4" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Want to know about our next event?</p>
                  <Link
                    to="/contact"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0A6070] text-white text-xs font-bold rounded-xl hover:bg-[#084F5C] transition-colors w-full justify-center"
                    style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                  >
                    Get in Touch <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Related Events */}
      {related.length > 0 && (
        <section className="py-16 bg-white border-t border-[#E8F0F2]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-semibold text-[#1A2B35] mb-8" style={{ fontFamily: 'Cormorant Garamond, serif' }}>More Events</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {related.map((rel) => {
                const rtc = TYPE_COLORS[rel.type] ?? DEFAULT_TYPE;
                return (
                  <Link
                    key={rel.id}
                    to={`/events/${rel.slug}`}
                    className="group bg-[#FBF8F3] rounded-2xl overflow-hidden border border-[#E8F0F2] hover:shadow-lg transition-all duration-300"
                  >
                    <div className="relative h-44 overflow-hidden">
                      {rel.image_url ? (
                        <img src={rel.image_url} alt={rel.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                      ) : (
                        <div className="w-full h-full bg-[#D8E4E8]/40 flex items-center justify-center">
                          <Calendar className="w-10 h-10 text-[#D8E4E8]" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                    </div>
                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[10px] font-bold capitalize ${rtc.text}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{rel.type}</span>
                      </div>
                      <h3 className="text-lg font-semibold text-[#1A2B35] mb-1 group-hover:text-[#0A6070] transition-colors" style={{ fontFamily: 'Cormorant Garamond, serif' }}>{rel.title}</h3>
                      <p className="text-xs text-[#5A7280] line-clamp-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{rel.description}</p>
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
