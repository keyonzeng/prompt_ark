/**
 * Prompt Loader — reads .md prompt files from the extension's prompts/ directory.
 * Caches loaded prompts in memory. Supports eager preloading to avoid
 * blocking the first AI call with a file fetch.
 */

const cache = new Map();

/**
 * Load a prompt by name from prompts/<name>.md
 * Returns cached version if available.
 * @param {string} name - Prompt file basename (without .md extension)
 * @returns {Promise<string>} The prompt text content
 */
export async function loadPrompt(name) {
    if (cache.has(name)) return cache.get(name);
    const url = chrome.runtime.getURL(`prompts/${name}.md`);
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Failed to load prompt "${name}": ${resp.status}`);
    const text = (await resp.text()).trim();
    cache.set(name, text);
    return text;
}

/** All known prompt file names for preloading */
const ALL_PROMPTS = [
    'metadata-extract-zh',
    'metadata-extract-en',
    'optimize',
    'smart-convert',
    'translate-prompt',
    'share-twitter',
    'share-reddit',
    'share-zhihu',
    'share-wechat',
    'share-xiaohongshu',
    'share-linkedin',
    'youtube-video-prompt',
    'video-style-transfer',
    'video-content-inspire',
    'video-analyze',
    'share-article-zhihu',
    'share-article-reddit',
    'share-article-wechat',
    'share-article-linkedin',
    'share-article-xiaohongshu',
    'share-article-twitter',
];

/**
 * Preload all prompt files into memory cache.
 * Runs all fetches in parallel. Failures are logged but do not
 * block other prompts from loading — graceful degradation.
 */
export async function preloadAllPrompts() {
    const results = await Promise.allSettled(ALL_PROMPTS.map(name => loadPrompt(name)));
    const failed = results.filter(r => r.status === 'rejected');
    if (failed.length > 0) {
        console.warn(`[PromptLoader] ${failed.length}/${ALL_PROMPTS.length} prompts failed to preload:`,
            failed.map(r => r.reason?.message));
    }
}
