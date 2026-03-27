// lib/supabase/config.js - Supabase Configuration
// Should match prompt-ark-hub-supabase/.env

export const SUPABASE_URL = 'https://uwuiarfxrgdvvnhoixqs.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_8VG9tfMMsWXNQmUq7B3t5g_hs4BNBCQ';

const DEV_HUB_URL = 'http://localhost:5173';
const PROD_HUB_URL = 'https://promptark.oometa.ai/hub';

let cachedHubUrl = null;

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
