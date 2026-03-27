import legalEnRaw from '../../docs/promptark-legal-pages.md?raw'
import legalZhRaw from '../../docs/promptark-legal-pages.zh.md?raw'
import type { AppLanguage } from './i18n'

export type LegalSection = 'privacy' | 'terms'

function extractSection(markdown: string, section: LegalSection) {
  const marker = `# /${section}`
  const start = markdown.indexOf(marker)

  if (start === -1) {
    throw new Error(`Missing legal section: ${section}`)
  }

  const afterMarker = markdown.slice(start + marker.length).trimStart()
  const nextSectionIndex = afterMarker.search(/^---\s*\n# /m)
  const sectionBody = nextSectionIndex === -1
    ? afterMarker
    : afterMarker.slice(0, nextSectionIndex)

  return sectionBody.trim()
}

export function getLegalMarkdown(language: AppLanguage, section: LegalSection) {
  const source = language === 'zh' ? legalZhRaw : legalEnRaw
  return extractSection(source, section)
}
