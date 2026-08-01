import { useState } from 'react';
import { MapPin, Phone, Mail, Clock, MessageSquare, Heart, Building2, Users, Send } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useSiteSettings } from '../contexts/SiteSettingsContext';
import { supabase } from '../lib/supabase';

const contacts = [
  { icon: MessageSquare, titleKey: 'contact.c1.title', descKey: 'contact.c1.desc' as const },
  { icon: Heart, titleKey: 'contact.c2.title', descKey: 'contact.c2.desc' as const },
  { icon: Building2, titleKey: 'contact.c3.title', descKey: 'contact.c3.desc' as const },
  { icon: Users, titleKey: 'contact.c4.title', descKey: 'contact.c4.desc' as const },
];

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export default function Contact() {
  const { t } = useLanguage();
  const { settings } = useSiteSettings();
  const [form, setForm] = useState({ name: '', email: '', phone: '', type: '', message: '' });
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const { error: dbErr } = await supabase.from('contact_submissions').insert({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      subject: form.type,
      message: form.message.trim(),
    });

    if (dbErr) {
      setError(t('contact.error'));
      setSubmitting(false);
      return;
    }

    fetch(`${SUPABASE_URL}/functions/v1/send-contact-notification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON_KEY}` },
      body: JSON.stringify({ name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() || null, subject: form.type, message: form.message.trim() }),
    }).catch(() => {});

    setSubmitting(false);
    setSent(true);
  };

  return (
    <div className="page-enter">
      {/* Hero */}
      <section className="pt-36 pb-20 hero-gradient relative overflow-hidden">
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="section-label !text-[#F0A500] mb-4">{t('contact.label')}</p>
          <h1 className="text-5xl md:text-6xl font-light text-white mb-6" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            {t('contact.title')}
          </h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            {t('contact.sub')}
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none">
            <path d="M0 60L1440 60L1440 20C1200 60 960 0 720 20C480 40 240 60 0 20L0 60Z" fill="#FBF8F3" />
          </svg>
        </div>
      </section>

      {/* Contact types */}
      <section className="py-16 bg-[#FBF8F3]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {contacts.map((c, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-[#0A6070]/10 flex items-center justify-center mb-4">
                  <c.icon className="w-5 h-5 text-[#0A6070]" />
                </div>
                <h3 className="text-base font-semibold text-[#1A2B35] mb-1" style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.1rem' }}>
                  {t(c.titleKey as any)}
                </h3>
                <p className="text-xs text-[#5A7280] mb-3" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  {t(c.descKey as any)}
                </p>
                <a
                  href="mailto:voiceofpreemies@gmail.com"
                  className="text-xs font-medium text-[#E8644A] hover:underline"
                  style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                >
                  voiceofpreemies@gmail.com
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main content */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16">
            {/* Contact info */}
            <div>
              <p className="section-label mb-4">{t('contact.find')}</p>
              <h2 className="text-4xl font-light text-[#1A2B35] mb-8" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                {t('contact.office')}
              </h2>

              <div className="space-y-6 mb-10">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#E8644A]/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-[#E8644A]" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#1A2B35] text-sm mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{t('contact.address')}</p>
                    <p className="text-sm text-[#5A7280]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                      {settings.org_address}
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#E8644A]/10 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5 text-[#E8644A]" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#1A2B35] text-sm mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{t('contact.phone')}</p>
                    <a href={`tel:${settings.org_phone}`} className="text-sm text-[#5A7280] hover:text-[#0A6070] transition-colors" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                      {settings.org_phone}
                    </a>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#E8644A]/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-[#E8644A]" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#1A2B35] text-sm mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{t('contact.email')}</p>
                    <a href={`mailto:${settings.org_email}`} className="text-sm text-[#5A7280] hover:text-[#0A6070] transition-colors" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                      {settings.org_email}
                    </a>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#E8644A]/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-[#E8644A]" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#1A2B35] text-sm mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{t('contact.hours')}</p>
                    <p className="text-sm text-[#5A7280] whitespace-pre-line" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                      {t('contact.hours.text')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Map placeholder */}
              <div className="rounded-2xl overflow-hidden h-64 bg-[#EDF5F7] flex items-center justify-center border border-[#D8E4E8]">
                <div className="text-center">
                  <MapPin className="w-10 h-10 text-[#0A6070] mx-auto mb-2 opacity-50" />
                  <p className="text-sm text-[#5A7280]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    {settings.org_address}
                  </p>
                </div>
              </div>
            </div>

            {/* Form */}
            <div>
              <p className="section-label mb-4">{t('contact.write')}</p>
              <h2 className="text-4xl font-light text-[#1A2B35] mb-8" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                {t('contact.write')}
              </h2>

              {sent ? (
                <div className="bg-[#EFF8F4] border-2 border-[#2D8A5F] rounded-2xl p-10 text-center">
                  <Heart className="w-10 h-10 text-[#2D8A5F] mx-auto mb-4" />
                  <h3 className="text-2xl font-semibold text-[#1A2B35] mb-3" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                    {t('contact.received')}
                  </h3>
                  <p className="text-[#5A7280] text-sm" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    {t('contact.received.sub')}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#1A2B35] mb-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{t('contact.name')} *</label>
                      <input required type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                        className="w-full px-4 py-3 border border-[#D8E4E8] rounded-xl text-sm focus:outline-none focus:border-[#0A6070] transition-colors bg-[#FBF8F3]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} placeholder={t('contact.name.ph')} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#1A2B35] mb-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{t('contact.email')} *</label>
                      <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                        className="w-full px-4 py-3 border border-[#D8E4E8] rounded-xl text-sm focus:outline-none focus:border-[#0A6070] transition-colors bg-[#FBF8F3]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} placeholder={t('contact.email.ph')} />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#1A2B35] mb-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{t('contact.phone')}</label>
                      <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                        className="w-full px-4 py-3 border border-[#D8E4E8] rounded-xl text-sm focus:outline-none focus:border-[#0A6070] transition-colors bg-[#FBF8F3]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} placeholder={t('contact.phone.ph')} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#1A2B35] mb-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{t('contact.subject')} *</label>
                      <select required value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                        className="w-full px-4 py-3 border border-[#D8E4E8] rounded-xl text-sm bg-[#FBF8F3] focus:outline-none focus:border-[#0A6070] transition-colors" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                        <option value="">{t('contact.subject.select')}</option>
                        <option value="Support services">{t('contact.subject.support')}</option>
                        <option value="Partnership inquiry">{t('contact.subject.partnership')}</option>
                        <option value="Volunteer">{t('contact.subject.volunteer')}</option>
                        <option value="Donation">{t('contact.subject.donation')}</option>
                        <option value="Media inquiry">{t('contact.subject.media')}</option>
                        <option value="General question">{t('contact.subject.general')}</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#1A2B35] mb-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{t('contact.message')} *</label>
                    <textarea required rows={6} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
                      className="w-full px-4 py-3 border border-[#D8E4E8] rounded-xl text-sm resize-none focus:outline-none focus:border-[#0A6070] transition-colors bg-[#FBF8F3]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} placeholder={t('contact.message.ph')} />
                  </div>
                  {error && (
                    <p className="text-sm text-red-600" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{error}</p>
                  )}
                  <button type="submit" disabled={submitting} className="btn-primary w-full justify-center !py-3.5 disabled:opacity-60">
                    <Send className="w-4 h-4" />
                    {submitting ? t('contact.sending') : t('contact.send')}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
