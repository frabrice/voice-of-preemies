import { createContext, useContext, useState, ReactNode } from 'react';
import { Language, TranslationKey, translations } from '../translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key) => translations[key]?.en ?? key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: TranslationKey): string => {
    const entry = translations[key];
    if (!entry) return key;
    return entry[language] ?? entry.en ?? key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
