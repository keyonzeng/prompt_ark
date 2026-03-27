import { getHubUrl, getSupabaseConfig } from './config.js';
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

export async function initSupabase(accessToken, refreshToken, expiresAt, user) {
  if (!accessToken || !refreshToken) {
    console.warn('[Supabase] Missing tokens, skipping initialization');
    return;
  }
  
  const { url, anonKey } = await getSupabaseConfig();
  initSupabaseClient(
    url,
    anonKey,
    accessToken,
    refreshToken,
    expiresAt,
    user
  );
  
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

function detectLanguage(text) {
  if (!text) return 'en';
  const cjk = text.match(/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/g);
  return (cjk && cjk.length > text.length * 0.1) ? 'zh' : 'en';
}

function extractVariableNames(content) {
  const matches = content?.match(/\{\{([^}]+)\}\}/g) || [];
  return [...new Set(matches.map(m => {
    const inner = m.replace(/\{\{|\}\}/g, '');
    return inner.split(/[:=|]/)[0].trim();
  }))];
}

function estimateQualityScore(content) {
  if (!content) return 0;
  let score = 50;
  if (content.includes('{{')) score += 10;
  if (content.includes('###')) score += 5;
  if (content.length > 500) score += 10;
  if (content.length > 1000) score += 10;
  return Math.min(score, 100);
}

export const HubClient = {
  async checkLogin() {
    const user = await getUser();
    return { loggedIn: !!user, user };
  },

  async fetchPublicPrompts(limit = 50) {
    const queryBuilder = await from('prompts');
    const { data, error } = await queryBuilder
      .select('*')
      .eq('visibility', 'public')
      .execute();
    
    if (error) throw error;
    return data?.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, limit) || [];
  },

  async fetchPromptById(id) {
    const queryBuilder = await from('prompts');
    const { data, error } = await queryBuilder
      .select('*')
      .eq('id', id)
      .execute();
    
    if (error) throw error;
    return data?.[0] || null;
  },

  async publishPrompt(prompt, visibility = 'unlisted') {
    const { user } = await this.checkLogin();
    const authorId = user?.id || null;
    const authorName = user?.email?.split('@')[0] || 'anonymous';
    const authorAvatar = user?.user_metadata?.avatar_url || '';

    const content = prompt.content || '';
    const qualityScore = estimateQualityScore(content);

    const payload = {
      title: prompt.title || 'Untitled',
      content: content,
      category: prompt.category || 'General',
      tags: prompt.tags || [],
      description: content.substring(0, 200),
      visibility: visibility,
      type: 'prompt',
      author: authorName,
      author_id: authorId,
      author_avatar: authorAvatar,
      quality_score: qualityScore,
      language: detectLanguage(content),
      variable_count: extractVariableNames(content).length,
      token_estimate: Math.ceil(content.length / 4),
    };

    const queryBuilder = await from('prompts');
    const { data, error } = await queryBuilder.insert(payload).execute();

    if (error) throw error;

    return {
      id: data[0]?.id,
      url: `${await getHubUrl()}?prompt=${data[0]?.id}`,
      visibility: visibility,
    };
  },

  async publishPack(prompts, packTitle, visibility = 'public') {
    const { user } = await this.checkLogin();
    const authorId = user?.id || null;
    const authorName = user?.email?.split('@')[0] || 'anonymous';
    const authorAvatar = user?.user_metadata?.avatar_url || '';

    const allTags = [...new Set(prompts.flatMap(p => p.tags || []))];
    const allContent = prompts.map(p => ({
      title: p.title,
      content: p.content,
      category: p.category,
      tags: p.tags,
    }));

    const payload = {
      title: packTitle,
      content: JSON.stringify(allContent),
      category: prompts[0]?.category || 'General',
      tags: allTags,
      description: `${prompts.length} prompts in this pack`,
      visibility: visibility,
      type: 'pack',
      pack_count: prompts.length,
      author: authorName,
      author_id: authorId,
      author_avatar: authorAvatar,
      quality_score: 50,
      language: detectLanguage(prompts[0]?.content || ''),
      variable_count: prompts.reduce((acc, p) => 
        acc + extractVariableNames(p.content).length, 0),
    };

    const queryBuilder2 = await from('prompts');
    const { data, error } = await queryBuilder2.insert(payload).execute();

    if (error) throw error;

    return {
      id: data[0]?.id,
      url: `${await getHubUrl()}?prompt=${data[0]?.id}`,
      visibility: visibility,
    };
  },

  async updateVisibility(promptId, visibility) {
    const { url: supabaseUrl } = await getSupabaseConfig();
    const url = `${supabaseUrl}/rest/v1/prompts?id=eq.${promptId}`;
    const response = await authenticatedFetch(url, {
      method: 'PATCH',
      body: JSON.stringify({ visibility })
    });
    
    if (!response.ok) {
      throw new Error('Update visibility failed');
    }
    
    return { success: true };
  },

  async deletePrompt(promptId) {
    const { url: supabaseUrl } = await getSupabaseConfig();
    const url = `${supabaseUrl}/rest/v1/prompts?id=eq.${promptId}`;
    const response = await authenticatedFetch(url, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error('Delete failed');
    }
    
    return { success: true };
  },
};
