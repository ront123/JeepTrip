import * as React from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../constants/i18n';
import type { Language, TranslationKey } from '../constants/i18n';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const stored = localStorage.getItem('jeeptrip_lang') as Language | null;
  const [language, setLang] = useState<Language>(stored || 'he');

  const setLanguage = (lang: Language) => {
    localStorage.setItem('jeeptrip_lang', lang);
    setLang(lang);
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
  };

  const t = (key: TranslationKey): string => translations[language][key] as string;
  const isRTL = language === 'he';

  // Set initial dir
  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  }, [isRTL]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
