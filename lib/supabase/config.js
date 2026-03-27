// lib/supabase/config.js - Supabase Configuration
// Should match prompt-ark-hub-supabase/.env

const TEST_SUPABASE_URL = 'https://uwuiarfxrgdvvnhoixqs.supabase.co';
const TEST_SUPABASE_ANON_KEY = 'sb_publishable_8VG9tfMMsWXNQmUq7B3t5g_hs4BNBCQ';

const PROD_SUPABASE_URL = 'https://zjzcmejfuzpkctxcsmxh.supabase.co';
const PROD_SUPABASE_ANON_KEY = 'sb_publishable_AJC1CyIlZ9z-mMEzMseJRQ_YjDnNTvj';

const DEV_HUB_URL = 'http://localhost:5173/hub';
const PROD_HUB_URL = 'https://promptark.oometa.ai/hub';

let cachedSiteRoot = null;
let cachedHubUrl = null;
let cachedSupabaseConfig = null;

export async function getSiteRoot() {
  if (cachedSiteRoot) return cachedSiteRoot;
  
  try {
    await fetch(DEV_HUB_URL, { method: 'HEAD', mode: 'no-cors' });
    cachedSiteRoot = 'http://localhost:5173';
  } catch {
    cachedSiteRoot = 'https://promptark.oometa.ai';
  }
  return cachedSiteRoot;
}

export async function getHubUrl() {
  if (cachedHubUrl) return cachedHubUrl;
  
  try {
    await fetch(DEV_HUB_URL, { method: 'HEAD', mode: 'no-cors' });
    cachedHubUrl = DEV_HUB_URL;
  } catch {
    cachedHubUrl = PROD_HUB_URL;
  }
  return cachedHubUrl;
}

export async function getSupabaseConfig() {
  if (cachedSupabaseConfig) return cachedSupabaseConfig;
  
  try {
    await fetch(DEV_HUB_URL, { method: 'HEAD', mode: 'no-cors' });
    cachedSupabaseConfig = { url: TEST_SUPABASE_URL, anonKey: TEST_SUPABASE_ANON_KEY };
  } catch {
    cachedSupabaseConfig = { url: PROD_SUPABASE_URL, anonKey: PROD_SUPABASE_ANON_KEY };
  }
  return cachedSupabaseConfig;
}
