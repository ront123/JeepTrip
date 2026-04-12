import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { I18nManager } from 'react-native';
import { Language, TranslationKey, translations } from '@/constants/i18n';

interface LanguageContextType {
  lang: Language;
  t: (key: TranslationKey) => string;
  toggleLang: () => void;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'he',
  t: (key) => translations.he[key],
  toggleLang: () => {},
  isRTL: false,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>('he');

  const toggleLang = useCallback(() => {
    setLang((prev) => {
      const next = prev === 'en' ? 'he' : 'en';
      // Update RN's global RTL flag (takes effect on next render cycle)
      I18nManager.forceRTL(next === 'he');
      return next;
    });
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => translations[lang][key],
    [lang]
  );

  return (
    <LanguageContext.Provider
      value={{ lang, t, toggleLang, isRTL: lang === 'he' }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
