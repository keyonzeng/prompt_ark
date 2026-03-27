import { useI18n } from '../lib/i18n'

export function LanguageToggle() {
  const { language, setLanguage } = useI18n()

  return (
    <div className="landing-lang-toggle" role="group" aria-label="Homepage language switcher">
      <button
        type="button"
        className={`landing-lang-btn ${language === 'en' ? 'active' : ''}`}
        onClick={() => setLanguage('en')}
      >
        EN
      </button>
      <button
        type="button"
        className={`landing-lang-btn ${language === 'zh' ? 'active' : ''}`}
        onClick={() => setLanguage('zh')}
      >
        中文
      </button>
    </div>
  )
}
