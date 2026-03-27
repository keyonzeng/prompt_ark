import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type AppLanguage = 'en' | 'zh'

const LANGUAGE_STORAGE_KEY = 'promptark_home_lang'

interface I18nContextValue {
  language: AppLanguage
  setLanguage: (language: AppLanguage) => void
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<AppLanguage>(() => {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY)
    return saved === 'zh' || saved === 'en' ? saved : 'en'
  })

  useEffect(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en'
  }, [language])

  return (
    <I18nContext.Provider value={{ language, setLanguage }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)

  if (!context) {
    throw new Error('useI18n must be used inside I18nProvider')
  }

  return context
}
