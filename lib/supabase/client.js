import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { 
  initSupabaseClient, 
  setSession, 
  getUser, 
  from, 
  getSession, 
  isAuthenticated, 
  signOut,
  onAuthStateChange,
  authenticatedFetch 
} from './minimal-client.js';

let _initialized = false;

export function initSupabase(accessToken, refreshToken, expiresAt, user) {
  if (!accessToken || !refreshToken) {
    console.warn('[Supabase] Missing tokens, skipping initialization');
    return;
  }
  
  initSupabaseClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    accessToken,
    refreshToken,
    expiresAt,
    user
  );
  
  _initialized = true;
  console.log('[Supabase] Initialized for user:', user?.email);
}

export async function initSupabaseFromStorage() {
  const result = await chrome.storage.local.get([
    'accessToken', 
    'refreshToken', 
    'expiresAt', 
    'hubUser',
    'isLoggedIn'
  ]);
  
  if (result.isLoggedIn && result.accessToken && result.refreshToken) {
    initSupabase(
      result.accessToken,
      result.refreshToken,
      result.expiresAt,
      result.hubUser
    );
    return true;
  }
  
  return false;
}

export { setSession, getUser, from, getSession, isAuthenticated, signOut, onAuthStateChange, authenticatedFetch };
export { getSession as getSupabaseSession, isAuthenticated as isSupabaseAuthenticated };
