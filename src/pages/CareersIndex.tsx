import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Briefcase, ArrowRight, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useSiteSettings } from '../contexts/SiteSettingsContext';

interface CareerSummary {
  id: string;
  slug: string;
  title: string;
  summary: string;
  deadline: string;
}

function daysLeft(deadline: string, today: string) {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((Date.parse(`${deadline}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / msPerDay);
}

export default function CareersIndex() {
  const navigate = useNavigate();
  const { settings, loading: settingsLoading } = useSiteSettings();
  const [jobs, setJobs] = useState<CareerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (settingsLoading) return;
    if (!settings.careers_page_enabled) {
      navigate('/', { replace: true });
      return;
    }
    window.scrollTo(0, 0);
    supabase
      .from('careers')
      .select('id, slug, title, summary, deadline')
      .gte('deadline', today)
      .order('deadline', { ascending: true })
      .then(({ data }) => {
        setJobs(data ?? []);
        setLoading(false);
      });
  }, [settingsLoading, settings.careers_page_enabled, navigate, today]);

  if (settingsLoading || !settings.careers_page_enabled) return null;

  return (
    <div className="page-enter">
      <section className="pt-28 pb-0 hero-gradient relative overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12">
          <p className="text-xs font-bold uppercase tracking-widest text-[#F0A500] mb-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Join Our Team</p>
          <h1 className="text-3xl md:text-4xl font-light text-white leading-tight" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Careers</h1>
          <p className="text-sm text-white/70 max-w-lg mt-3" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Help us build a stronger start for premature babies and their families in Rwanda.</p>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 40" fill="none">
            <path d="M0 40L1440 40L1440 10C1200 35 960 0 720 12C480 24 240 38 0 10L0 40Z" fill="#FBF8F3" />
          </svg>
        </div>
      </section>

      <div className="min-h-[50vh] bg-[#FBF8F3] py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-[#0A6070]/20 border-t-[#0A6070] rounded-full animate-spin" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <Briefcase className="w-12 h-12 text-[#D8E4E8] mx-auto mb-4" />
                <p className="text-[#5A7280] text-lg" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>There are no open positions right now. Please check back soon.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map(job => {
                const left = daysLeft(job.deadline, today);
                return (
                  <Link key={job.id} to={`/careers/${job.slug}`} className="block bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow p-6 group">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-bold text-[#1e293b] mb-1.5 group-hover:text-[#0A6070] transition-colors" style={{ fontFamily: 'Cormorant Garamond, serif' }}>{job.title}</h2>
                        {job.summary && <p className="text-[13px] text-[#64748B] leading-relaxed">{job.summary}</p>}
                      </div>
                      <span className="inline-flex items-center gap-1.5 text-[#0A6070] font-semibold text-sm flex-shrink-0 mt-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                        View & Apply <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                    <p className="flex items-center gap-1.5 text-[11px] text-[#94A3B8] mt-3" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                      <Clock className="w-3 h-3" /> {left <= 0 ? 'Closes today' : `${left} day${left === 1 ? '' : 's'} left to apply`}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
