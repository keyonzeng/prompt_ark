// background.js - Service Worker
console.log(`🔥 [background.js] v${chrome.runtime.getManifest().version} loaded`);
import { callGeminiWeb, isGeminiWebAvailable } from './lib/gemini-web.js';
import { SyncStorage, LocalStorage, PromptStorage, migrateLocalToSync, SyncManager } from './lib/storage.js';
import { GitHubClient } from './lib/github-client.js';
import { DEFAULT_PROMPTS } from './lib/default-prompts.js';
import { translations } from './locales.js';
import { loadPrompt, preloadAllPrompts } from './lib/prompt-loader.js';
import { HubClient } from './lib/supabase/client.js';
import { safeParseJSON, fetchWithTimeout, getProviders, setProviders, getActiveProvider, migrateProviderSettings, callCloudAPI } from './lib/ai/provider.js';
import { extractVariables, classifyVariables, resolveContextVariables, composePrompt } from './lib/variables.js';
import { detectLanguageHeuristic, extractTitleHeuristic, matchCategory, extractTitleAndCategory as _extractTitleAndCategory } from './lib/text-analysis.js';
import { optimizePromptWithAI } from './lib/ai/optimize.js';
import { translatePromptWithAI } from './lib/ai/translate.js';
import { smartConvertWithAI } from './lib/ai/smart-convert.js';
import { asyncEnrichPrompt as _asyncEnrichPrompt } from './lib/ai/enrich.js';
import { generateVideoPromptWithAI } from './lib/ai/video-prompt.js';
import { generateSkillWithAI, pushSkillToOpenClaw } from './lib/ai/p2s-forge.js';
import { generateShareText, shareToSocialPlatform, generateArticleShareText, ARTICLE_SHARE_PLATFORMS, SOCIAL_EDITORS, buildFallbackText } from './lib/ai/share.js';
import { buildContextMenus, handleContextMenuClick } from './lib/context-menu.js';
import { initSupabase, initSupabaseFromStorage, isAuthenticated as isSupabaseAuthenticated, from as supabaseFrom, signOut } from './lib/supabase/client.js';


const githubClient = new GitHubClient();

// Eagerly preload all prompt files into memory cache at service worker startup
preloadAllPrompts();

// Side Panel: toolbar click opens side panel instead of popup
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error('Side panel setup failed:', error));

// Listen for messages from content script (which receives postMessage from Hub)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PROMPT_ARK_AUTH_SYNC') {
    const { isLoggedIn, accessToken, refreshToken, expiresAt, user } = message.payload || {};
    
    chrome.storage.local.set({
      isLoggedIn: isLoggedIn || false,
      accessToken: accessToken || null,
      refreshToken: refreshToken || null,
      expiresAt: expiresAt || null,
      hubUser: user || null
    }).then(async () => {
      console.log('[Hub Auth Sync] Auth state updated:', { isLoggedIn, user: user?.email });
      
      if (isLoggedIn && accessToken && refreshToken) {
        initSupabase(accessToken, refreshToken, expiresAt, user);
        await handlePendingIntent();
      } else {
        signOut();
      }
      
      sendResponse({ success: true });
    }).catch((error) => {
      console.error('[Hub Auth Sync] Failed to store auth:', error);
      sendResponse({ success: false, error: error.message });
    });
    
    return true;
  }
  return false;
});

const PENDING_INTENT_TTL = 15 * 60 * 1000;
let _isPendingIntentRunning = false;

async function handlePendingIntent() {
  if (_isPendingIntentRunning) {
    console.log('[PendingIntent] Already running, skipping');
    return;
  }
  _isPendingIntentRunning = true;
  
  try {
    const result = await chrome.storage.local.get(['pendingIntent']);
    const intent = result.pendingIntent;
    
    if (!intent) {
      _isPendingIntentRunning = false;
      return;
    }
    
    if (Date.now() - intent.timestamp > PENDING_INTENT_TTL) {
      await chrome.storage.local.remove('pendingIntent');
      _isPendingIntentRunning = false;
      return;
    }
    
    await chrome.storage.local.remove('pendingIntent');
    
    console.log('[PendingIntent] Executing:', intent.action);
    
    if (intent.action === 'PUBLISH_TO_HUB') {
      const resp = await HubClient.publishPrompt(intent.promptData, 'public');
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: '🎉 Published to Hub!',
        message: `Your prompt "${intent.promptData.title}" is now live on Hub.`
      });
    } else if (intent.action === 'PUBLISH_PACK_TO_HUB') {
      const resp = await HubClient.publishPack(intent.promptData.prompts, intent.promptData.packTitle, 'public');
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: '🎉 Pack Published!',
        message: `Your prompt pack "${intent.promptData.packTitle}" is now live on Hub.`
      });
    } else if (intent.action === 'SHARE_TO_PLATFORM') {
      const { promptData, platform } = intent;
      const resp = await HubClient.publishPrompt(promptData, 'unlisted');
      
      const shareUrl = resp.url;
      const shareTitle = promptData.title || 'AI Prompt';
      
      const fallbackText = buildFallbackText(platform, shareTitle, shareUrl, promptData);
      
      if (platform === 'zhihu' || platform === 'wechat' || platform === 'xiaohongshu') {
        await shareToSocialPlatform({
          content: promptData.content || '',
          title: shareTitle,
          url: shareUrl,
          platform,
          fallbackText,
        }, () => {});
      } else if (platform === 'twitter') {
        const tweetText = fallbackText || `${shareTitle}\n\n🔗 ${shareUrl}`;
        await chrome.tabs.create({ url: `https://x.com/intent/tweet?text=${encodeURIComponent(tweetText)}` });
      } else if (platform === 'reddit') {
        const redditBody = fallbackText || `${shareTitle}\n\n🔗 ${shareUrl}`;
        await chrome.tabs.create({ url: `https://www.reddit.com/submit?type=TEXT&title=${encodeURIComponent(shareTitle)}` });
        await chrome.tabs.query({ active: true, currentWindow: true }).then(tabs => {
          if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { type: 'COPY_TO_CLIPBOARD', text: redditBody });
        });
      } else if (platform === 'linkedin') {
        const linkedinText = fallbackText || `${shareTitle}\n\n🔗 ${shareUrl}`;
        await chrome.tabs.create({ url: 'https://www.linkedin.com/feed/' });
        await chrome.tabs.query({ active: true, currentWindow: true }).then(tabs => {
          if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { type: 'COPY_TO_CLIPBOARD', text: linkedinText });
        });
      } else if (platform === 'copy') {
        await chrome.tabs.query({ active: true, currentWindow: true }).then(tabs => {
          if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { type: 'COPY_TO_CLIPBOARD', text: shareUrl });
        });
      } else if (platform === 'json') {
        const json = JSON.stringify({ title: shareTitle, content: promptData.content, category: promptData.category, tags: promptData.tags }, null, 2);
        await chrome.tabs.query({ active: true, currentWindow: true }).then(tabs => {
          if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { type: 'COPY_TO_CLIPBOARD', text: json });
        });
      }
      
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: '🔗 ' + (platform === 'copy' || platform === 'json' ? 'Copied!' : 'Opening ' + platform + '...'),
        message: platform === 'copy' || platform === 'json' ? 'Check your clipboard' : 'Check the new tab to finish sharing.'
      });
    }
  } catch (e) {
    console.error('[PendingIntent] Failed:', e);
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: '❌ Publish Failed',
      message: `Failed to publish: ${e.message || 'Unknown error'}. Please try again.`
    });
  } finally {
    _isPendingIntentRunning = false;
  }
}

initSupabaseFromStorage().then(success => {
  if (success) {
    console.log('[Supabase] Session restored from storage');
  }
});

// --- Storage Helper (DRY) ---
// User content → Dual-layer: sync (slim) + local (full)
async function getPrompts() { return await PromptStorage.get(); }
async function setPrompts(prompts) { return await PromptStorage.set(prompts); }


// Wrapper: delegate to text-analysis module with DI
async function extractTitleAndCategory(text) {
  return _extractTitleAndCategory(text, getActiveProvider, callCloudAPI);
}

// --- Install: seed default prompts + migrate settings ---
chrome.runtime.onInstalled.addListener(async () => {
  await migrateProviderSettings();
  await migrateLocalToSync();
  const prompts = await getPrompts();
  if (prompts.length > 0) return;

  // Seed from curated 100-prompt library (lib/default-prompts.js)
  const defaults = DEFAULT_PROMPTS.map((p, i) => {
    // Extract variables from content ({{var}} patterns)
    const vars = [...(p.content.matchAll(/\{\{(\w+)\}\}/g))].map(m => m[1]);
    const uniqueVars = [...new Set(vars)];
    return {
      id: crypto.randomUUID(),
      title: p.title,
      content: p.content,
      category: p.category || 'General',
      tags: p.tags || [],
      variables: uniqueVars,
      shortcut: p.shortcut || '',
      createdAt: Date.now() + i, // Preserve order
      usageCount: 0,
      lastUsed: null,
      builtIn: true
    };
  });

  await PromptStorage.bulkSet(defaults);
});

// --- Async AI Enrichment (wrapper with DI) ---
async function asyncEnrichPrompt(promptId, content) {
  return _asyncEnrichPrompt(promptId, content, extractTitleAndCategory, getPrompts, buildContextMenus);
}

// --- Page Context Cache (for cross-tab magic variables) ---
let _pageContextCache = null;
const PAGE_CONTEXT_TTL = 10 * 60 * 1000; // 10 minutes

// --- Port-based handler for long-running video prompt generation ---
// Port keeps MV3 Service Worker alive (unlike one-shot sendMessage)
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'video-prompt') return;

  port.onMessage.addListener(async (msg) => {
    if (msg.type !== 'GENERATE_VIDEO_PROMPT') return;
    try {
      // Override progress sender to use port instead of broadcast
      const origSendMessage = chrome.runtime.sendMessage.bind(chrome.runtime);
      chrome.runtime.sendMessage = (m) => {
        if (m?.type === 'VIDEO_PROMPT_PROGRESS') {
          try { port.postMessage({ type: 'VIDEO_PROMPT_PROGRESS', message: m.message }); } catch { }
          return Promise.resolve();
        }
        return origSendMessage(m);
      };

      const result = await generateVideoPromptWithAI(msg.videoUrl, msg.mode || 'both', msg.targetLang || '');
      port.postMessage({ type: 'VIDEO_PROMPT_RESULT', success: true, result });

      // Restore original sendMessage
      chrome.runtime.sendMessage = origSendMessage;
    } catch (e) {
      console.error('[Port:video-prompt] Error:', e);
      try { port.postMessage({ type: 'VIDEO_PROMPT_RESULT', success: false, error: e.message }); } catch { }
    }
  });
});

// --- Message Handler ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sendResponse);
  return true;
});

// --- Provider Dispatch Helper (DRY: replaces 3-branch inline dispatch) ---
async function callProvider(provider, prompt) {
  if (provider.type === 'gemini') {
    const model = provider.model || 'gemini-2.0-flash';
    const resp = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': provider.apiKey },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );
    if (!resp.ok) throw new Error(`Gemini API ${resp.status}`);
    const data = await resp.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text;
  } else if (provider.type === 'openai') {
    const resp = await fetchWithTimeout(`${provider.apiUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${provider.apiKey}` },
      body: JSON.stringify({
        model: provider.model || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!resp.ok) throw new Error(`OpenAI API ${resp.status}`);
    const data = await resp.json();
    return data.choices?.[0]?.message?.content;
  } else if (provider.type === 'gemini-web') {
    return await callGeminiWeb(prompt);
  }
  return null;
}

async function requireHubAuth() {
  const accessToken = await LocalStorage.get('accessToken');
  if (!accessToken) {
    throw new Error('NOT_LOGGED_IN');
  }
  return accessToken;
}

async function handleMessage(message, sendResponse) {
  try {
    switch (message.type) {

      // Context Grabber: cache page snapshot for cross-tab usage
      case 'CAPTURE_PAGE_CONTEXT':
        _pageContextCache = {
          page_text: message.context.page_text || '',
          page_title: message.context.page_title || '',
          page_url: message.context.page_url || '',
          selected_text: message.context.selected_text || '',
          capturedAt: Date.now()
        };
        sendResponse({ success: true });
        break;

      case 'GET_PAGE_CONTEXT':
        if (_pageContextCache && (Date.now() - _pageContextCache.capturedAt < PAGE_CONTEXT_TTL)) {
          sendResponse({ success: true, context: _pageContextCache });
        } else {
          _pageContextCache = null; // Expired, clear it
          sendResponse({ success: false });
        }
        break;

      case 'GET_PROMPTS':
        sendResponse({ success: true, prompts: await getPrompts() });
        break;

      case 'GET_OPENCLAW_SETTINGS':
        sendResponse(await LocalStorage.get('openclaw') || { endpoint: '', apiKey: '' });
        break;

      case 'SAVE_OPENCLAW_SETTINGS':
        await LocalStorage.set('openclaw', { endpoint: message.endpoint, apiKey: message.apiKey });
        sendResponse({ success: true });
        break;

      case 'GET_IMAGE_PROMPT_SETTINGS':
        sendResponse(await LocalStorage.get('imagePrompt') || { enabled: false, imageModelId: '' });
        break;

      case 'SAVE_IMAGE_PROMPT_SETTINGS':
        await LocalStorage.set('imagePrompt', { enabled: message.enabled, imageModelId: message.imageModelId });
        // Broadcast to all tabs to enable/disable image prompt feature
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, { type: 'IMAGE_PROMPT_SETTINGS_CHANGED', enabled: message.enabled }).catch(() => {});
          });
        });
        sendResponse({ success: true });
        break;

        
      case 'GENERATE_SKILL': {
        const skillPayload = await generateSkillWithAI(message.promptData);
        const skills = await LocalStorage.get('skills') || [];
        const skillRecord = {
          id: crypto.randomUUID(),
          skill_name: skillPayload.skill_name,
          description: skillPayload.description || '',
          source_prompt_id: message.promptData.id,
          source_prompt_title: message.promptData.title || '',
          files: skillPayload.files,
          pushed: false,
          createdAt: Date.now()
        };
        skills.unshift(skillRecord);
        await LocalStorage.set('skills', skills);
        sendResponse({ success: true, skill: skillRecord });
        break;
      }

      case 'GET_SKILLS':
        sendResponse({ success: true, skills: await LocalStorage.get('skills') || [] });
        break;

      case 'PUSH_SKILL': {
        const allSkills = await LocalStorage.get('skills') || [];
        const target = allSkills.find(s => s.id === message.skillId);
        if (!target) throw new Error('Skill not found');
        await pushSkillToOpenClaw(target);
        target.pushed = true;
        await LocalStorage.set('skills', allSkills);
        sendResponse({ success: true });
        break;
      }

      case 'DELETE_SKILL': {
        let dSkills = await LocalStorage.get('skills') || [];
        dSkills = dSkills.filter(s => s.id !== message.skillId);
        await LocalStorage.set('skills', dSkills);
        sendResponse({ success: true });
        break;
      }

      case 'SAVE_PROMPT': {
        const newId = crypto.randomUUID();
        // Detect if title is auto-generated (empty, heuristic truncated, or identical to content start)
        const userTitle = (message.prompt.title || '').trim();
        const isAutoTitle = !userTitle || userTitle.endsWith('...');
        const newPrompt = {
          id: newId,
          title: message.prompt.title,
          content: message.prompt.content,
          category: message.prompt.category || '',
          tags: message.prompt.tags || [],
          shortcut: message.prompt.shortcut || '',
          variables: extractVariables(message.prompt.content),
          versions: [],
          usageCount: 0,
          lastUsedAt: null,
          favorite: false,
          titleAutoGenerated: isAutoTitle,
          createdAt: Date.now()
        };
        // Preserve structured video data for re-rendering in video modal
        if (message.prompt.videoData) newPrompt.videoData = message.prompt.videoData;
        await PromptStorage.save(newPrompt);
        sendResponse({ success: true });

        // Async AI enrichment — MUST be awaited (not fire-and-forget)
        // to keep MV3 Service Worker alive until completion
        if (isAutoTitle || !newPrompt.category) {
          await asyncEnrichPrompt(newId, message.prompt.content);
        }
        break;
      }

      case 'UPDATE_PROMPT': {
        const prompts = await getPrompts();
        const existing = prompts.find(p => p.id === message.prompt.id);

        // Push current state to versions before updating
        const versions = existing?.versions || [];
        const newVersion = {
          versionId: crypto.randomUUID(),
          content: existing?.content || '',
          timestamp: Date.now()
        };
        const updatedVersions = [newVersion, ...versions].slice(0, 10);

        const updatedPrompt = {
          ...(existing || {}),
          title: message.prompt.title,
          content: message.prompt.content,
          category: message.prompt.category,
          shortcut: message.prompt.shortcut || '',
          variables: extractVariables(message.prompt.content),
          versions: updatedVersions,
          updatedAt: Date.now()
        };

        await PromptStorage.update(updatedPrompt);
        sendResponse({ success: true, prompt: updatedPrompt });

        // Async AI enrichment — awaited to keep MV3 worker alive
        const updateUserTitle = (message.prompt.title || '').trim();
        const updateIsAutoTitle = !updateUserTitle || updateUserTitle.endsWith('...');
        if (updateIsAutoTitle) updatedPrompt.titleAutoGenerated = true;
        if (updateIsAutoTitle || !message.prompt.category) {
          await asyncEnrichPrompt(message.prompt.id, message.prompt.content);
        }
        break;
      }

      case 'DELETE_PROMPT': {
        await PromptStorage.delete(message.id);
        sendResponse({ success: true });
        break;
      }

      case 'EXPORT_PROMPTS':
        sendResponse({ success: true, data: await getPrompts() });
        break;

      case 'IMPORT_PROMPTS': {
        const imported = message.prompts.map(p => ({
          id: crypto.randomUUID(),
          title: p.title,
          content: p.content,
          category: p.category || '',
          tags: p.tags || [],
          shortcut: p.shortcut || '',
          variables: p.variables || extractVariables(p.content),
          createdAt: Date.now()
        }));
        // Append to existing (not overwrite!)
        const existing = await getPrompts();
        await PromptStorage.bulkSet([...existing, ...imported]);
        await buildContextMenus();
        sendResponse({ success: true });

        // Async AI enrichment for imported prompts missing metadata
        for (const p of imported) {
          if (!p.title || !p.category) {
            await asyncEnrichPrompt(p.id, p.content);
          }
        }
        break;
      }

      case 'GET_I18N_DICT': {
        const { language: lang } = await chrome.storage.sync.get('language');
        const locale = lang || (chrome.i18n.getUILanguage().startsWith('zh') ? 'zh_CN' : 'en');
        sendResponse(translations[locale] || translations['en']);
        break;
      }

      case 'LANGUAGE_CHANGED': {
        // Rebuild context menus immediately when user changes language
        buildContextMenus();

        // Broadcast new translation dictionary to all active tabs
        chrome.storage.sync.get('language').then(({ language }) => {
          let locale = language || (chrome.i18n.getUILanguage().startsWith('zh') ? 'zh_CN' : 'en');
          const dict = translations[locale] || translations['en'];
          chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
              chrome.tabs.sendMessage(tab.id, { type: 'UPDATE_I18N_DICT', dict }).catch(() => { });
            });
          });
        });
        break;
      }

      case 'AUTO_EXTRACT': {
        const result = await extractTitleAndCategory(message.content);
        sendResponse({ success: true, ...result });
        break;
      }

      case 'GENERATE_VIDEO_PROMPT':
      case 'GENERATE_YOUTUBE_PROMPT': {
        try {
          const result = await generateVideoPromptWithAI(message.videoUrl, message.mode || 'both', message.targetLang || '');
          sendResponse({ success: true, result });
        } catch (e) {
          console.error('[GENERATE_VIDEO_PROMPT] Error:', e);
          sendResponse({ success: false, error: e.message });
        }
        break;
      }

      // Selection toolbar: save raw selected text (same path as context menu "Add to Prompt Ark")
      case 'QUICK_ADD_SELECTION': {
        const selectedText = (message.text || '').trim();
        if (!selectedText) { sendResponse({ success: false }); break; }

        const hTitle = extractTitleHeuristic(selectedText);
        const hLang = detectLanguageHeuristic(selectedText);
        const newId = crypto.randomUUID();
        await PromptStorage.save({
          id: newId,
          title: hTitle,
          content: selectedText,
          category: matchCategory(selectedText, hLang),
          tags: [],
          shortcut: '',
          variables: extractVariables(selectedText),
          versions: [],
          usageCount: 0,
          lastUsedAt: null,
          favorite: false,
          sourceContext: {
            text: selectedText.substring(0, 5000),
            pageTitle: message.pageTitle || '',
            pageUrl: message.pageUrl || '',
            capturedAt: Date.now(),
            convertMethod: 'quick_add',
          },
          createdAt: Date.now()
        });
        await buildContextMenus();
        try { chrome.runtime.sendMessage({ type: 'PROMPTS_UPDATED' }); } catch { /* OK */ }
        sendResponse({ success: true });
        // Async AI enrichment (non-blocking)
        await asyncEnrichPrompt(newId, selectedText);
        break;
      }

      // Selection toolbar: AI-powered smart convert (single LLM call)
      case 'SMART_CONVERT_SELECTION': {
        const selectedText = (message.text || '').trim();
        if (!selectedText) { sendResponse({ success: false, error: 'No text' }); break; }
        try {
          const result = await smartConvertWithAI(selectedText);
          if (!result?.prompt) throw new Error('Empty result');

          const newId = crypto.randomUUID();
          const newPrompt = {
            id: newId,
            title: result.title || extractTitleHeuristic(result.prompt),
            content: result.prompt,
            category: result.category || '',
            tags: result.tags || [],
            shortcut: '',
            variables: extractVariables(result.prompt),
            versions: [],
            usageCount: 0,
            lastUsedAt: null,
            favorite: false,
            sourceContext: {
              text: selectedText.substring(0, 5000),
              pageTitle: message.pageTitle || '',
              pageUrl: message.pageUrl || '',
              capturedAt: Date.now(),
              convertMethod: 'smart_convert',
            },
            createdAt: Date.now()
          };
          await PromptStorage.save(newPrompt);
          await buildContextMenus();
          try { chrome.runtime.sendMessage({ type: 'PROMPTS_UPDATED', prompt: newPrompt }); } catch { /* OK */ }
          sendResponse({ success: true, title: newPrompt.title });
        } catch (e) {
          console.error('[SMART_CONVERT_SELECTION] Failed:', e);
          sendResponse({ success: false, error: e.message });
        }
        break;
      }

      case 'OPTIMIZE_PROMPT': {
        try {
          let targetProvider = null;
          if (message.providerId) {
            const providers = await getProviders();
            targetProvider = providers.find(p => p.id === message.providerId) || null;
          }
          if (!targetProvider) {
            targetProvider = await getActiveProvider();
          }
          if (!targetProvider) {
            sendResponse({ success: false, error: 'NEED_CLOUD' });
            break;
          }
          const variants = await optimizePromptWithAI(message.content, targetProvider);
          if (!variants || variants.length === 0) {
            sendResponse({ success: false, error: 'Empty optimization result' });
            break;
          }
          sendResponse({ success: true, variants });
        } catch (e) {
          console.error('OPTIMIZE_PROMPT error:', e);
          sendResponse({ success: false, error: e.message });
        }
        break;
      }

      case 'GENERATE_TEXT': {
        const provider = await getActiveProvider();
        if (!provider) {
          sendResponse({ success: false, error: 'NEED_CLOUD' });
          break;
        }
        try {
          const text = await callProvider(provider, message.prompt);
          sendResponse({ success: !!text, text });
        } catch (e) {
          sendResponse({ success: false, error: e.message });
        }
        break;
      }

      case 'TRANSLATE_PROMPT': {
        (async () => {
          try {
            const data = await translatePromptWithAI(message.promptData, message.targetLanguage);
            sendResponse({ success: true, data });
          } catch (e) {
            console.error('[TRANSLATE_PROMPT] Error:', e);
            const isLoginError = e.message === 'NOT_LOGGED_IN' || e.message?.includes('No valid response from Gemini Web');
            if (isLoginError) {
              chrome.tabs.create({ url: 'https://gemini.google.com/app', active: true });
            }
            sendResponse({
              success: false,
              error: isLoginError
                ? '请先登录 Gemini，已自动打开登录页。登录后关闭该页并重新点击翻译。'
                : e.message,
              errorCode: isLoginError ? 'NOT_LOGGED_IN' : null,
            });
          }
        })();
        return true;
      }

      case 'GET_PROVIDERS': {
        const providers = await getProviders();
        const activeProviderId = await LocalStorage.get('activeProviderId');
        sendResponse({ success: true, providers, activeProviderId });
        break;
      }

      case 'SAVE_PROVIDERS': {
        await setProviders(message.providers);
        if (message.activeProviderId) {
          await LocalStorage.set('activeProviderId', message.activeProviderId);
        }
        sendResponse({ success: true });
        break;
      }

      case 'GET_SHORTCUTS': {
        const allPrompts = await getPrompts();
        const shortcuts = allPrompts
          .filter(p => p.shortcut)
          .map(p => ({ id: p.id, shortcut: p.shortcut, title: p.title, content: p.content, variables: p.variables }));
        sendResponse({ success: true, shortcuts });
        break;
      }

      case 'GENERATE_SHARE_TEXT': {
        (async () => {
          try {
            const result = await generateShareText(message.content, message.title, message.url, message.platform);
            sendResponse({ success: !!result, ...result });
          } catch (e) {
            console.error('[GENERATE_SHARE_TEXT] Error:', e);
            sendResponse({ success: false, error: e.message });
          }
        })();
        return true;
      }

      case 'SHARE_TO_PLATFORM': {
        (async () => {
          try {
            await shareToSocialPlatform(message, sendResponse);
          } catch (e) {
            console.error('[SHARE_TO_PLATFORM] Error:', e);
            sendResponse({ success: false, error: e.message });
          }
        })();
        return true;
      }

      case 'ARTICLE_SHARE_TO_PLATFORM': {
        (async () => {
          try {
            const { sourceText, platform } = message;
            const result = await generateArticleShareText(sourceText, platform);
            if (!result) {
              sendResponse({ success: false, error: 'Failed to generate article' });
              return;
            }

            const shareText = result.body || '';
            const articleTitle = result.title || '';
            const editor = SOCIAL_EDITORS[platform];

            // Platforms with SOCIAL_EDITORS (direct injection)
            if (editor) {
              await shareToSocialPlatform({
                content: '', title: articleTitle, url: '', platform,
                fallbackText: articleTitle ? `${articleTitle}\n\n${shareText}` : shareText,
                skipGenerate: true,  // Article already generated by generateArticleShareText — don't overwrite with prompt share
              }, sendResponse);
              return;
            }

            // URL-based platforms
            if (platform === 'twitter') {
              const tweetText = shareText.substring(0, 280);
              await chrome.tabs.create({ url: `https://x.com/intent/tweet?text=${encodeURIComponent(tweetText)}` });
            } else if (platform === 'reddit') {
              const redditTitle = articleTitle || shareText.split('\n')[0].substring(0, 120);
              await chrome.tabs.create({ url: `https://www.reddit.com/submit?type=TEXT&title=${encodeURIComponent(redditTitle)}` });
              // Copy body to clipboard for pasting
              try {
                await chrome.tabs.query({ active: true, currentWindow: true }).then(tabs => {
                  if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { type: 'COPY_TO_CLIPBOARD', text: shareText });
                });
              } catch (e) { /* best effort */ }
            }

            sendResponse({ success: true, title: articleTitle, body: shareText });
          } catch (e) {
            console.error('[ARTICLE_SHARE_TO_PLATFORM] Error:', e);
            sendResponse({ success: false, error: e.message });
          }
        })();
        return true;
      }

      case 'COMPOSE_PROMPT': {
        (async () => {
          try {
            const composed = composePrompt(message.prompt, message.contentOverride);
            // Resolve context variables (@-prefixed)
            const { resolved, resolvedMap } = await resolveContextVariables(composed);
            const allVars = extractVariables(composed);
            const { user: userVars } = classifyVariables(allVars);
            // Only return user vars (context vars already resolved in content)
            sendResponse({
              success: true,
              composed: resolved,
              variables: userVars,
              contextResolved: resolvedMap
            });
          } catch (e) {
            sendResponse({ success: false, error: e.message });
          }
        })();
        return true; // Keep message channel open for async response
      }

      case 'TRACK_USAGE': {
        const prompts = await getPrompts();
        const updated = prompts.map(p => {
          if (p.id === message.id) {
            return { ...p, usageCount: (p.usageCount || 0) + 1, lastUsedAt: Date.now() };
          }
          return p;
        });
        const target = updated.find(p => p.id === message.id);
        if (target) await PromptStorage.update(target);
        sendResponse({ success: true });
        break;
      }

      case 'TOGGLE_FAVORITE': {
        const prompts = await getPrompts();
        const target = prompts.find(p => p.id === message.id);
        if (target) {
          target.favorite = !target.favorite;
          await PromptStorage.update(target);
        }
        sendResponse({ success: true });
        break;
      }

      case 'GET_PROMPT_HISTORY': {
        const prompts = await getPrompts();
        const prompt = prompts.find(p => p.id === message.id);
        sendResponse({ success: true, versions: prompt?.versions || [] });
        break;
      }

      case 'RESTORE_PROMPT_VERSION': {
        const prompts = await getPrompts();
        const target = prompts.find(p => p.id === message.id);
        if (target) {
          const version = target.versions?.find(v => v.versionId === message.versionId);
          if (version) {
            // Save current state as new version before restoring (audit trail)
            const currentVersion = {
              versionId: crypto.randomUUID(),
              content: target.content,
              timestamp: Date.now()
            };
            target.versions = [currentVersion, ...(target.versions || [])].slice(0, 10);
            
            // Restore the selected version
            target.content = version.content;
            target.variables = extractVariables(version.content);
            target.updatedAt = Date.now();
            await PromptStorage.update(target);
          }
        }
        sendResponse({ success: true });
        break;
      }

      case 'BATCH_RENAME_CATEGORY': {
        const prompts = await getPrompts();
        // Update each prompt in the old category individually
        const toUpdate = prompts.filter(p => p.category === message.oldName);
        for (const p of toUpdate) {
          p.category = message.newName;
          await PromptStorage.update(p);
        }
        sendResponse({ success: true });
        break;
      }

      case 'GET_DEFAULT_PLATFORM': {
        const platform = await LocalStorage.get('defaultPlatform');
        sendResponse({ success: true, defaultPlatform: platform || 'chatgpt' });
        break;
      }

      case 'SET_DEFAULT_PLATFORM': {
        await LocalStorage.set('defaultPlatform', message.platform);
        sendResponse({ success: true });
        break;
      }

      case 'GET_SYNC_USAGE': {
        const usage = await SyncStorage.getUsage();
        sendResponse({ success: true, ...usage });
        break;
      }

      case 'SHARE_PROMPT': {
        try {
          await requireHubAuth();
          const result = await HubClient.publishPrompt(message.prompt, 'unlisted');
          sendResponse({ success: true, id: result.id, url: result.url });
        } catch (e) {
          sendResponse({ success: false, error: e.message });
        }
        break;
      }

      case 'CHECK_HUB_LOGIN': {
        const accessToken = await LocalStorage.get('accessToken');
        if (!accessToken) {
          sendResponse({ success: true, isLoggedIn: false });
          break;
        }
        
        try {
          const { loggedIn, user } = await HubClient.checkLogin();
          sendResponse({ success: true, isLoggedIn: loggedIn, user });
        } catch (e) {
          sendResponse({ success: true, isLoggedIn: false });
        }
        break;
      }

      case 'GET_GITHUB_TOKEN': {
        const ghToken = await LocalStorage.get('githubToken');
        sendResponse({ success: true, token: ghToken || '' });
        break;
      }

      case 'GET_SYNC_SETTINGS': {
        const syncKeys = [
          'sync_backend', 'gist_id', 'webdavUrl', 'webdavUser', 'webdavPassword',
          'obsidianWebdavUrl', 'obsidianWebdavUser', 'obsidianWebdavPassword',
          'obsidianFolder', 'obsidianLocalPort', 'obsidianLocalApiKey'
        ];
        const defaults = { sync_backend: 'none', obsidianFolder: 'prompts', obsidianLocalPort: 27123 };
        const values = await Promise.all(syncKeys.map(k => LocalStorage.get(k)));
        const settings = Object.fromEntries(syncKeys.map((k, i) => {
          const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
          return [camel, values[i] || defaults[k] || ''];
        }));
        sendResponse({ success: true, ...settings });
        break;
      }

      case 'SAVE_SYNC_SETTINGS': {
        await LocalStorage.set('sync_backend', message.backend);
        await LocalStorage.set('gist_id', message.gistId);

        if (message.webdavUrl !== undefined) await LocalStorage.set('webdavUrl', message.webdavUrl);
        if (message.webdavUser !== undefined) await LocalStorage.set('webdavUser', message.webdavUser);
        if (message.webdavPassword !== undefined) await LocalStorage.set('webdavPassword', message.webdavPassword);

        if (message.obsidianWebdavUrl !== undefined) await LocalStorage.set('obsidianWebdavUrl', message.obsidianWebdavUrl);
        if (message.obsidianWebdavUser !== undefined) await LocalStorage.set('obsidianWebdavUser', message.obsidianWebdavUser);
        if (message.obsidianWebdavPassword !== undefined) await LocalStorage.set('obsidianWebdavPassword', message.obsidianWebdavPassword);
        if (message.obsidianFolder !== undefined) await LocalStorage.set('obsidianFolder', message.obsidianFolder);

        if (message.obsidianLocalPort !== undefined) await LocalStorage.set('obsidianLocalPort', message.obsidianLocalPort);
        if (message.obsidianLocalApiKey !== undefined) await LocalStorage.set('obsidianLocalApiKey', message.obsidianLocalApiKey);

        await SyncManager.loadConfig();
        sendResponse({ success: true });
        break;
      }

      case 'FORCE_GIST_SYNC':
      case 'FORCE_WEBDAV_SYNC':
      case 'FORCE_OBSIDIAN_SYNC':
      case 'FORCE_OBSIDIAN_LOCAL_SYNC': {
        const syncMethods = {
          FORCE_GIST_SYNC: 'pullFromGistAndMerge',
          FORCE_WEBDAV_SYNC: 'pullFromWebdavAndMerge',
          FORCE_OBSIDIAN_SYNC: 'pullFromObsidianAndMerge',
          FORCE_OBSIDIAN_LOCAL_SYNC: 'pullFromObsidianLocalAndMerge',
        };
        try {
          const result = await SyncManager[syncMethods[message.type]]();
          sendResponse({ success: true, message: result?.message });
        } catch (e) {
          sendResponse({ success: false, error: e.message });
        }
        break;
      }

      case 'PUBLISH_TO_HUB': {
        try {
          await requireHubAuth();
          const result = await HubClient.publishPrompt(message.prompt, message.visibility || 'public');
          sendResponse({ success: true, id: result.id, url: result.url });
        } catch (e) {
          sendResponse({ success: false, error: e.message });
        }
        break;
      }

      case 'PUBLISH_PACK_TO_HUB': {
        try {
          await requireHubAuth();
          const result = await HubClient.publishPack(message.prompts, message.packTitle, message.visibility || 'public');
          sendResponse({ success: true, id: result.id, url: result.url });
        } catch (e) {
          sendResponse({ success: false, error: e.message });
        }
        break;
      }

      default:
        sendResponse({ success: false, error: 'Unknown message type' });
    }
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}


// Execute specific commands bound in manifest
chrome.commands.onCommand.addListener((command) => {
  if (command === "open-picker") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0 || !tabs[0].url.startsWith("http")) return;
      chrome.tabs.sendMessage(tabs[0].id, { type: "TOGGLE_PICKER" }).catch(() => { });
    });
  } else if (command === "grab-context") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0 || !tabs[0].url.startsWith("http")) return;
      chrome.tabs.sendMessage(tabs[0].id, { type: "GRAB_CONTEXT" }).catch(() => { });
    });
  } else if (command === "share-article") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0 || !tabs[0].url.startsWith("http")) return;
      chrome.tabs.sendMessage(tabs[0].id, { type: "SHOW_ARTICLE_SHARE_PICKER" }).catch(() => { });
    });
  }
});

// Context menu click handler — delegates to lib/context-menu.js
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  await handleContextMenuClick(info, tab, getPrompts, asyncEnrichPrompt, () => buildContextMenus(getPrompts));
});

// Build menus on install/startup
chrome.runtime.onInstalled.addListener(() => buildContextMenus(getPrompts));
chrome.runtime.onStartup.addListener(() => buildContextMenus(getPrompts));

// Auto-rebuild menus when prompts change
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && (changes.prompts || Object.keys(changes).some(k => k.startsWith('prompts_')))) {
    buildContextMenus(getPrompts);
  }
});
