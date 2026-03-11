// lib/context-menu.js — Context menu build & click handling
import { PromptStorage, LocalStorage } from './storage.js';
import { translations } from '../locales.js';
import { extractTitleHeuristic, detectLanguageHeuristic, matchCategory } from './text-analysis.js';
import { extractVariables, composePrompt } from './variables.js';
import { getActiveProvider } from './ai/provider.js';
import { smartConvertWithAI } from './ai/smart-convert.js';

// --- Context Menu Constants ---
export const AI_PLATFORMS = [
    { id: 'chatgpt', name: 'ChatGPT', url: 'https://chatgpt.com/' },
    { id: 'claude', name: 'Claude', url: 'https://claude.ai/new' },
    { id: 'gemini', name: 'Gemini', url: 'https://gemini.google.com/app' },
    { id: 'deepseek', name: 'DeepSeek', url: 'https://chat.deepseek.com/' },
    { id: 'kimi', name: 'Kimi', url: 'https://kimi.com/' },
    { id: 'doubao', name: '豆包', url: 'https://www.doubao.com/' },
    { id: 'qwen', name: '通义千问', url: 'https://chat.qwen.ai/' },
];

// Content script match patterns for detection
export const AI_CHAT_PATTERNS = [
    'chat.openai.com', 'chatgpt.com', 'claude.ai', 'gemini.google.com',
    'notebooklm.google.com', 'aistudio.google.com', 'grok.com',
    'chat.deepseek.com', 'kimi.com', 'kimi.moonshot.cn', 'chatglm.cn',
    'doubao.com', 'yiyan.baidu.com', 'tongyi.aliyun.com', 'chat.qwen.ai',
    'hailuoai.com', 'hunyuan.tencent.com'
];

export async function getDefaultPlatform() {
    const defaultPlatform = await LocalStorage.get('defaultPlatform');
    return defaultPlatform || 'chatgpt';
}

export function isAIChatUrl(url) {
    if (!url) return false;
    return AI_CHAT_PATTERNS.some(pattern => url.includes(pattern));
}

// Serialized context menu builder: queues concurrent calls instead of dropping them
let _buildMenusChain = Promise.resolve();
let _buildMenusPending = false;

// Await-able wrapper for chrome.contextMenus.create
function createMenu(props) {
    return new Promise((resolve) => chrome.contextMenus.create(props, resolve));
}

/**
 * Build context menus. Queues concurrent calls to avoid race conditions.
 * @param {Function} getPromptsFn - Injected to access prompt list
 */
export async function buildContextMenus(getPromptsFn) {
    if (_buildMenusPending) return;
    _buildMenusPending = true;
    _buildMenusChain = _buildMenusChain
        .then(() => _doBuildContextMenus(getPromptsFn))
        .catch(e => console.error('[buildContextMenus] error:', e))
        .finally(() => { _buildMenusPending = false; });
    return _buildMenusChain;
}

async function _doBuildContextMenus(getPromptsFn) {
    try {
        const { language } = await chrome.storage.sync.get('language');
        let locale = language;
        if (!locale) {
            locale = chrome.i18n.getUILanguage().startsWith('zh') ? 'zh_CN' : 'en';
        }
        const dict = translations[locale] || translations['en'];
        const t = (key, fallback) => dict[key] || fallback;

        await chrome.contextMenus.removeAll();

        // Top-level action 1: save selected text as-is
        await createMenu({
            id: 'prompt-ark-add',
            title: t('contextMenuAddPrompt', 'Add to Prompt Ark'),
            contexts: ['selection']
        });

        // Top-level action 2: AI rewrites content into a reusable prompt
        await createMenu({
            id: 'prompt-ark-convert',
            title: t('contextMenuConvertPrompt', 'Smart Convert to Prompt'),
            contexts: ['selection']
        });

        const prompts = await getPromptsFn();

        if (prompts.length > 0) {
            // Smart list: favorites first (up to 5), then most-recently-used (up to 5)
            const favorites = prompts
                .filter(p => p.favorite)
                .sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0))
                .slice(0, 5);

            const favoriteIds = new Set(favorites.map(p => p.id));
            const recents = prompts
                .filter(p => !favoriteIds.has(p.id) && p.lastUsedAt)
                .sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0))
                .slice(0, 5);

            const fallbackList = recents.length === 0
                ? prompts
                    .filter(p => !favoriteIds.has(p.id))
                    .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
                    .slice(0, 5)
                : recents;

            const menuItems = [...favorites, ...fallbackList];

            if (menuItems.length > 0) {
                const listLabel = t('contextMenuPromptsList', 'Prompts List');
                await createMenu({
                    id: 'prompt-ark-parent',
                    title: listLabel,
                    contexts: ['selection']
                });

                for (const p of menuItems) {
                    const label = p.favorite ? `⭐ ${p.title}` : p.title;
                    await createMenu({
                        id: `prompt-ark-${p.id}`,
                        parentId: 'prompt-ark-parent',
                        title: label,
                        contexts: ['selection']
                    });
                }
            }
        }
    } finally {
        // (no flag to reset — managed by promise chain)
    }
}

/**
 * Handle context menu click.
 * @param {Object} info - chrome.contextMenus click info
 * @param {Object} tab - Active tab
 * @param {Function} getPromptsFn - Prompt list accessor
 * @param {Function} asyncEnrichPromptFn - Async enrichment injected
 * @param {Function} buildContextMenusFn - Rebuild menus on change
 */
export async function handleContextMenuClick(info, tab, getPromptsFn, asyncEnrichPromptFn, buildContextMenusFn) {
    const menuId = info.menuItemId;

    // --- Smart Convert to Prompt ---
    if (menuId === 'prompt-ark-convert') {
        const selectedText = (info.selectionText || '').trim();
        if (!selectedText) return;

        const provider = await getActiveProvider();
        if (!provider) {
            if (tab?.id) {
                try {
                    await chrome.tabs.sendMessage(tab.id, { type: 'SMART_CONVERT_STATUS', status: 'no_provider' });
                } catch (e) {
                    try {
                        await chrome.scripting.executeScript({
                            target: { tabId: tab.id },
                            func: (msg) => {
                                const n = document.createElement('div');
                                n.textContent = '❌ ' + msg;
                                n.style.cssText = 'position:fixed;top:20px;right:20px;z-index:999999;padding:12px 20px;background:#ef4444;color:white;border-radius:8px;font-size:14px;font-family:system-ui;box-shadow:0 4px 12px rgba(0,0,0,0.3);';
                                document.body.appendChild(n);
                                setTimeout(() => { n.style.opacity = '0'; setTimeout(() => n.remove(), 300); }, 3500);
                            },
                            args: [chrome.i18n.getMessage('smartConvertNoProvider') || 'Smart Convert requires an AI provider. Configure one in Prompt Ark settings.']
                        });
                    } catch (e2) { /* OK */ }
                }
            }
            return;
        }

        // Show "processing" toast
        if (tab?.id) {
            try {
                await chrome.tabs.sendMessage(tab.id, { type: 'SMART_CONVERT_STATUS', status: 'start' });
            } catch (e) {
                try {
                    await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: (msg) => {
                            const n = document.createElement('div');
                            n.id = 'apm-smart-convert-toast';
                            n.textContent = '⏳ ' + msg;
                            n.style.cssText = 'position:fixed;top:20px;right:20px;z-index:999999;padding:12px 20px;background:rgba(15,23,42,0.92);color:white;border-radius:8px;font-size:14px;font-family:system-ui;box-shadow:0 4px 12px rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.15);';
                            document.body.appendChild(n);
                        },
                        args: [chrome.i18n.getMessage('contextMenuConvertStart') || 'Converting to prompt...']
                    });
                } catch (e2) { /* OK */ }
            }
        }

        let savedTitle = '';
        try {
            const result = await smartConvertWithAI(selectedText);
            if (!result?.prompt) throw new Error('Empty result from AI');

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
                    pageTitle: tab?.title || '',
                    pageUrl: tab?.url || '',
                    capturedAt: Date.now(),
                    convertMethod: 'smart_convert',
                },
                createdAt: Date.now()
            };
            savedTitle = newPrompt.title;
            await PromptStorage.save(newPrompt);
            await buildContextMenusFn();
            try { chrome.runtime.sendMessage({ type: 'PROMPTS_UPDATED', prompt: newPrompt }); } catch { /* popup may be closed */ }

            // Show success toast
            if (tab?.id) {
                try {
                    await chrome.tabs.sendMessage(tab.id, { type: 'SMART_CONVERT_STATUS', status: 'success', title: savedTitle });
                } catch (e) {
                    try {
                        await chrome.scripting.executeScript({
                            target: { tabId: tab.id },
                            func: (title, msg) => {
                                document.getElementById('apm-smart-convert-toast')?.remove();
                                const n = document.createElement('div');
                                n.textContent = `✨ ${msg}: "${title}"`;
                                n.style.cssText = 'position:fixed;top:20px;right:20px;z-index:999999;padding:12px 20px;background:#10b981;color:white;border-radius:8px;font-size:14px;font-family:system-ui;box-shadow:0 4px 12px rgba(0,0,0,0.3);';
                                document.body.appendChild(n);
                                setTimeout(() => { n.style.opacity = '0'; n.style.transition = 'opacity 0.3s'; setTimeout(() => n.remove(), 300); }, 3000);
                            },
                            args: [savedTitle, chrome.i18n.getMessage('contextMenuConvertSuccess') || 'Smart prompt saved!']
                        });
                    } catch (e2) { /* OK */ }
                }
            }
        } catch (e) {
            console.error('[SmartConvert] AI call failed, falling back to raw save:', e);
            const heuristicTitle = extractTitleHeuristic(selectedText);
            const lang = detectLanguageHeuristic(selectedText);
            const fallbackId = crypto.randomUUID();
            await PromptStorage.save({
                id: fallbackId,
                title: heuristicTitle,
                content: selectedText,
                category: matchCategory(selectedText, lang),
                tags: [],
                shortcut: '',
                variables: extractVariables(selectedText),
                versions: [],
                usageCount: 0,
                lastUsedAt: null,
                favorite: false,
                sourceContext: {
                    text: selectedText.substring(0, 5000),
                    pageTitle: tab?.title || '',
                    pageUrl: tab?.url || '',
                    capturedAt: Date.now(),
                    convertMethod: 'smart_convert',
                },
                createdAt: Date.now()
            });
            await buildContextMenusFn();
            try { chrome.runtime.sendMessage({ type: 'PROMPTS_UPDATED' }); } catch { /* OK */ }

            // Show error toast
            if (tab?.id) {
                try {
                    await chrome.tabs.sendMessage(tab.id, { type: 'SMART_CONVERT_STATUS', status: 'error' });
                } catch (err) {
                    try {
                        await chrome.scripting.executeScript({
                            target: { tabId: tab.id },
                            func: (msg) => {
                                document.getElementById('apm-smart-convert-toast')?.remove();
                                const n = document.createElement('div');
                                n.textContent = '❌ ' + msg;
                                n.style.cssText = 'position:fixed;top:20px;right:20px;z-index:999999;padding:12px 20px;background:#f59e0b;color:white;border-radius:8px;font-size:14px;font-family:system-ui;box-shadow:0 4px 12px rgba(0,0,0,0.3);';
                                document.body.appendChild(n);
                                setTimeout(() => { n.style.opacity = '0'; n.style.transition = 'opacity 0.3s'; setTimeout(() => n.remove(), 300); }, 3500);
                            },
                            args: [chrome.i18n.getMessage('contextMenuConvertError') || 'Smart Convert failed, saved as raw text']
                        });
                    } catch (e2) { /* OK */ }
                }
            }
        }
        return;
    }

    // --- Add to Prompt Ark ---
    if (menuId === 'prompt-ark-add') {
        const selectedText = (info.selectionText || '').trim();
        if (!selectedText) return;

        const heuristicTitle = extractTitleHeuristic(selectedText);
        const lang = detectLanguageHeuristic(selectedText);
        const heuristicCategory = matchCategory(selectedText, lang);

        const newId = crypto.randomUUID();
        const newPrompt = {
            id: newId,
            title: heuristicTitle,
            content: selectedText,
            category: heuristicCategory,
            tags: [],
            shortcut: '',
            variables: extractVariables(selectedText),
            versions: [],
            usageCount: 0,
            lastUsedAt: null,
            favorite: false,
            sourceContext: {
                text: selectedText.substring(0, 5000),
                pageTitle: tab?.title || '',
                pageUrl: tab?.url || '',
                capturedAt: Date.now(),
                convertMethod: 'quick_add',
            },
            createdAt: Date.now()
        };
        await PromptStorage.save(newPrompt);
        await buildContextMenusFn();

        try { chrome.runtime.sendMessage({ type: 'PROMPTS_UPDATED' }); } catch { /* popup may be closed */ }

        // Show toast
        if (tab?.id) {
            try {
                await chrome.tabs.sendMessage(tab.id, { type: 'SAVE_FROM_CONTEXT_MENU_SUCCESS' });
            } catch (e) {
                try {
                    await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: (t) => {
                            const n = document.createElement('div');
                            n.textContent = `✅ "${t}" added to Prompt Ark`;
                            n.style.cssText = 'position:fixed;top:20px;right:20px;z-index:999999;padding:12px 20px;background:#10b981;color:white;border-radius:8px;font-size:14px;font-family:system-ui;box-shadow:0 4px 12px rgba(0,0,0,0.3);transition:opacity 0.3s;';
                            document.body.appendChild(n);
                            setTimeout(() => { n.style.opacity = '0'; setTimeout(() => n.remove(), 300); }, 2500);
                        },
                        args: [heuristicTitle]
                    });
                } catch (e2) { /* OK */ }
            }
        }

        await asyncEnrichPromptFn(newId, selectedText);
        return;
    }

    // --- Use Prompt ---
    if (!menuId.startsWith('prompt-ark-') || menuId === 'prompt-ark-parent') return;

    const promptId = menuId.replace('prompt-ark-', '');
    const prompts = await getPromptsFn();
    const prompt = prompts.find(p => p.id === promptId);
    if (!prompt) return;

    const selectedText = info.selectionText || '';

    let composed = prompt.content;
    if (composed.includes('{{selection}}')) {
        composed = composed.replace(/\{\{selection\}\}/g, selectedText);
    } else {
        composed = composed + '\n\n' + selectedText;
    }

    composed = await composePrompt(prompt, composed);

    const target = prompts.find(p => p.id === promptId);
    if (target) {
        target.usageCount = (target.usageCount || 0) + 1;
        target.lastUsedAt = Date.now();
        await PromptStorage.update(target);
    }

    // If current tab is AI chat platform, inject directly
    if (tab?.url && isAIChatUrl(tab.url)) {
        try {
            await chrome.tabs.sendMessage(tab.id, { type: 'INSERT_PROMPT', content: composed });
            return;
        } catch (e) { /* Fall through */ }
    }

    // Otherwise: open default AI platform and inject after load
    const platformId = await getDefaultPlatform();
    const platform = AI_PLATFORMS.find(p => p.id === platformId) || AI_PLATFORMS[0];

    await LocalStorage.set('pendingPrompt', composed);

    const newTab = await chrome.tabs.create({ url: platform.url });

    const listener = async (tabId, changeInfo) => {
        if (tabId === newTab.id && changeInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            setTimeout(async () => {
                try {
                    const pendingPrompt = await LocalStorage.get('pendingPrompt');
                    if (pendingPrompt) {
                        await chrome.tabs.sendMessage(tabId, { type: 'INSERT_PROMPT', content: pendingPrompt });
                        await LocalStorage.remove('pendingPrompt');
                    }
                } catch (e) { /* Content script may not be ready */ }
            }, 1500);
        }
    };
    chrome.tabs.onUpdated.addListener(listener);
}
