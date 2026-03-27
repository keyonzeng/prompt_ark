import { AuthButton } from './AuthButton'
import { APP_NAME, EXTENSION_URL, HUB_PATH } from '../lib/site'

interface LandingPageProps {
  user: any
  onAuthChange: (user: any) => void
}

const featureCards = [
  {
    title: 'Prompt manager for daily use',
    description: 'Save, organize, and reuse prompts for ChatGPT, Claude, Gemini, DeepSeek, Kimi, and more.',
  },
  {
    title: 'Official PromptArk Hub',
    description: 'Browse community prompts, open public collections, and jump into the Hub without signing in first.',
  },
  {
    title: 'Built for Chrome and Edge',
    description: 'Use the PromptArk browser extension to insert prompts faster while keeping your library easy to manage.',
  },
]

const platforms = ['ChatGPT', 'Claude', 'Gemini', 'DeepSeek', 'Kimi', 'NotebookLM']

export function LandingPage({ user, onAuthChange }: LandingPageProps) {
  return (
    <div className="landing-shell">
      <header className="landing-header">
        <a href="/" className="landing-brand">
          <img src="/icon128.png" alt={APP_NAME} className="landing-brand-icon" />
          <span className="landing-brand-text">{APP_NAME}</span>
        </a>

        <div className="landing-header-actions">
          <a href={HUB_PATH} className="landing-nav-link">
            Open Hub
          </a>
          <div className="landing-auth-slot">
            <AuthButton user={user} onAuthChange={onAuthChange} />
          </div>
        </div>
      </header>

      <main className="landing-main">
        <section className="landing-hero">
          <div className="landing-copy">
            <p className="landing-eyebrow">Official PromptArk Homepage</p>
            <h1 className="landing-title">
              Keep your best AI prompts inside <span>{APP_NAME}</span>.
            </h1>
            <p className="landing-description">
              {APP_NAME} is a prompt management product with a browser extension and a lightweight Hub.
              You can download the extension, sign in when needed, or open the Hub directly to browse prompts.
            </p>

            <div className="landing-actions">
              <a
                href={EXTENSION_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="landing-primary-btn"
              >
                Download Extension
              </a>
              <a href={HUB_PATH} className="landing-secondary-btn">
                Open PromptArk Hub
              </a>
            </div>

            <p className="landing-note">
              No sign-in is required to open the Hub. Sign in on the homepage or inside the Hub when you need your account.
            </p>
          </div>

          <div className="landing-panel">
            <div className="landing-panel-badge">PromptArk</div>
            <h2 className="landing-panel-title">Simple first version for launch review</h2>
            <p className="landing-panel-text">
              This homepage keeps the message clear: PromptArk is the official site for the PromptArk extension and Hub.
            </p>

            <div className="landing-stat-grid">
              <div className="landing-stat-card">
                <strong>Extension</strong>
                <span>Chrome / Edge prompt manager</span>
              </div>
              <div className="landing-stat-card">
                <strong>Hub</strong>
                <span>Public prompt discovery and browsing</span>
              </div>
              <div className="landing-stat-card">
                <strong>Brand</strong>
                <span>Clear PromptArk naming for store review</span>
              </div>
              <div className="landing-stat-card">
                <strong>Flow</strong>
                <span>Homepage first, Hub at a dedicated route</span>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-feature-grid">
          {featureCards.map((card) => (
            <article key={card.title} className="landing-feature-card">
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </article>
          ))}
        </section>

        <section className="landing-platform-strip">
          <span className="landing-platform-label">Supported AI platforms</span>
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
        <p>{APP_NAME} homepage for the PromptArk extension and PromptArk Hub.</p>
      </footer>
    </div>
  )
}
