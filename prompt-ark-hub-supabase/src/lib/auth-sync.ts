import { supabase } from './supabase'
import type { User, Session } from '@supabase/supabase-js'

// Sync auth state to extension with real Supabase session tokens
async function syncAuthToExtension(session: Session | null) {
  const authData = {
    type: 'PROMPT_ARK_AUTH_SYNC',
    payload: session ? {
      isLoggedIn: true,
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.user_metadata?.name,
        avatar: session.user.user_metadata?.avatar_url
      }
    } : {
      isLoggedIn: false,
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      user: null
    }
  }

  // Send to extension via postMessage (content script will forward to background)
  window.postMessage(authData, '*');
  
  // Also store in localStorage as fallback
  try {
    localStorage.setItem('prompt_ark_auth', JSON.stringify(authData.payload))
  } catch (e) {
    console.error('Failed to save auth to localStorage:', e)
  }
}

// Listen to auth state changes (including TOKEN_REFRESHED)
let _authSyncInitialized = false;

export function initAuthSync() {
  if (_authSyncInitialized) return;
  _authSyncInitialized = true;
  
  supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('Auth state changed:', event, session?.user?.email)
    
    // Pass full session to get real tokens
    await syncAuthToExtension(session)
  })
}

// Get current access token (for extension to query)
export function getAuthToken(): string | null {
  const authData = localStorage.getItem('prompt_ark_auth')
  if (!authData) return null
  
  try {
    const parsed = JSON.parse(authData)
    if (parsed.isLoggedIn && parsed.accessToken) {
      return parsed.accessToken
    }
  } catch (e) {
    return null
  }
  return null
}

// Check if user is logged in
export function isLoggedIn(): boolean {
  const authData = localStorage.getItem('prompt_ark_auth')
  if (!authData) return false
  
  try {
    const parsed = JSON.parse(authData)
    return parsed.isLoggedIn === true
  } catch (e) {
    return false
  }
}
