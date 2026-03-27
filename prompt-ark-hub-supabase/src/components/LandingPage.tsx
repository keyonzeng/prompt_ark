import { useEffect } from 'react'
import { SiteHeader } from './SiteHeader'
import { SiteFooter } from './SiteFooter'
import { APP_NAME, EXTENSION_URL, HUB_PATH } from '../lib/site'
import { useI18n } from '../lib/i18n'

interface LandingPageProps {
  user: any
  onAuthChange: (user: any) => void
}

const platforms = ['ChatGPT', 'Claude', 'Gemini', 'DeepSeek', 'Kimi', 'NotebookLM']

const landingCopy = {
  en: {
    pageTitle: `${APP_NAME} — Prompt Management for Chrome, Edge, and the Web`,
    eyebrow: 'Official PromptArk Site',
    title: 'Stop losing your best AI prompts.',
    description: `Save, organize, and launch prompts in one click inside ChatGPT, Claude, Gemini, and 20+ other AI platforms. ${APP_NAME} combines a browser extension with an official Hub so prompt reuse, injection, sharing, and sync feel like one product.`,
    primaryCta: 'Download Extension',
    secondaryCta: `Open ${APP_NAME} Hub`,
    note: 'Chrome and Edge supported. Open the Hub without signing in, or log in here when you need account and sync features.',
    proofs: ['20+ AI platforms', '100 built-in prompts', 'Zero-config AI', 'Open source'],
    panelTitle: 'A real prompt workflow, not just a prompt list',
    panelText: `Use Prompt Picker, slash commands, quick actions, live variables, and page context to turn saved prompts into a fast daily workflow.`,
    stats: [
      { label: '20+ Platforms', text: 'Custom injection for major AI chat products' },
      { label: '100 Prompts', text: 'Built-in English and Chinese starter library' },
      { label: 'Zero-Config AI', text: 'Gemini Web works by default for core AI features' },
      { label: 'Sync Your Way', text: 'Chrome Sync, GitHub Gist, or WebDAV' },
    ],
    sectionKicker: 'Core Capabilities',
    sectionTitle: `${APP_NAME} covers the full prompt lifecycle`,
    sectionText: 'The homepage now reflects what the product already does well: capture, organize, launch, optimize, and share prompts across real AI surfaces.',
    features: [
      {
        title: 'Prompt Picker',
        description: 'Open your private prompt library from supported AI websites and inject prompts directly into the chat box.',
      },
      {
        title: 'Dynamic Variables',
        description: 'Use variables like {{topic}}, enums like {{lang:EN|ZH|JP}}, and defaults like {{style:formal}} for reusable prompts.',
      },
      {
        title: 'Quick Actions',
        description: 'Rewrite, summarize, translate, expand, or explain selected text with one click right beside the AI input box.',
      },
      {
        title: 'Smart Convert',
        description: 'Select any text on a page and turn it into a reusable structured prompt with AI-assisted conversion.',
      },
      {
        title: 'Context Grabber',
        description: 'Capture page title, URL, and current selection with Ctrl+Shift+G for page-aware prompts and workflows.',
      },
      {
        title: 'Prompt Packs and Sharing',
        description: 'Group prompts into packs, share them, and reuse them across devices or with your team.',
      },
    ],
    workflowKicker: 'How It Works',
    workflowTitle: 'From saved prompt to live AI output in seconds',
    workflowSteps: [
      {
        title: 'Save',
        text: 'Create prompts once, organize them by category, tags, favorites, and built-in metadata.',
      },
      {
        title: 'Trigger',
        text: 'Open Prompt Picker, use slash expansion, or fire quick actions directly from the supported AI page.',
      },
      {
        title: 'Customize',
        text: 'Fill variables, inject live page context, or translate and optimize prompts before use.',
      },
      {
        title: 'Sync and Share',
        text: 'Keep your library portable with Chrome Sync, GitHub Gist, WebDAV, or community sharing through the Hub.',
      },
    ],
    platformsLabel: 'Supported AI platforms',
  },
  zh: {
    pageTitle: `${APP_NAME} — 面向 Chrome、Edge 与 Web 的提示词管理产品`,
    eyebrow: `${APP_NAME} 官方站点`,
    title: '别再丢失你最好的 AI 提示词。',
    description: `把提示词保存、整理，并一键调用到 ChatGPT、Claude、Gemini 等 20+ AI 平台。${APP_NAME} 将浏览器扩展与官方 Hub 结合起来，让提示词的复用、注入、分享和同步形成完整产品体验。`,
    primaryCta: '下载扩展',
    secondaryCta: `进入 ${APP_NAME} Hub`,
    note: '支持 Chrome 与 Edge。Hub 可直接打开，无需先登录；需要账号和同步能力时再登录即可。',
    proofs: ['支持 20+ AI 平台', '100 个内置提示词', '零配置 AI', '开源项目'],
    panelTitle: '不只是提示词列表，而是一套完整工作流',
    panelText: `通过 Prompt Picker、Slash Commands、Quick Actions、动态变量和页面上下文，让提示词真正变成高频生产力工具。`,
    stats: [
      { label: '20+ 平台', text: '覆盖主流 AI 对话产品并支持定制注入' },
      { label: '100 个提示词', text: '内置中英双语启动模板库' },
      { label: '零配置 AI', text: 'Gemini Web 默认可用，核心 AI 功能开箱即用' },
      { label: '同步方式', text: '支持 Chrome Sync、GitHub Gist 与 WebDAV' },
    ],
    sectionKicker: '核心能力',
    sectionTitle: `${APP_NAME} 覆盖 Prompt 的完整生命周期`,
    sectionText: '首页内容现在更贴近产品真实能力：从捕获、整理，到调用、优化、分享，都不是单点功能，而是完整链路。',
    features: [
      {
        title: 'Prompt Picker',
        description: '在支持的平台上直接打开你的私有提示词库，并一键注入到当前 AI 输入框中。',
      },
      {
        title: '动态变量',
        description: '支持 {{topic}} 变量、{{lang:EN|ZH|JP}} 枚举，以及 {{style:formal}} 这类默认值写法。',
      },
      {
        title: 'Quick Actions',
        description: '在 AI 输入框旁一键执行改写、总结、翻译、扩写、解释等高频操作。',
      },
      {
        title: 'Smart Convert',
        description: '选中网页文本后可直接智能转换为结构化、可复用的 Prompt，无需手工重写。',
      },
      {
        title: 'Context Grabber',
        description: '通过 Ctrl+Shift+G 抓取页面标题、URL 与选中文本，让提示词具备页面上下文。',
      },
      {
        title: 'Prompt 包与分享',
        description: '支持提示词打包、分享、跨设备复用，也能通过 Hub 做社区分发。',
      },
    ],
    workflowKicker: '使用方式',
    workflowTitle: '从保存到调用，只需要几秒',
    workflowSteps: [
      {
        title: '保存',
        text: '先把常用提示词沉淀下来，用分类、标签、收藏和元数据统一管理。',
      },
      {
        title: '触发',
        text: '在目标 AI 页面上通过 Prompt Picker、Slash 展开或 Quick Actions 快速调用。',
      },
      {
        title: '定制',
        text: '填写变量、注入页面上下文，或在发送前完成翻译与优化。',
      },
      {
        title: '同步与分享',
        text: '通过 Chrome Sync、GitHub Gist、WebDAV 或 Hub 社区，让提示词在不同场景中持续复用。',
      },
    ],
    platformsLabel: '支持的 AI 平台',
  },
} as const

export function LandingPage({ user, onAuthChange }: LandingPageProps) {
  const { language } = useI18n()
  const copy = landingCopy[language]

  useEffect(() => {
    document.title = copy.pageTitle
  }, [copy.pageTitle, language])

  return (
    <div className="landing-shell">
      <SiteHeader user={user} onAuthChange={onAuthChange} />

      <main className="landing-main">
        <section className="landing-hero">
          <div className="landing-copy">
            <p className="landing-eyebrow">{copy.eyebrow}</p>
            <h1 className="landing-title">{copy.title}</h1>
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

            <div className="landing-proof-list">
              {copy.proofs.map((proof) => (
                <span key={proof} className="landing-proof-chip">
                  {proof}
                </span>
              ))}
            </div>
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

        <section className="landing-section-head">
          <p className="landing-section-kicker">{copy.sectionKicker}</p>
          <h2 className="landing-section-title">{copy.sectionTitle}</h2>
          <p className="landing-section-text">{copy.sectionText}</p>
        </section>

        <section className="landing-feature-grid">
          {copy.features.map((card) => (
            <article key={card.title} className="landing-feature-card">
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </article>
          ))}
        </section>

        <section className="landing-workflow-section">
          <div className="landing-section-head landing-section-head--compact">
            <p className="landing-section-kicker">{copy.workflowKicker}</p>
            <h2 className="landing-section-title">{copy.workflowTitle}</h2>
          </div>

          <div className="landing-workflow-grid">
            {copy.workflowSteps.map((step, index) => (
              <article key={step.title} className="landing-workflow-card">
                <span className="landing-workflow-index">{String(index + 1).padStart(2, '0')}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
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

      <SiteFooter />
    </div>
  )
}
