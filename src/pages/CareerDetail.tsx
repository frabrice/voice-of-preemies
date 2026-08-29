import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Calendar, Clock, Briefcase, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useSiteSettings } from '../contexts/SiteSettingsContext';

interface Career {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  apply_email: string;
  posted_date: string;
  deadline: string;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

const todayISO = () => new Date().toISOString().split('T')[0];

/** Timezone-safe day count: parses both sides as UTC midnight so it can't be
 *  thrown off by the viewer's local timezone (a local-time diff caused expired
 *  postings to briefly still read as "0 days left" instead of closed). */
function daysLeft(deadline: string) {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((Date.parse(`${deadline}T00:00:00Z`) - Date.parse(`${todayISO()}T00:00:00Z`)) / msPerDay);
}

export default function CareerDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { settings, loading: settingsLoading } = useSiteSettings();
  const [job, setJob] = useState<Career | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (settingsLoading) return;
    if (!settings.careers_page_enabled) {
      navigate('/', { replace: true });
      return;
    }
    if (!slug) return;
    window.scrollTo(0, 0);

    supabase
      .from('careers')
      .select('id, slug, title, summary, description, apply_email, posted_date, deadline')
      .eq('slug', slug)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) {
          navigate('/careers', { replace: true });
          return;
        }
        setJob(data);
        setLoading(false);
      });
  }, [slug, navigate, settingsLoading, settings.careers_page_enabled]);

  if (settingsLoading || !settings.careers_page_enabled || loading) {
    return (
      <div className="page-enter min-h-screen flex items-center justify-center bg-[#FBF8F3]">
        {!settingsLoading && !settings.careers_page_enabled ? null : (
          <div className="w-8 h-8 border-2 border-[#0A6070]/20 border-t-[#0A6070] rounded-full animate-spin" />
        )}
      </div>
    );
  }

  if (!job) return null;

  const left = daysLeft(job.deadline);
  const isClosed = job.deadline < todayISO();

  return (
    <div className="page-enter">
      <section className="relative py-20 hero-gradient overflow-hidden">
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            to="/careers"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/15 backdrop-blur-md text-white text-xs font-semibold rounded-lg hover:bg-white/25 transition-colors mb-6"
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          >
            <ArrowLeft className="w-3.5 h-3.5" /> All Positions
          </Link>
          <p className="text-xs font-bold uppercase tracking-widest text-[#F0A500] mb-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Join Our Team</p>
          <h1 className="text-3xl md:text-5xl font-light text-white leading-tight" style={{ fontFamily: 'Cormorant Garamond, serif' }}>{job.title}</h1>
        </div>
      </section>

      <section className="bg-[#FBF8F3] py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2">
              {isClosed ? (
                <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
                  <Lock className="w-10 h-10 text-[#D8E4E8] mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-[#1A2B35] mb-2" style={{ fontFamily: 'Cormorant Garamond, serif' }}>This position is no longer accepting applications</h2>
                  <p className="text-[#5A7280] text-sm leading-relaxed">Thank you for your interest. Please check our <Link to="/careers" className="text-[#0A6070] font-semibold hover:underline">Careers page</Link> for current openings.</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-8 shadow-sm">
                  {job.summary && <p className="text-lg text-[#1A2B35] leading-relaxed mb-6 italic" style={{ fontFamily: 'Cormorant Garamond, serif' }}>{job.summary}</p>}
                  <p className="text-[#1A2B35] text-base leading-[1.8] whitespace-pre-line" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{job.description}</p>
                </div>
              )}
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-28 space-y-6">
                <div className="bg-white rounded-2xl border border-[#E8F0F2] shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-[#E8F0F2] bg-[#0A6070]/8">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-[#0A6070]" />
                      <h3 className="text-sm font-bold text-[#0A6070]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Position Details</h3>
                    </div>
                  </div>
                  <div className="p-6 space-y-5">
                    <div className="flex items-start gap-3">
                      <Calendar className="w-4 h-4 text-[#94A3B8] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Posted</p>
                        <p className="text-xs text-[#1A2B35]">{fmtDate(job.posted_date)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Clock className="w-4 h-4 text-[#94A3B8] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Application Deadline</p>
                        <p className="text-xs text-[#1A2B35]">{fmtDate(job.deadline)}{!isClosed && ` (${left} day${left === 1 ? '' : 's'} left)`}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {!isClosed && (
                  <div className="bg-white rounded-2xl border border-[#E8F0F2] p-6 text-center">
                    <Mail className="w-8 h-8 text-[#0A6070] mx-auto mb-3" />
                    <p className="text-xs text-[#5A7280] mb-4" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Send your CV to apply</p>
                    <a
                      href={`mailto:${job.apply_email}?subject=${encodeURIComponent(`Application: ${job.title}`)}`}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0A6070] text-white text-xs font-bold rounded-xl hover:bg-[#084F5C] transition-colors w-full justify-center"
                      style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                    >
                      Apply via {job.apply_email}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
