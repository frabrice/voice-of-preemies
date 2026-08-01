import { useState, useEffect } from 'react';
import { Heart, Target, Eye, Star, Users, Loader2, Handshake } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import type { TranslationKey } from '../translations';

type ValueDef = { icon: typeof Heart; titleKey: TranslationKey; descKey: TranslationKey };
const valueDefs: ValueDef[] = [
  { icon: Heart, titleKey: 'about.values.compassion.title', descKey: 'about.values.compassion.desc' },
  { icon: Users, titleKey: 'about.values.community.title', descKey: 'about.values.community.desc' },
  { icon: Star, titleKey: 'about.values.excellence.title', descKey: 'about.values.excellence.desc' },
  { icon: Target, titleKey: 'about.values.impact.title', descKey: 'about.values.impact.desc' },
];

interface TeamMember { id: string; name: string; role: string; bio: string; image_url: string; email: string; sort_order: number; active: boolean; }

export default function About() {
  const { t } = useLanguage();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [loadingPartners, setLoadingPartners] = useState(true);

  useEffect(() => {
    supabase.from('team_members').select('*').eq('active', true).is('deleted_at', null).order('sort_order')
      .then(({ data }) => { setTeam(data ?? []); setLoadingTeam(false); });
    supabase.from('partners').select('*').eq('active', true).is('deleted_at', null).order('sort_order')
      .then(({ data }) => { setPartners(data ?? []); setLoadingPartners(false); });
  }, []);

  return (
    <div className="page-enter">
      {/* Page hero */}
      <section className="pt-36 pb-20 hero-gradient relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <img
            src="https://images.pexels.com/photos/34185199/pexels-photo-34185199.jpeg?auto=compress&cs=tinysrgb&w=1600"
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="section-label !text-[#F0A500] mb-4">{t('about.label')}</p>
          <h1 className="text-5xl md:text-6xl font-light text-white mb-6" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            {t('about.title')}
          </h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            {t('about.sub')}
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 60L1440 60L1440 20C1200 60 960 0 720 20C480 40 240 60 0 20L0 60Z" fill="#FBF8F3" />
          </svg>
        </div>
      </section>

      {/* Our Story */}
      <section id="story" className="py-20 bg-[#FBF8F3]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="section-label mb-4">{t('about.story.label')}</p>
              <h2 className="section-title mb-6">
                {t('about.story.title')}
              </h2>
              <div className="space-y-4 text-[#5A7280] leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                <p>{t('about.story.p1')}</p>
                <p>{t('about.story.p2')}</p>
                <p>{t('about.story.p3')}</p>
                <p>{t('about.story.p4')}</p>
              </div>
            </div>
            <div className="relative">
              <div className="rounded-3xl overflow-hidden shadow-xl h-[500px]">
                <img
                  src="https://res.cloudinary.com/dbhyrnypc/image/upload/v1780126643/Celebrating_NICU_staff_in_purple_attire_gotxcc.png"
                  alt="Voice of Preemies team celebrating at NICU"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -right-6 bg-[#E8644A] text-white rounded-2xl p-6 shadow-xl max-w-xs">
                <p className="text-4xl font-semibold mb-1" style={{ fontFamily: 'Cormorant Garamond, serif' }}>15%</p>
                <p className="text-sm opacity-90" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  {t('about.story.stat')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission, Vision, Values */}
      <section id="mission" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="section-label mb-3">{t('about.mission.label')}</p>
            <h2 className="section-title">{t('about.mission.title')}</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <div className="bg-[#0A6070] rounded-3xl p-10 text-white">
              <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center mb-6">
                <Target className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-sm uppercase tracking-widest font-semibold text-[#F0A500] mb-3" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{t('about.mission.section')}</h3>
              <p className="text-2xl font-light leading-relaxed" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                {t('about.mission.text')}
              </p>
            </div>
            <div className="bg-[#FBF8F3] rounded-3xl p-10">
              <div className="w-12 h-12 rounded-full bg-[#0A6070]/10 flex items-center justify-center mb-6">
                <Eye className="w-6 h-6 text-[#0A6070]" />
              </div>
              <h3 className="text-sm uppercase tracking-widest font-semibold text-[#E8644A] mb-3" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{t('about.vision.section')}</h3>
              <p className="text-2xl font-light leading-relaxed text-[#1A2B35]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                {t('about.vision.text')}
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {valueDefs.map((v, i) => (
              <div key={i} className="bg-[#FBF8F3] rounded-2xl p-7">
                <div className="w-11 h-11 rounded-xl bg-[#0A6070]/10 flex items-center justify-center mb-4">
                  <v.icon className="w-5 h-5 text-[#0A6070]" />
                </div>
                <h3 className="text-xl font-semibold text-[#1A2B35] mb-2" style={{ fontFamily: 'Cormorant Garamond, serif' }}>{t(v.titleKey)}</h3>
                <p className="text-sm text-[#5A7280] leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{t(v.descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section id="team" className="py-20 bg-[#FBF8F3]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="section-label mb-3">{t('about.team.label')}</p>
            <h2 className="section-title">{t('nav.about.team')}</h2>
          </div>
          {loadingTeam ? (
            <div className="flex justify-center py-10"><Loader2 className="w-7 h-7 text-[#0A6070] animate-spin" /></div>
          ) : team.length === 0 ? (
            <p className="text-center text-[#5A7280] py-10" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Team information coming soon.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {team.map((member, i) => {
                const colors = [
                  { bg: 'bg-[#0A6070]', text: 'text-white' },
                  { bg: 'bg-[#E8644A]', text: 'text-white' },
                  { bg: 'bg-[#1AADA0]', text: 'text-white' },
                  { bg: 'bg-[#1A2B35]', text: 'text-white' },
                ];
                const color = colors[i % colors.length];
                const isGroup = member.name.toLowerCase().includes('team');
                const initials = isGroup
                  ? ''
                  : member.name.split(' ').filter(w => !['dr', 'dr.'].includes(w.toLowerCase())).map(w => w[0]).slice(0, 2).join('');

                return (
                  <div key={member.id} className="bg-white rounded-2xl border border-[#D8E4E8] p-8 text-center hover:shadow-lg hover:border-[#0A6070]/30 transition-all duration-300">
                    <div className={`w-20 h-20 rounded-full ${color.bg} flex items-center justify-center mx-auto mb-5 shadow-md`}>
                      {isGroup ? (
                        <Users className={`w-9 h-9 ${color.text}`} />
                      ) : (
                        <span className={`text-2xl font-bold ${color.text}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                          {initials}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-[#1A2B35] mb-1" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                      {member.name}
                    </h3>
                    <p className="text-xs font-semibold text-[#E8644A] uppercase tracking-wider mb-4" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                      {member.role}
                    </p>
                    <p className="text-sm text-[#5A7280] leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                      {member.bio}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Partners */}
      <section id="partners" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="section-label mb-3">Our Partners</p>
            <h2 className="section-title">Organizations We Work With</h2>
          </div>
          {loadingPartners ? (
            <div className="flex justify-center py-10"><Loader2 className="w-7 h-7 text-[#0A6070] animate-spin" /></div>
          ) : partners.length === 0 ? (
            <p className="text-center text-[#5A7280] py-10" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Partner information coming soon.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {partners.map((p) => (
                <a key={p.id} href={p.website_url || '#'} target="_blank" rel="noopener noreferrer" className="bg-[#FBF8F3] rounded-2xl p-6 text-center hover:shadow-lg transition-all duration-300 group">
                  {p.logo_url ? (
                    <img src={p.logo_url} alt={p.name} className="w-16 h-16 object-contain mx-auto mb-3" />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-[#0A6070]/10 flex items-center justify-center mx-auto mb-3">
                      <Handshake className="w-7 h-7 text-[#0A6070]" />
                    </div>
                  )}
                  <h3 className="text-base font-semibold text-[#1A2B35] mb-1" style={{ fontFamily: 'Cormorant Garamond, serif' }}>{p.name}</h3>
                  {p.description && <p className="text-xs text-[#5A7280] leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{p.description}</p>}
                </a>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
