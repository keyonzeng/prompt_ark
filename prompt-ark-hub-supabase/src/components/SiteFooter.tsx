import { APP_NAME } from '../lib/site'
import { useI18n } from '../lib/i18n'

const footerCopy = {
  en: {
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
    contactLabel: 'Contact us:',
    company: `${APP_NAME} is a product operated by OOMeta.`,
  },
  zh: {
    privacy: '隐私政策',
    terms: '服务条款',
    contactLabel: '联系我们：',
    company: `${APP_NAME} 是由 OOMeta 运营的产品。`,
  },
} as const

export function SiteFooter() {
  const { language } = useI18n()
  const copy = footerCopy[language]

  return (
    <footer className="site-footer">
      <p className="site-footer-company">{copy.company}</p>
      <nav className="site-footer-links" aria-label="Legal">
        <a href="/privacy">{copy.privacy}</a>
        <a href="/terms">{copy.terms}</a>
        <span className="site-footer-contact">
          {copy.contactLabel} <a href="mailto:support@oometa.ai">support@oometa.ai</a>
        </span>
      </nav>
    </footer>
  )
}
