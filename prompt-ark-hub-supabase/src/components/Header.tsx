import React from 'react'
import { AuthButton } from './AuthButton'

interface HeaderProps {
  user?: any
  onAuthChange?: (user: any) => void
}

export function Header({ 
  user,
  onAuthChange
}: HeaderProps) {
  return (
    <header className="hub-header">
      <a href="/" className="hub-logo-link">
        <img 
          src="/icon128.png" 
          alt="Prompt Ark" 
          className="hub-logo-icon"
        />
        <span className="hub-logo-text">Prompt Ark</span>
      </a>
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
