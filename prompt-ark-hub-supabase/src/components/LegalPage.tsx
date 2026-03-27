import { useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { SiteHeader } from './SiteHeader'
import { SiteFooter } from './SiteFooter'
import { getLegalMarkdown, type LegalSection } from '../lib/legal'
import { useI18n } from '../lib/i18n'

interface LegalPageProps {
  section: LegalSection
  user: any
  onAuthChange: (user: any) => void
}

const legalPageCopy = {
  en: {
    privacyTitle: 'Privacy Policy | PromptArk',
    privacyDescription: 'Read the PromptArk Privacy Policy.',
    termsTitle: 'Terms of Service | PromptArk',
    termsDescription: 'Read the PromptArk Terms of Service.',
    backHome: 'Back to homepage',
  },
  zh: {
    privacyTitle: '隐私政策 | PromptArk',
    privacyDescription: '查看 PromptArk 隐私政策。',
    termsTitle: '服务条款 | PromptArk',
    termsDescription: '查看 PromptArk 服务条款。',
    backHome: '返回首页',
  },
} as const

function setMetaDescription(content: string) {
  let tag = document.querySelector('meta[name="description"]')

  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute('name', 'description')
    document.head.appendChild(tag)
  }

  tag.setAttribute('content', content)
}

export function LegalPage({ section, user, onAuthChange }: LegalPageProps) {
  const { language } = useI18n()
  const copy = legalPageCopy[language]
  const markdown = getLegalMarkdown(language, section)
  const title = section === 'privacy' ? copy.privacyTitle : copy.termsTitle
  const description = section === 'privacy' ? copy.privacyDescription : copy.termsDescription

  useEffect(() => {
    document.title = title
    setMetaDescription(description)
  }, [description, title])

  return (
    <div className="landing-shell">
      <SiteHeader user={user} onAuthChange={onAuthChange} />

      <main className="legal-main">
        <a href="/" className="legal-back-link">
          ← {copy.backHome}
        </a>

        <article className="legal-card">
          <div className="legal-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {markdown}
            </ReactMarkdown>
          </div>
        </article>
      </main>

      <SiteFooter />
    </div>
  )
}
