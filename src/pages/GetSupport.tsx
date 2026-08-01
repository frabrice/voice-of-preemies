import { useState } from 'react';
import { Heart, Users, Baby, Coffee, HandHeart, PhoneCall, Send } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useSiteSettings } from '../contexts/SiteSettingsContext';
import { supabase } from '../lib/supabase';
import type { TranslationKey } from '../translations';

type CategoryDef = {
  id: string;
  icon: typeof Heart;
  titleKey: TranslationKey;
  descKey: TranslationKey;
  serviceKeys: TranslationKey[];
  color: string;
  iconColor: string;
};

const categoryDefs: CategoryDef[] = [
  {
    id: 'parents',
    icon: Heart,
    titleKey: 'support.cat.parents.title',
    descKey: 'support.cat.parents.desc',
    serviceKeys: [
      'support.cat.parents.s1', 'support.cat.parents.s2', 'support.cat.parents.s3',
      'support.cat.parents.s4', 'support.cat.parents.s5', 'support.cat.parents.s6',
    ],
    color: 'border-[#E8644A] bg-[#FFF0ED]',
    iconColor: 'text-[#E8644A]',
  },
  {
    id: 'fathers',
    icon: Users,
    titleKey: 'support.cat.fathers.title',
    descKey: 'support.cat.fathers.desc',
    serviceKeys: [
      'support.cat.fathers.s1', 'support.cat.fathers.s2', 'support.cat.fathers.s3',
      'support.cat.fathers.s4', 'support.cat.fathers.s5', 'support.cat.fathers.s6',
    ],
    color: 'border-[#0A6070] bg-[#EDF5F7]',
    iconColor: 'text-[#0A6070]',
  },
  {
    id: 'peer',
    icon: Coffee,
    titleKey: 'support.cat.peer.title',
    descKey: 'support.cat.peer.desc',
    serviceKeys: [
      'support.cat.peer.s1', 'support.cat.peer.s2', 'support.cat.peer.s3',
      'support.cat.peer.s4', 'support.cat.peer.s5', 'support.cat.peer.s6',
    ],
    color: 'border-[#E8A020] bg-[#FFF8EC]',
    iconColor: 'text-[#E8A020]',
  },
  {
    id: 'bereavement',
    icon: HandHeart,
    titleKey: 'support.cat.bereavement.title',
    descKey: 'support.cat.bereavement.desc',
    serviceKeys: [
      'support.cat.bereavement.s1', 'support.cat.bereavement.s2', 'support.cat.bereavement.s3',
      'support.cat.bereavement.s4', 'support.cat.bereavement.s5', 'support.cat.bereavement.s6',
    ],
    color: 'border-[#5A7280] bg-[#F5F8FA]',
    iconColor: 'text-[#5A7280]',
  },
];

const wholeFamilyItems: TranslationKey[] = [
  'support.wholefamily.i1', 'support.wholefamily.i2', 'support.wholefamily.i3', 'support.wholefamily.i4',
];

const supportTypeOptions: TranslationKey[] = [
  'support.form.type.o1', 'support.form.type.o2', 'support.form.type.o3',
  'support.form.type.o4', 'support.form.type.o5', 'support.form.type.o6', 'support.form.type.o7',
];

export default function GetSupport() {
  const { t } = useLanguage();
  const { settings } = useSiteSettings();
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', type: '', message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
  const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError('');

    const { error } = await supabase.from('support_requests').insert({
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim() || null,
      support_type: formData.type,
      note: formData.message.trim() || null,
    });

    if (error) {
      setSubmitError('Something went wrong. Please try again.');
      setSubmitting(false);
      return;
    }

    fetch(`${SUPABASE_URL}/functions/v1/send-support-notification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON_KEY}` },
      body: JSON.stringify({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || null,
        support_type: formData.type,
        note: formData.message.trim() || null,
      }),
    }).catch(() => {});

    setSubmitting(false);
    setSubmitted(true);
  };

  return (
    <div className="page-enter">
      {/* Hero */}
      <section className="pt-36 pb-20 hero-gradient relative overflow-hidden">
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="section-label !text-[#F0A500] mb-4">{t('support.label')}</p>
          <h1 className="text-5xl md:text-6xl font-light text-white mb-6" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            {t('support.title')}
          </h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            {t('support.sub')}
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none">
            <path d="M0 60L1440 60L1440 20C1200 60 960 0 720 20C480 40 240 60 0 20L0 60Z" fill="#FBF8F3" />
          </svg>
        </div>
      </section>

      {/* Emergency callout */}
      <section className="py-6 bg-[#E8644A]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-white">
            <div className="flex items-center gap-3">
              <PhoneCall className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                <strong>{t('support.emergency')}</strong> {settings.org_phone}
              </p>
            </div>
            <a
              href={`tel:${settings.org_phone}`}
              className="flex-shrink-0 px-5 py-2 bg-white text-[#E8644A] rounded-full text-sm font-semibold hover:bg-[#FBF8F3] transition-colors"
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            >
              {t('support.callNow')}
            </a>
          </div>
        </div>
      </section>

      {/* Support Categories */}
      <section className="py-20 bg-[#FBF8F3]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="section-label mb-3">{t('support.programs.label')}</p>
            <h2 className="section-title">{t('support.programs.title')}</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {categoryDefs.map((cat) => (
              <div key={cat.id} id={cat.id} className={`rounded-2xl border-2 ${cat.color} p-8 scroll-mt-32`}>
                <div className="flex items-start gap-5 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-white/80 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <cat.icon className={`w-6 h-6 ${cat.iconColor}`} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-[#1A2B35] mb-2" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                      {t(cat.titleKey)}
                    </h2>
                    <p className="text-sm text-[#5A7280]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                      {t(cat.descKey)}
                    </p>
                  </div>
                </div>
                <ul className="space-y-2">
                  {cat.serviceKeys.map((key, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-[#1A2B35]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cat.iconColor.replace('text-', 'bg-')}`} />
                      {t(key)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Family & Siblings */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <p className="section-label mb-3">{t('support.wholefamily.label')}</p>
              <h2 className="text-3xl font-light text-[#1A2B35] mb-4" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                {t('support.wholefamily.title')}
              </h2>
              <p className="text-[#5A7280] mb-6 leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                {t('support.wholefamily.desc')}
              </p>
              <ul className="space-y-3">
                {wholeFamilyItems.map((key, i) => (
                  <li key={i} className="flex gap-3 text-sm text-[#5A7280]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    <Baby className="w-4 h-4 text-[#0A6070] flex-shrink-0 mt-0.5" />
                    {t(key)}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl overflow-hidden h-80">
              <img
                src="https://images.pexels.com/photos/34180478/pexels-photo-34180478.jpeg?auto=compress&cs=tinysrgb&w=600"
                alt="African family with newborn baby"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Request Support Form */}
      <section id="request" className="py-20 bg-[#FBF8F3] scroll-mt-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="section-label mb-3">{t('support.form.label')}</p>
            <h2 className="section-title mb-4">{t('support.form.title')}</h2>
            <p className="text-[#5A7280]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              {t('support.form.desc')}
            </p>
          </div>

          {submitted ? (
            <div className="bg-[#EFF8F4] border-2 border-[#2D8A5F] rounded-2xl p-10 text-center">
              <div className="w-14 h-14 rounded-full bg-[#2D8A5F]/10 flex items-center justify-center mx-auto mb-4">
                <Heart className="w-7 h-7 text-[#2D8A5F]" />
              </div>
              <h3 className="text-2xl font-semibold text-[#1A2B35] mb-3" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                {t('support.received.title')}
              </h3>
              <p className="text-[#5A7280] text-sm" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                {t('support.received.sub')}
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="bg-white rounded-3xl shadow-sm p-8 space-y-5"
            >
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-[#1A2B35] uppercase tracking-wider mb-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    {t('support.form.name')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-[#D8E4E8] rounded-xl text-sm text-[#1A2B35] focus:outline-none focus:border-[#0A6070] transition-colors"
                    style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                    placeholder={t('support.form.name.ph')}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1A2B35] uppercase tracking-wider mb-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    {t('support.form.phone')} *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 border border-[#D8E4E8] rounded-xl text-sm text-[#1A2B35] focus:outline-none focus:border-[#0A6070] transition-colors"
                    style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                    placeholder={t('support.form.phone.ph')}
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-[#1A2B35] uppercase tracking-wider mb-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    {t('support.form.email')} <span className="text-[#5A7280] normal-case font-normal">(optional)</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 border border-[#D8E4E8] rounded-xl text-sm text-[#1A2B35] focus:outline-none focus:border-[#0A6070] transition-colors"
                    style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                    placeholder={t('support.form.email.ph')}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1A2B35] uppercase tracking-wider mb-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    {t('support.form.type')} *
                  </label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-3 border border-[#D8E4E8] rounded-xl text-sm text-[#1A2B35] focus:outline-none focus:border-[#0A6070] transition-colors bg-white"
                    style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                  >
                    <option value="">{t('support.form.type.ph')}</option>
                    {supportTypeOptions.map((key) => (
                      <option key={key} value={key}>{t(key)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1A2B35] uppercase tracking-wider mb-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  {t('support.form.message')} *
                </label>
                <textarea
                  required
                  rows={5}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-4 py-3 border border-[#D8E4E8] rounded-xl text-sm text-[#1A2B35] focus:outline-none focus:border-[#0A6070] transition-colors resize-none"
                  style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                  placeholder={t('support.form.message.ph')}
                />
              </div>
              {submitError && (
                <p className="text-sm text-red-600" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{submitError}</p>
              )}
              <button type="submit" disabled={submitting} className="btn-primary w-full justify-center !py-3.5 disabled:opacity-60">
                <Send className="w-4 h-4" />
                {submitting ? 'Sending…' : t('support.form.send')}
              </button>
              <p className="text-xs text-[#5A7280] text-center" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                {t('support.form.confidential')}
              </p>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
