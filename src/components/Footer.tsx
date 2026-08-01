import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Facebook, Twitter, Instagram, Youtube } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useSiteSettings } from '../contexts/SiteSettingsContext';

export default function Footer() {
  const { t } = useLanguage();
  const { settings } = useSiteSettings();
  const socialLinks = [
    { Icon: Facebook, url: settings.facebook_url, label: 'Facebook' },
    { Icon: Twitter, url: settings.twitter_url, label: 'Twitter' },
    { Icon: Instagram, url: settings.instagram_url, label: 'Instagram' },
    { Icon: Youtube, url: settings.youtube_url, label: 'Youtube' },
  ].filter(s => s.url);

  return (
    <footer style={{ background: 'linear-gradient(180deg, #1A0838 0%, #0D0420 100%)' }}>
      {/* Newsletter bar */}
      <div className="border-b border-white/8" style={{ background: 'rgba(123,63,174,0.25)' }}>
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-widest font-bold mb-1" style={{ color: '#E8A020', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                {t('footer.stayConnected')}
              </p>
              <h3 className="text-2xl font-light text-white" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                {t('footer.newsletter')}
              </h3>
            </div>
            <form className="flex gap-3 w-full md:w-auto" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder={t('footer.email')}
                className="flex-1 md:w-72 px-4 py-3 rounded-full bg-white/8 border border-white/15 text-white placeholder-white/40 text-sm focus:outline-none focus:border-[#1AADA0]/60 transition-colors"
                style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
              />
              <button
                type="submit"
                className="px-6 py-3 rounded-full text-sm font-bold flex-shrink-0 transition-colors"
                style={{ background: '#1AADA0', color: 'white', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
              >
                {t('btn.subscribe')}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Main footer */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="mb-5">
              <img
                src="/Voice_Of_Preemies_Logo.png"
                alt="Voice of Preemies Rwanda"
                className="h-14 w-auto brightness-0 invert"
              />
            </div>
            <p className="text-sm text-white/60 leading-relaxed mb-6 max-w-xs" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              {t('footer.tagline')}
            </p>
            {socialLinks.length > 0 && (
              <div className="flex gap-3">
                {socialLinks.map(({ Icon, url, label }) => (
                  <a
                    key={label}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full border border-white/15 flex items-center justify-center text-white/50 hover:text-white hover:border-[#1AADA0] transition-all"
                    aria-label={label}
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Organization links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest mb-5" style={{ color: '#E8A020', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              {t('footer.organization')}
            </h4>
            <ul className="space-y-3">
              {[
                [t('footer.about'), '/about'],
                [t('footer.team'), '/about'],
                [t('nav.programs'), '/programs'],
              ].map(([label, path]) => (
                <li key={label}>
                  <Link
                    to={path}
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="text-sm text-white/55 hover:text-white transition-colors"
                    style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest mb-5" style={{ color: '#E8A020', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              {t('footer.support')}
            </h4>
            <ul className="space-y-3">
              {[
                [t('nav.support'), '/support'],
                [t('footer.info'), '/prematurity'],
                [t('footer.forParents'), '/support'],
                [t('footer.forPros'), '/healthcare'],
                [t('footer.resources'), '/resources'],
                [t('footer.bereavement'), '/support'],
              ].map(([label, path]) => (
                <li key={label}>
                  <Link
                    to={path}
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="text-sm text-white/55 hover:text-white transition-colors"
                    style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest mb-5" style={{ color: '#E8A020', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              {t('footer.contactUs')}
            </h4>
            <ul className="space-y-4">
              <li className="flex gap-3">
                <MapPin className="w-4 h-4 text-[#1AADA0] flex-shrink-0 mt-0.5" />
                <span className="text-sm text-white/55" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  {settings.org_address}
                </span>
              </li>
              <li className="flex gap-3">
                <Phone className="w-4 h-4 text-[#1AADA0] flex-shrink-0 mt-0.5" />
                <a href={`tel:${settings.org_phone}`} className="text-sm text-white/55 hover:text-white transition-colors" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  {settings.org_phone}
                </a>
              </li>
              <li className="flex gap-3">
                <Mail className="w-4 h-4 text-[#1AADA0] flex-shrink-0 mt-0.5" />
                <a href={`mailto:${settings.org_email}`} className="text-sm text-white/55 hover:text-white transition-colors" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  {settings.org_email}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/8 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/35" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            {t('footer.copyright')}
          </p>
          <div className="flex gap-6">
            {[t('footer.privacy'), t('footer.terms'), t('footer.transparency')].map((item) => (
              <a key={item} href="#" className="text-xs text-white/35 hover:text-white/70 transition-colors" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                {item}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
