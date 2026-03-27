import { useEffect, useState } from 'react'
import { AuthButton } from './AuthButton'
import { APP_NAME, EXTENSION_URL, HUB_PATH } from '../lib/site'

interface LandingPageProps {
  user: any
  onAuthChange: (user: any) => void
}

const platforms = ['ChatGPT', 'Claude', 'Gemini', 'DeepSeek', 'Kimi', 'NotebookLM']
const HOME_LANG_KEY = 'promptark_home_lang'

const landingCopy = {
  en: {
    pageTitle: `${APP_NAME} — Prompt Management for Chrome, Edge, and the Web`,
    navHub: 'Open Hub',
    loginLabel: 'Sign In',
    logoutLabel: 'Logout',
    eyebrow: 'Official PromptArk Homepage',
    titlePrefix: 'Keep your best AI prompts inside',
    titleSuffix: '.',
    description: `${APP_NAME} is a prompt management product with a browser extension and a lightweight Hub. You can download the extension, sign in when needed, or open the Hub directly to browse prompts.`,
    primaryCta: 'Download Extension',
    secondaryCta: `Open ${APP_NAME} Hub`,
    note: 'No sign-in is required to open the Hub. Sign in on the homepage or inside the Hub when you need your account.',
    panelTitle: 'Simple first version for launch review',
    panelText: `This homepage keeps the message clear: ${APP_NAME} is the official site for the ${APP_NAME} extension and Hub.`,
    stats: [
      { label: 'Extension', text: 'Chrome / Edge prompt manager' },
      { label: 'Hub', text: 'Public prompt discovery and browsing' },
      { label: 'Brand', text: `Clear ${APP_NAME} naming for store review` },
      { label: 'Flow', text: 'Homepage first, Hub at a dedicated route' },
    ],
    features: [
      {
        title: 'Prompt manager for daily use',
        description: 'Save, organize, and reuse prompts for ChatGPT, Claude, Gemini, DeepSeek, Kimi, and more.',
      },
      {
        title: `Official ${APP_NAME} Hub`,
        description: 'Browse community prompts, open public collections, and jump into the Hub without signing in first.',
      },
      {
        title: 'Built for Chrome and Edge',
        description: `Use the ${APP_NAME} browser extension to insert prompts faster while keeping your library easy to manage.`,
      },
    ],
    platformsLabel: 'Supported AI platforms',
    footer: `${APP_NAME} homepage for the ${APP_NAME} extension and ${APP_NAME} Hub.`,
  },
  zh: {
    pageTitle: `${APP_NAME} — 面向 Chrome、Edge 与 Web 的提示词管理产品`,
    navHub: '进入 Hub',
    loginLabel: '登录',
    logoutLabel: '退出登录',
    eyebrow: `${APP_NAME} 官方首页`,
    titlePrefix: '把你最好用的 AI 提示词都放进',
    titleSuffix: '。',
    description: `${APP_NAME} 是一个包含浏览器扩展和轻量 Hub 的提示词管理产品。你可以先下载扩展，也可以直接进入 Hub 浏览提示词，需要时再登录。`,
    primaryCta: '下载扩展',
    secondaryCta: `进入 ${APP_NAME} Hub`,
    note: '进入 Hub 不需要登录。你可以在首页或 Hub 中登录账号。',
    panelTitle: '面向上架审核的简洁版本',
    panelText: `这个首页会清楚说明：${APP_NAME} 是 ${APP_NAME} 扩展和 ${APP_NAME} Hub 的官方站点。`,
    stats: [
      { label: '扩展', text: 'Chrome / Edge 提示词管理扩展' },
      { label: 'Hub', text: '公开提示词浏览与发现入口' },
      { label: '品牌', text: `突出 ${APP_NAME} 字样，便于商店审核` },
      { label: '路径', text: '首页独立，Hub 使用单独路由' },
    ],
    features: [
      {
        title: '面向日常使用的 Prompt 管理',
        description: '保存、整理、复用你在 ChatGPT、Claude、Gemini、DeepSeek、Kimi 等平台使用的提示词。',
      },
      {
        title: `${APP_NAME} 官方 Hub`,
        description: '先浏览社区提示词，再决定是否登录，减少首页的使用门槛。',
      },
      {
        title: '适配 Chrome 与 Edge',
        description: `通过 ${APP_NAME} 浏览器扩展，更快调用提示词，同时保持统一管理。`,
      },
    ],
    platformsLabel: '支持的 AI 平台',
    footer: `${APP_NAME} 首页，服务于 ${APP_NAME} 扩展和 ${APP_NAME} Hub。`,
  },
} as const

type LandingLanguage = keyof typeof landingCopy

export function LandingPage({ user, onAuthChange }: LandingPageProps) {
  const [language, setLanguage] = useState<LandingLanguage>(() => {
    const saved = localStorage.getItem(HOME_LANG_KEY)
    if (saved === 'en' || saved === 'zh') return saved
    return 'en'
  })

  const copy = landingCopy[language]

  useEffect(() => {
    localStorage.setItem(HOME_LANG_KEY, language)
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en'
    document.title = copy.pageTitle
  }, [copy.pageTitle, language])

  return (
    <div className="landing-shell">
      <header className="landing-header">
        <a href="/" className="landing-brand">
          <img src="/icon128.png" alt={APP_NAME} className="landing-brand-icon" />
          <span className="landing-brand-text">{APP_NAME}</span>
        </a>

        <div className="landing-header-actions">
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

      <main className="landing-main">
        <section className="landing-hero">
          <div className="landing-copy">
            <p className="landing-eyebrow">{copy.eyebrow}</p>
            <h1 className="landing-title">
              {copy.titlePrefix} <span>{APP_NAME}</span>{copy.titleSuffix}
            </h1>
            <p className="landing-description">
              {copy.description}
            </p>

            <div className="landing-actions">
              <a
                href={EXTENSION_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="landing-primary-btn"
              >
                {copy.primaryCta}
              </a>
              <a href={HUB_PATH} className="landing-secondary-btn">
                {copy.secondaryCta}
              </a>
            </div>

            <p className="landing-note">
              {copy.note}
            </p>
          </div>

          <div className="landing-panel">
            <div className="landing-panel-badge">PromptArk</div>
            <h2 className="landing-panel-title">{copy.panelTitle}</h2>
            <p className="landing-panel-text">
              {copy.panelText}
            </p>

            <div className="landing-stat-grid">
              {copy.stats.map((item) => (
                <div key={item.label} className="landing-stat-card">
                  <strong>{item.label}</strong>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-feature-grid">
          {copy.features.map((card) => (
            <article key={card.title} className="landing-feature-card">
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </article>
          ))}
        </section>

        <section className="landing-platform-strip">
          <span className="landing-platform-label">{copy.platformsLabel}</span>
          <div className="landing-platform-list">
            {platforms.map((platform) => (
              <span key={platform} className="landing-platform-chip">
                {platform}
              </span>
            ))}
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <p>{copy.footer}</p>
      </footer>
    </div>
  )
}
