import React from 'react'
import { AuthButton } from './AuthButton'

interface HeaderProps {
  title?: string
  subtitle?: string
  user?: any
  onAuthChange?: (user: any) => void
}

export function Header({ 
  title = 'Prompt Ark Hub', 
  subtitle = 'Discover, install, and share AI prompts from the community',
  user,
  onAuthChange
}: HeaderProps) {
  return (
    <header className="hub-header">
      <div className="hub-logo">
        <h1>{title}</h1>
      </div>
      <p className="hub-subtitle">{subtitle}</p>
      <div className="hub-auth-container">
        <a 
          className="hub-ext-link" 
          href="https://github.com/keyonzeng/prompt_ark" 
          target="_blank" 
          rel="noopener noreferrer"
        >
          🧩 Get Extension
        </a>
        <AuthButton user={user} onAuthChange={onAuthChange || (() => {})} />
      </div>
    </header>
  )
}
