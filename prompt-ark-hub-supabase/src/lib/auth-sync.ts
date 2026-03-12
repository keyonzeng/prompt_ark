import { supabase } from './supabase'
import type { User } from '@supabase/supabase-js'

// Generate a simple auth token from user session
function generateAuthToken(user: User): string {
  return btoa(JSON.stringify({
    userId: user.id,
    email: user.email,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
  }))
}

// Sync auth state to extension
async function syncAuthToExtension(user: User | null) {
  const authData = {
    type: 'PROMPT_ARK_AUTH_SYNC',
    payload: user ? {
      isLoggedIn: true,
      authToken: generateAuthToken(user),
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name,
        avatar: user.user_metadata?.avatar_url
      }
    } : {
      isLoggedIn: false,
      authToken: null,
      user: null
    }
  }

  // Send to all frames (including extension)
  window.postMessage(authData, '*')
  
  // Also try to store in localStorage for direct extension access
  try {
    localStorage.setItem('prompt_ark_auth', JSON.stringify(authData.payload))
  } catch (e) {
    console.error('Failed to save auth to localStorage:', e)
  }
}

// Listen to auth state changes
export function initAuthSync() {
  // Initial sync
  supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('Auth state changed:', event, session?.user?.email)
    
    if (session?.user) {
      await syncAuthToExtension(session.user)
    } else {
      await syncAuthToExtension(null)
    }
  })
}

// Get current auth token (for extension to query)
export function getAuthToken(): string | null {
  const authData = localStorage.getItem('prompt_ark_auth')
  if (!authData) return null
  
  try {
    const parsed = JSON.parse(authData)
    if (parsed.isLoggedIn && parsed.authToken) {
      return parsed.authToken
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
