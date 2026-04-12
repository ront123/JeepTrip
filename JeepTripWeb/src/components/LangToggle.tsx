import { useLanguage } from '../context/LanguageContext';
import './LangToggle.css';

export function LangToggle() {
  const { language, setLanguage } = useLanguage();
  return (
    <button
      className="lang-toggle"
      onClick={() => setLanguage(language === 'en' ? 'he' : 'en')}
      title="Toggle language"
    >
      <span className={language === 'en' ? 'active' : ''}>EN</span>
      <span className="divider">|</span>
      <span className={language === 'he' ? 'active' : ''}>HE</span>
    </button>
  );
}
