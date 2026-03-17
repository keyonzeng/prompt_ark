// lib/supabase/minimal-client.js - Minimal Supabase Auth Client
// Handles token refresh and authenticated API calls without full SDK

let _accessToken = null;
let _refreshToken = null;
let _expiresAt = null;
let _user = null;
let _supabaseUrl = '';
let _supabaseAnonKey = '';
let _listeners = [];

// Supabase Auth API endpoints
const AUTH_ENDPOINT = '/auth/v1';
const TOKEN_REFRESH_MARGIN = 60 * 1000; // Refresh 1 minute before expiry

/**
 * Initialize the Supabase client with tokens
 * @param {string} url - Supabase project URL
 * @param {string} anonKey - Supabase anon key
 * @param {string} accessToken - Initial access token
 * @param {string} refreshToken - Initial refresh token
 * @param {number} expiresAt - Token expiry timestamp (seconds)
 * @param {object} user - User info object
 */
export function initSupabaseClient(url, anonKey, accessToken, refreshToken, expiresAt, user) {
  _supabaseUrl = url.replace(/\/$/, '');
  _supabaseAnonKey = anonKey;
  _accessToken = accessToken;
  _refreshToken = refreshToken;
  _expiresAt = expiresAt ? expiresAt * 1000 : null;
  _user = user;
  
  console.log('[Supabase] Client initialized:', user?.email);
  
  _notifyListeners('SIGNED_IN', user);
}

/**
 * Set session from access and refresh tokens
 */
export function setSession(accessToken, refreshToken, expiresIn) {
  _accessToken = accessToken;
  _refreshToken = refreshToken;
  _expiresAt = Date.now() + (expiresIn * 1000);
  
  console.log('[Supabase] Session set, expires in:', expiresIn, 'seconds');
  
  // Fetch user info
  return getUser();
}

/**
 * Get current user
 */
export async function getUser() {
  if (!_accessToken) return null;
  
  try {
    const response = await fetch(`${_supabaseUrl}${AUTH_ENDPOINT}/user`, {
      headers: {
        'Authorization': `Bearer ${_accessToken}`,
        'apikey': _supabaseAnonKey
      }
    });
    
    if (response.ok) {
      _user = await response.json();
      return _user;
    }
  } catch (error) {
    console.error('[Supabase] Failed to get user:', error);
  }
  
  return null;
}

/**
 * Check if token needs refresh and refresh if needed
 */
async function ensureValidToken() {
  if (!_refreshToken) {
    throw new Error('No refresh token available');
  }
  
  const now = Date.now();
  const expiresAtMs = _expiresAt || 0;
  
  if (expiresAtMs > now + TOKEN_REFRESH_MARGIN) {
    return _accessToken;
  }
  
  // Token is expired or close to expiring, refresh it
  console.log('[Supabase] Token expired or expiring soon, refreshing...');
  
  try {
    const response = await fetch(`${_supabaseUrl}${AUTH_ENDPOINT}/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': _supabaseAnonKey
      },
      body: JSON.stringify({
        refresh_token: _refreshToken
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('[Supabase] Token refresh failed:', error);
      
      // Token refresh failed, user needs to re-authenticate
      _accessToken = null;
      _refreshToken = null;
      _user = null;
      _notifyListeners('SIGNED_OUT', null);
      
      throw new Error('Token refresh failed: ' + (error.error_description || error.msg));
    }
    
    const data = await response.json();
    _accessToken = data.access_token;
    _refreshToken = data.refresh_token;
    _expiresAt = Date.now() + (data.expires_in * 1000);
    
    console.log('[Supabase] Token refreshed successfully');
    
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({
        accessToken: _accessToken,
        refreshToken: _refreshToken,
        expiresAt: Math.floor(_expiresAt / 1000)
      });
    }
    
    _notifyListeners('TOKEN_REFRESHED', _user);
    
    return _accessToken;
  } catch (error) {
    console.error('[Supabase] Token refresh error:', error);
    throw error;
  }
}

/**
 * Make an authenticated API request
 */
export async function authenticatedFetch(url, options = {}) {
  const token = await ensureValidToken();
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'apikey': _supabaseAnonKey,
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  const response = await fetch(url, {
    ...options,
    headers
  });
  
  return response;
}

/**
 * Make a request to the Supabase REST API
 */
export async function from(table) {
  const baseUrl = `${_supabaseUrl}/rest/v1/${table}`;
  
  return {
    select: (columns = '*') => {
      return {
        eq: (column, value) => {
          return {
            execute: async () => {
              const url = `${baseUrl}?${column}=eq.${encodeURIComponent(value)}&select=${columns}`;
              const response = await authenticatedFetch(url);
              if (!response.ok) {
                throw new Error(`Supabase error: ${response.status}`);
              }
              return { data: await response.json(), error: null };
            }
          };
        },
        execute: async () => {
          const url = `${baseUrl}?select=${columns}`;
          const response = await authenticatedFetch(url);
          if (!response.ok) {
            throw new Error(`Supabase error: ${response.status}`);
          }
          return { data: await response.json(), error: null };
        }
      };
    },
    insert: (data) => {
      return {
        execute: async () => {
          const response = await authenticatedFetch(baseUrl, {
            method: 'POST',
            headers: {
              'Prefer': 'return=representation'
            },
            body: JSON.stringify(data)
          });
          if (!response.ok) {
            throw new Error(`Supabase error: ${response.status}`);
          }
          const text = await response.text();
          if (!text) {
            return { data: [], error: null };
          }
          try {
            return { data: JSON.parse(text), error: null };
          } catch (e) {
            console.warn('[Supabase] Failed to parse response:', text);
            return { data: [], error: null };
          }
        }
      };
    }
  };
}

/**
 * Get current session info
 */
export function getSession() {
  return {
    access_token: _accessToken,
    refresh_token: _refreshToken,
    expires_at: _expiresAt,
    user: _user
  };
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
  return !!_accessToken && !!_user;
}

/**
 * Sign out
 */
export function signOut() {
  _accessToken = null;
  _refreshToken = null;
  _expiresAt = null;
  _user = null;
  
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    chrome.storage.local.remove(['accessToken', 'refreshToken', 'expiresAt']);
  }
  
  _notifyListeners('SIGNED_OUT', null);
  console.log('[Supabase] Signed out');
}

/**
 * Add auth state change listener
 */
export function onAuthStateChange(callback) {
  _listeners.push(callback);
  
  // Return unsubscribe function
  return () => {
    _listeners = _listeners.filter(listener => listener !== callback);
  };
}

function _notifyListeners(event, user) {
  _listeners.forEach(listener => {
    try {
      listener(event, user);
    } catch (e) {
      console.error('[Supabase] Listener error:', e);
    }
  });
}

// For debugging
export function getDebugInfo() {
  return {
    url: _supabaseUrl,
    hasAccessToken: !!_accessToken,
    hasRefreshToken: !!_refreshToken,
    expiresAt: _expiresAt,
    user: _user
  };
}
