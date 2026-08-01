import { Link } from 'react-router-dom';
import { Stethoscope, Download, Users, BookOpen, Building2, ArrowRight, Mail } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import type { TranslationKey } from '../translations';

type ResourceDef = {
  titleKey: TranslationKey;
  typeKey: TranslationKey;
  size: string;
};

const resourceDefs: ResourceDef[] = [
  { titleKey: 'healthcare.r1.title', typeKey: 'healthcare.r1.type', size: '2.4 MB' },
  { titleKey: 'healthcare.r2.title', typeKey: 'healthcare.r2.type', size: '1.8 MB' },
  { titleKey: 'healthcare.r3.title', typeKey: 'healthcare.r3.type', size: '5.2 MB' },
  { titleKey: 'healthcare.r4.title', typeKey: 'healthcare.r4.type', size: '3.1 MB' },
  { titleKey: 'healthcare.r5.title', typeKey: 'healthcare.r5.type', size: '1.6 MB' },
  { titleKey: 'healthcare.r6.title', typeKey: 'healthcare.r6.type', size: '0.4 MB' },
];

type ServiceDef = {
  icon: typeof Stethoscope;
  titleKey: TranslationKey;
  descKey: TranslationKey;
};

const serviceDefs: ServiceDef[] = [
  { icon: Users, titleKey: 'healthcare.s1.title', descKey: 'healthcare.s1.desc' },
  { icon: BookOpen, titleKey: 'healthcare.s2.title', descKey: 'healthcare.s2.desc' },
  { icon: Building2, titleKey: 'healthcare.s3.title', descKey: 'healthcare.s3.desc' },
  { icon: Stethoscope, titleKey: 'healthcare.s4.title', descKey: 'healthcare.s4.desc' },
];

type StatDef = {
  stat: string;
  labelKey: TranslationKey;
};

const statDefs: StatDef[] = [
  { stat: '40%', labelKey: 'healthcare.stat1' },
  { stat: '60%', labelKey: 'healthcare.stat2' },
  { stat: '35%', labelKey: 'healthcare.stat3' },
  { stat: '50%', labelKey: 'healthcare.stat4' },
];

export default function Healthcare() {
  const { t } = useLanguage();

  return (
    <div className="page-enter">
      {/* Hero */}
      <section className="pt-36 pb-20 hero-gradient relative overflow-hidden">
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="section-label !text-[#F0A500] mb-4">{t('healthcare.label')}</p>
          <h1 className="text-5xl md:text-6xl font-light text-white mb-6" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            {t('healthcare.title')}
          </h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto mb-8" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            {t('healthcare.sub')}
          </p>
          <a href="mailto:partnerships@voiceofpreemies.org" className="btn-white">
            <Mail className="w-4 h-4" />
            {t('healthcare.contact.partnerships')}
          </a>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none">
            <path d="M0 60L1440 60L1440 20C1200 60 960 0 720 20C480 40 240 60 0 20L0 60Z" fill="#FBF8F3" />
          </svg>
        </div>
      </section>

      {/* Why partner */}
      <section className="py-20 bg-[#FBF8F3]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="section-label mb-4">{t('healthcare.evidence.label')}</p>
              <h2 className="section-title mb-6">
                {t('healthcare.evidence.title')}
              </h2>
              <div className="space-y-4 text-[#5A7280] text-sm leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                <p>{t('healthcare.evidence.p1')}</p>
                <p>{t('healthcare.evidence.p2')}</p>
                <p>{t('healthcare.evidence.p3')}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {statDefs.map((item, i) => (
                <div key={i} className="bg-white rounded-2xl p-6 shadow-sm text-center">
                  <p className="text-4xl font-semibold text-[#0A6070] mb-2" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                    {item.stat}
                  </p>
                  <p className="text-xs text-[#5A7280] leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    {t(item.labelKey)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="section-label mb-3">{t('healthcare.services.label')}</p>
            <h2 className="section-title">{t('healthcare.services.title')}</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {serviceDefs.map((s, i) => (
              <div key={i} className="bg-[#FBF8F3] rounded-2xl p-8 flex gap-5">
                <div className="w-12 h-12 rounded-xl bg-[#0A6070]/10 flex items-center justify-center flex-shrink-0">
                  <s.icon className="w-6 h-6 text-[#0A6070]" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-[#1A2B35] mb-3" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                    {t(s.titleKey)}
                  </h3>
                  <p className="text-sm text-[#5A7280] leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    {t(s.descKey)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Resources for professionals */}
      <section className="py-20 bg-[#FBF8F3]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="section-label mb-3">{t('healthcare.resources.label')}</p>
              <h2 className="section-title">{t('healthcare.resources.title')}</h2>
            </div>
          </div>
          <div className="space-y-4">
            {resourceDefs.map((resource, i) => (
              <div key={i} className="bg-white rounded-xl p-5 flex items-center gap-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-lg bg-[#0A6070]/10 flex items-center justify-center flex-shrink-0">
                  <Download className="w-5 h-5 text-[#0A6070]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-[#1A2B35]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    {t(resource.titleKey)}
                  </h3>
                  <p className="text-xs text-[#5A7280]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    {t(resource.typeKey)} · {resource.size}
                  </p>
                </div>
                <button className="flex-shrink-0 btn-secondary !text-xs !py-2 !px-4">
                  {t('btn.download')}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partnership CTA */}
      <section className="py-16 bg-[#0A6070]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-light text-white mb-5" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            {t('healthcare.cta.title')}
          </h2>
          <p className="text-white/70 mb-8" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            {t('healthcare.cta.desc')}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a href="mailto:partnerships@voiceofpreemies.org" className="btn-white">
              <Mail className="w-4 h-4" />
              {t('healthcare.cta.email')}
            </a>
            <Link to="/contact" className="btn-outline-white">
              {t('healthcare.cta.contact')} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
