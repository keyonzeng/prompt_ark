import { AuthButton } from './AuthButton'
import { LanguageToggle } from './LanguageToggle'
import { APP_NAME, EXTENSION_URL, HUB_PATH } from '../lib/site'
import { useI18n } from '../lib/i18n'

interface SiteHeaderProps {
  user: any
  onAuthChange: (user: any) => void
}

function GitHubMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="landing-github-icon">
      <path
        fill="currentColor"
        d="M12 2C6.48 2 2 6.58 2 12.23c0 4.52 2.87 8.35 6.84 9.71.5.09.66-.22.66-.49 0-.24-.01-1.03-.01-1.87-2.78.62-3.37-1.22-3.37-1.22-.46-1.19-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .08 1.53 1.06 1.53 1.06.9 1.57 2.36 1.12 2.94.86.09-.67.35-1.12.63-1.38-2.22-.26-4.55-1.14-4.55-5.08 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.74 0 0 .84-.28 2.75 1.05A9.35 9.35 0 0 1 12 6.84c.85 0 1.71.12 2.5.36 1.91-1.33 2.75-1.05 2.75-1.05.55 1.43.2 2.48.1 2.74.64.72 1.03 1.63 1.03 2.75 0 3.95-2.33 4.81-4.56 5.07.36.32.68.96.68 1.95 0 1.41-.01 2.55-.01 2.89 0 .27.17.59.67.49A10.25 10.25 0 0 0 22 12.23C22 6.58 17.52 2 12 2Z"
      />
    </svg>
  )
}

const headerCopy = {
  en: {
    githubLabel: 'GitHub',
    navHub: 'Open Hub',
    loginLabel: 'Sign In',
    logoutLabel: 'Logout',
  },
  zh: {
    githubLabel: 'GitHub',
    navHub: '进入 Hub',
    loginLabel: '登录',
    logoutLabel: '退出登录',
  },
} as const

export function SiteHeader({ user, onAuthChange }: SiteHeaderProps) {
  const { language } = useI18n()
  const copy = headerCopy[language]

  return (
    <header className="landing-header">
      <a href="/" className="landing-brand">
        <img src="/icon128.png" alt={APP_NAME} className="landing-brand-icon" />
        <span className="landing-brand-text">{APP_NAME}</span>
      </a>

      <div className="landing-header-actions">
        <a
          href={EXTENSION_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="landing-github-link"
          aria-label={copy.githubLabel}
          title={copy.githubLabel}
        >
          <GitHubMark />
          <span>{copy.githubLabel}</span>
        </a>
        <LanguageToggle />
        <a href={HUB_PATH} className="landing-nav-link">
          {copy.navHub}
        </a>
        <div className="landing-auth-slot">
          <AuthButton
            user={user}
            onAuthChange={onAuthChange}
            loginLabel={copy.loginLabel}
            logoutLabel={copy.logoutLabel}
          />
        </div>
      </div>
    </header>
  )
}
