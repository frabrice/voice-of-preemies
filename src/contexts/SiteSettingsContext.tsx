import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

export interface SiteSettings {
  id: string | null;
  org_name: string;
  org_email: string;
  org_phone: string;
  org_address: string;
  facebook_url: string;
  instagram_url: string;
  twitter_url: string;
  youtube_url: string;
  default_currency: string;
}

const DEFAULT_SETTINGS: SiteSettings = {
  id: null,
  org_name: 'Voice of Preemies Rwanda',
  org_email: 'voiceofpreemies@gmail.com',
  org_phone: '+250799534956',
  org_address: 'Kigali, Rwanda',
  facebook_url: '',
  instagram_url: '',
  twitter_url: '',
  youtube_url: '',
  default_currency: 'USD',
};

interface SiteSettingsContextType {
  settings: SiteSettings;
  loading: boolean;
  refresh: () => Promise<void>;
}

const SiteSettingsContext = createContext<SiteSettingsContextType>({
  settings: DEFAULT_SETTINGS,
  loading: true,
  refresh: async () => {},
});

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase.from('site_settings').select('*').limit(1).maybeSingle();
    if (data) setSettings(data as SiteSettings);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <SiteSettingsContext.Provider value={{ settings, loading, refresh: load }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}
