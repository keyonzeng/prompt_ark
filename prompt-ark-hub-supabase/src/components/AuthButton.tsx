import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { getCurrentPageUrl } from '../lib/site'

interface AuthButtonProps {
  user: { id: string; email?: string; user_metadata?: { avatar_url?: string; name?: string } } | null
  onAuthChange: (user: any) => void
  loginLabel?: string
  logoutLabel?: string
}

export function AuthButton({
  user,
  onAuthChange,
  loginLabel = 'Sign In',
  logoutLabel = 'Logout',
}: AuthButtonProps) {
  const [avatarError, setAvatarError] = useState(false)

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getCurrentPageUrl(),
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
    if (error) {
      console.error('Login error:', error)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    onAuthChange(null)
  }

  if (user) {
    return (
      <div className="hub-auth-button">
        <div className="hub-user-info">
          {(user.user_metadata?.avatar_url && !avatarError) ? (
            <img 
              src={user.user_metadata.avatar_url} 
              alt="avatar" 
              className="hub-user-avatar"
              referrerPolicy="no-referrer"
              onError={() => setAvatarError(true)}
            />
          ) : (
            <div className="hub-user-avatar-placeholder">
              {(user.user_metadata?.name || user.email || '?').charAt(0).toUpperCase()}
            </div>
          )}
          <span className="hub-user-name">{user.user_metadata?.name || user.email}</span>
        </div>
        <button className="hub-logout-btn" onClick={handleLogout}>
          {logoutLabel}
        </button>
      </div>
    )
  }

  return (
    <button className="hub-auth-login-btn" onClick={handleLogin}>
      {loginLabel}
    </button>
  )
}
