import { Link } from 'react-router-dom';
import { Heart, Megaphone, Building2, HandHeart, ArrowRight, Send, Users, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import type { TranslationKey } from '../translations';
import { supabase } from '../lib/supabase';

type WayDef = {
  id: string;
  icon: typeof Heart;
  titleKey: TranslationKey;
  descKey: TranslationKey;
  roleKeys: TranslationKey[];
  color: string;
  iconBg: string;
  iconColor: string;
};

const wayDefs: WayDef[] = [
  {
    id: 'volunteer',
    icon: Heart,
    titleKey: 'involved.w1.title',
    descKey: 'involved.w1.desc',
    roleKeys: ['involved.w1.r1', 'involved.w1.r2', 'involved.w1.r3', 'involved.w1.r4', 'involved.w1.r5', 'involved.w1.r6'],
    color: 'bg-[#FFF0ED]',
    iconBg: 'bg-[#E8644A]/10',
    iconColor: 'text-[#E8644A]',
  },
  {
    id: 'fundraise',
    icon: Megaphone,
    titleKey: 'involved.w2.title',
    descKey: 'involved.w2.desc',
    roleKeys: ['involved.w2.r1', 'involved.w2.r2', 'involved.w2.r3', 'involved.w2.r4', 'involved.w2.r5', 'involved.w2.r6'],
    color: 'bg-[#EDF5F7]',
    iconBg: 'bg-[#0A6070]/10',
    iconColor: 'text-[#0A6070]',
  },
  {
    id: 'partner',
    icon: Building2,
    titleKey: 'involved.w3.title',
    descKey: 'involved.w3.desc',
    roleKeys: ['involved.w3.r1', 'involved.w3.r2', 'involved.w3.r3', 'involved.w3.r4', 'involved.w3.r5', 'involved.w3.r6'],
    color: 'bg-[#FFF8EC]',
    iconBg: 'bg-[#E8A020]/10',
    iconColor: 'text-[#E8A020]',
  },
  {
    id: 'corporate',
    icon: HandHeart,
    titleKey: 'involved.w4.title',
    descKey: 'involved.w4.desc',
    roleKeys: ['involved.w4.r1', 'involved.w4.r2', 'involved.w4.r3', 'involved.w4.r4', 'involved.w4.r5', 'involved.w4.r6'],
    color: 'bg-[#EFF8F4]',
    iconBg: 'bg-[#2D8A5F]/10',
    iconColor: 'text-[#2D8A5F]',
  },
];

const howOptions: TranslationKey[] = [
  'involved.form.how.o1', 'involved.form.how.o2', 'involved.form.how.o3',
  'involved.form.how.o4', 'involved.form.how.o5', 'involved.form.how.o6', 'involved.form.how.o7',
];

export default function GetInvolved() {
  const { t } = useLanguage();
  const [form, setForm] = useState({ name: '', email: '', phone: '', type: '', message: '' });
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="page-enter">
      {/* Hero */}
      <section className="pt-36 pb-20 hero-gradient relative overflow-hidden">
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="section-label !text-[#F0A500] mb-4">{t('involved.label')}</p>
          <h1 className="text-5xl md:text-6xl font-light text-white mb-6" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            {t('involved.title')}
          </h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto mb-10" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            {t('involved.sub')}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/donate" className="btn-white">
              <Heart className="w-4 h-4" />
              {t('nav.donate')}
            </Link>
            <a href="#involvement-form" className="btn-outline-white">
              {t('involved.cta.getintouch')} <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none">
            <path d="M0 60L1440 60L1440 20C1200 60 960 0 720 20C480 40 240 60 0 20L0 60Z" fill="#FBF8F3" />
          </svg>
        </div>
      </section>

      {/* Ways to get involved */}
      <section className="py-20 bg-[#FBF8F3]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="section-label mb-3">{t('involved.ways.label')}</p>
            <h2 className="section-title">{t('involved.ways.title')}</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {wayDefs.map((way) => (
              <div key={way.id} id={way.id} className={`rounded-2xl ${way.color} p-8 scroll-mt-32`}>
                <div className={`w-12 h-12 rounded-xl ${way.iconBg} flex items-center justify-center mb-5`}>
                  <way.icon className={`w-6 h-6 ${way.iconColor}`} />
                </div>
                <h2 className="text-2xl font-semibold text-[#1A2B35] mb-3" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                  {t(way.titleKey)}
                </h2>
                <p className="text-sm text-[#5A7280] mb-5 leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  {t(way.descKey)}
                </p>
                <ul className="space-y-2 mb-6">
                  {way.roleKeys.map((key, i) => (
                    <li key={i} className="flex gap-2 text-sm text-[#1A2B35]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2 ${way.iconColor.replace('text-', 'bg-')}`} />
                      {t(key)}
                    </li>
                  ))}
                </ul>
                <a href="#involvement-form" className="text-sm font-semibold text-[#E8644A] flex items-center gap-1 hover:gap-2 transition-all" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  {t('involved.express')} <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* World Prematurity Day */}
      <section className="py-16 bg-[#0A6070] relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <p className="text-xs uppercase tracking-widest text-[#F0A500] font-semibold mb-3" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            {t('involved.wpd.date')}
          </p>
          <h2 className="text-4xl font-light text-white mb-4" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            {t('involved.wpd.title')}
          </h2>
          <p className="text-white/70 mb-8 max-w-xl mx-auto" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            {t('involved.wpd.sub')}
          </p>
          <a href="#involvement-form" className="btn-white">
            {t('involved.wpd.cta')} <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      {/* Expression of interest form */}
      <section id="involvement-form" className="py-20 bg-[#FBF8F3] scroll-mt-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="section-label mb-3">{t('involved.form.label')}</p>
            <h2 className="section-title mb-4">{t('involved.form.title')}</h2>
            <p className="text-[#5A7280]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              {t('involved.form.desc')}
            </p>
          </div>

          {sent ? (
            <div className="bg-[#EFF8F4] border-2 border-[#2D8A5F] rounded-2xl p-10 text-center">
              <Users className="w-10 h-10 text-[#2D8A5F] mx-auto mb-4" />
              <h3 className="text-2xl font-semibold text-[#1A2B35] mb-3" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                {t('involved.form.success.title')}
              </h3>
              <p className="text-[#5A7280] text-sm" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                {t('involved.form.success.desc')}
              </p>
            </div>
          ) : (
            <form onSubmit={async (e) => {
              e.preventDefault();
              setSubmitting(true);
              setFormError('');

              const payload = {
                full_name: form.name.trim(),
                email: form.email.trim(),
                phone: form.phone.trim(),
                role: form.type,
                motivation: form.message.trim() || null,
                status: 'pending',
              };

              const { error: dbErr } = await supabase.from('join_requests').insert(payload);
              if (dbErr) {
                setFormError('Something went wrong. Please try again.');
                setSubmitting(false);
                return;
              }

              try {
                await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-join-notification`, {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(payload),
                });
              } catch { /* email is best-effort; don't block the user */ }

              setSubmitting(false);
              setSent(true);
            }} className="bg-white rounded-3xl shadow-sm p-8 space-y-5">
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#1A2B35] mb-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    {t('involved.form.name')} *
                  </label>
                  <input
                    required
                    type="text"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-3 border border-[#D8E4E8] rounded-xl text-sm focus:outline-none focus:border-[#0A6070] transition-colors"
                    style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                    placeholder={t('involved.form.name.ph')}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#1A2B35] mb-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    {t('involved.form.email')} *
                  </label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full px-4 py-3 border border-[#D8E4E8] rounded-xl text-sm focus:outline-none focus:border-[#0A6070] transition-colors"
                    style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                    placeholder={t('involved.form.email.ph')}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#1A2B35] mb-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  {t('involved.form.phone')} *
                </label>
                <input
                  required
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-4 py-3 border border-[#D8E4E8] rounded-xl text-sm focus:outline-none focus:border-[#0A6070] transition-colors"
                  style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                  placeholder={t('involved.form.phone.ph')}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#1A2B35] mb-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  {t('involved.form.type')} *
                </label>
                <select
                  required
                  value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value })}
                  className="w-full px-4 py-3 border border-[#D8E4E8] rounded-xl text-sm bg-white focus:outline-none focus:border-[#0A6070] transition-colors"
                  style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                >
                  <option value="">{t('involved.form.type.ph')}</option>
                  {howOptions.map((key) => (
                    <option key={key} value={key}>{t(key)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#1A2B35] mb-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  {t('involved.form.message')}
                </label>
                <textarea
                  rows={4}
                  value={form.message}
                  onChange={e => setForm({ ...form, message: e.target.value })}
                  className="w-full px-4 py-3 border border-[#D8E4E8] rounded-xl text-sm resize-none focus:outline-none focus:border-[#0A6070] transition-colors"
                  style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                  placeholder={t('involved.form.message.ph')}
                />
              </div>
              {formError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-100">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-600" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{formError}</p>
                </div>
              )}
              <button type="submit" disabled={submitting} className="btn-primary w-full justify-center !py-3.5 disabled:opacity-50">
                <Send className="w-4 h-4" />
                {submitting ? 'Sending...' : t('involved.form.submit')}
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
