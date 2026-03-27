import { AuthButton } from './AuthButton'
import { APP_NAME, EXTENSION_URL } from '../lib/site'

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
          alt={APP_NAME}
          className="hub-logo-icon"
        />
        <span className="hub-logo-text">{APP_NAME}</span>
      </a>
      <div className="hub-auth-container">
        <a 
          className="hub-ext-link" 
          href={EXTENSION_URL}
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
