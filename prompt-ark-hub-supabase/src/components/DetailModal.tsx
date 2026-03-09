import React, { useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Prompt } from '../lib/supabase'

interface DetailModalProps {
  prompt: Prompt | null
  onClose: () => void
  onCopyLink?: () => void
  onFork?: () => void
  onInstall?: () => void
  children?: React.ReactNode
}

interface PackItem {
  title?: string
  content?: string
  category?: string
  tags?: string[]
}

export function DetailModal({ prompt, onClose, onCopyLink, onFork, onInstall, children }: DetailModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  if (!prompt) return null

  // Check if this is a pack
  const isPack = prompt.type === 'pack'
  
  // Parse pack items from content if type is pack
  const packItems: PackItem[] = isPack ? (() => {
    try {
      const parsed = JSON.parse(prompt.content || '[]')
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })() : []

  // Parse variables from content (only for single prompt)
  const parseVariables = (content: string) => {
    const vars = content.match(/\{\{([^}]+)\}\}/g) || []
    const uniqueVars = [...new Set(vars.map(v => 
      v.replace(/\{\{|\}\}/g, '').split(/[:=|]/)[0].trim()
    ))]
    return uniqueVars
  }

  const variables = !isPack ? parseVariables(prompt.content || '') : []
  const hasVariables = variables.length > 0

  // Variable highlighting
  const highlightVariables = (content: string) => {
    return content.replace(/\{\{([^}]+)\}\}/g, 
      '<span class="hub-var-highlight">{{$1}}</span>'
    )
  }

  const renderMetaItems = () => {
    const items: React.ReactNode[] = []
    if (prompt.category) items.push(<span key="cat" className="hub-modal-meta-item">📁 {prompt.category}</span>)
    if (prompt.variable_count) items.push(<span key="var" className="hub-modal-meta-item">🔤 {prompt.variable_count} variable{prompt.variable_count > 1 ? 's' : ''}</span>)
    if (prompt.token_estimate) items.push(<span key="token" className="hub-modal-meta-item">📏 ~{prompt.token_estimate} tokens</span>)
    if (isPack && packItems.length > 0) {
      items.push(<span key="pack" className="hub-modal-meta-item">📦 {packItems.length} prompt{packItems.length > 1 ? 's' : ''}</span>)
    }
    return items
  }

  const renderLanguage = () => {
    if (!prompt.language) return null
    return <span key="lang" className="hub-modal-meta-item">🌐 {prompt.language.toUpperCase()}</span>
  }

  const renderQualityScore = () => {
    if (!prompt.quality_score) return null
    const scoreClass = prompt.quality_score >= 80 ? 'high' : prompt.quality_score >= 50 ? 'mid' : 'low'
    return <span key="score" className={`hub-card-score ${scoreClass}`}>💎 {prompt.quality_score}</span>
  }

  // Variable highlighting helper
  const renderVariableHighlight = (text: React.ReactNode): React.ReactNode => {
    if (typeof text !== 'string') return text
    
    const parts = text.split(/(\{\{[^}]+\}\})/g)
    if (parts.length === 1) return text
    
    return (
      <>
        {parts.map((part, i) => {
          if (part.match(/^\{\{[^}]+\}\}$/)) {
            return <span key={i} className="hub-var-highlight">{part}</span>
          }
          return part
        })}
      </>
    )
  }

  // Variable highlighting component for react-markdown
  const MarkdownComponents = {
    p: ({ children, ...props }: React.HTMLProps<HTMLParagraphElement>) => (
      <p {...props}>{renderVariableHighlight(children)}</p>
    ),
    span: ({ children, ...props }: React.HTMLProps<HTMLSpanElement>) => (
      <span {...props}>{renderVariableHighlight(children)}</span>
    ),
    li: ({ children, ...props }: React.HTMLProps<HTMLLIElement>) => (
      <li {...props}>{renderVariableHighlight(children)}</li>
    ),
    td: ({ children, ...props }: React.HTMLProps<HTMLTableDataCellElement>) => (
      <td {...props}>{renderVariableHighlight(children)}</td>
    ),
    th: ({ children, ...props }: React.HTMLProps<HTMLTableHeaderCellElement>) => (
      <th {...props}>{renderVariableHighlight(children)}</th>
    ),
    code: ({ className, children, ...props }: React.HTMLProps<HTMLElement> & { className?: string }) => {
      const match = /language-(\w+)/.exec(className || '')
      const isInline = !match && !className
      
      if (isInline) {
        const codeContent = String(children).replace(/\n$/, '')
        return (
          <code className={className} {...props}>
            {renderVariableHighlight(codeContent)}
          </code>
        )
      }
      
      return (
        <code className={className} {...props}>
          {children}
        </code>
      )
    }
  }

  // Render pack items list
  const renderPackItems = () => {
    if (!isPack || packItems.length === 0) return null

    return (
      <div className="hub-pack-list">
        <p style={{ marginBottom: '12px', color: 'var(--text-secondary)' }}>
          This pack contains <strong>{packItems.length}</strong> prompts:
        </p>
        {packItems.map((item, idx) => (
          <div key={idx} className="hub-pack-item">
            <div className="hub-pack-item-title">
              {item.title || `Prompt ${idx + 1}`}
            </div>
            <div className="hub-pack-item-preview">
              {(item.content || '').substring(0, 100)}...
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="hub-modal-backdrop active" id="modalBackdrop">
      <div className="hub-modal" ref={modalRef} id="detailModal">
        <div className="hub-modal-header">
          <div>
            <h2 className="hub-modal-title" id="modalTitle">{prompt.title}</h2>
            <div className="hub-modal-author" id="modalAuthor">
              {prompt.author_avatar && (
                <img className="hub-author-avatar" src={prompt.author_avatar} alt={prompt.author} />
              )}
              <span>{prompt.author}</span>
            </div>
          </div>
          <button className="hub-modal-close" onClick={onClose}>✕</button>
        </div>
        
        <div className="hub-modal-body" id="modalBody">
          <div className="hub-modal-meta">
            {renderMetaItems()}
            {renderQualityScore()}
            {renderLanguage()}
          </div>
          
          {/* Pack view: show items list */}
          {isPack ? (
            renderPackItems()
          ) : (
            <>
              {/* Single prompt view: show variables and content */}
              {hasVariables && (
                <div className="hub-var-panel">
                  <div className="hub-var-panel-title">📝 Variables ({variables.length})</div>
                  <div className="hub-var-list">
                    {variables.map((v, i) => (
                      <span key={i} className="hub-var-chip">{`{{${v}}}`}</span>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="hub-modal-content">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]} 
                  components={MarkdownComponents}
                >
                  {prompt.content || 'No content available.'}
                </ReactMarkdown>
              </div>
            </>
          )}
        </div>
        
        <div className="hub-modal-footer">
          <div className="hub-modal-votes">
            {children}
          </div>
          <div className="hub-modal-actions">
            <button className="hub-action-btn" id="copyLinkBtn" title="Copy share link" onClick={onCopyLink}>
              🔗 Copy Link
            </button>
            {!isPack && (
              <button className="hub-action-btn" id="forkBtn" title="Fork this prompt to your collection" onClick={onFork}>
                🍴 Fork
              </button>
            )}
            <button className="hub-install-btn" id="installBtn" title="Add to Prompt Ark" onClick={onInstall}>
              ⚡ Add to Prompt Ark
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
