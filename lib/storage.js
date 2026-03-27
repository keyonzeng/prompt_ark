// storage.js - Unified storage abstraction layer
import LZString from './lz-string.min.js';
import { WebDAVClient } from './webdav-client.js';
import { markdownToPrompt, promptToMarkdown, promptToFilename } from './frontmatter.js';

const webdavClient = new WebDAVClient();

// Architecture: Dual-layer storage for scalability
//   Sync: slim prompt data (core fields only) - cross-device sync
//   Local: full data (versions, usage stats) + sensitive config (API keys)
//
// Capacity analysis:
//   - chrome.storage.sync: 100KB total, 8KB/key, 512 keys max
//   - Slim prompt (no versions): ~300-500 bytes → 200-300 prompts
//   - Full prompt (with 20 versions): ~2-5KB → only 20-50 prompts
//   - Solution: sync = slim, local = full, merge on read

// chrome.storage.sync limits:
//   QUOTA_BYTES_PER_ITEM = 8192 (key length + JSON.stringify(value) in bytes)
//   QUOTA_BYTES = 102400 (total)
//   MAX_ITEMS = 512
// Chunk budget: 8192 - max_key_length(~15) - JSON_quotes(2) - margin(175) = ~6000
const MAX_CHUNK_BYTES = 6000;
const SYNC_QUOTA_BYTES = 102400;
const DEBOUNCE_MS = 500;

// Fields that are synced cross-device (per-prompt key, chunked if > 8KB)
const SYNC_FIELDS = ['id', 'title', 'content', 'category', 'tags', 'shortcut', 'variables', 'favorite', 'createdAt', 'updatedAt'];

const _encoder = new TextEncoder();

// Fields that stay local-only (device-specific or large)
// versions, usageCount, lastUsedAt, pendingPrompt, providers, etc.

// --- Debounce utility ---
const _debounceTimers = {};
function debounce(key, fn, ms = DEBOUNCE_MS) {
    return new Promise((resolve, reject) => {
        clearTimeout(_debounceTimers[key]);
        _debounceTimers[key] = setTimeout(() => {
            fn().then(resolve).catch(reject);
        }, ms);
    });
}

// --- Sync Manager (Strategy Router) ---
export const SyncManager = {
    backend: 'none', // 'none' | 'chrome' | 'webdav' | 'obsidian' | 'obsidian-local'
    _configPromise: null, // Tracks loadConfig() completion to prevent race conditions
    token: '',
    webdavUrl: '',
    webdavUser: '',
    webdavPassword: '',
    // Obsidian Vault sync via WebDAV (individual .md files with frontmatter)
    obsidianWebdavUrl: '',
    obsidianWebdavUser: '',
    obsidianWebdavPassword: '',
    obsidianFolder: 'prompts', // subfolder within the WebDAV-exposed vault
    // Obsidian Local (via plugin REST API on localhost)
    obsidianLocalPort: 27123,
    obsidianLocalApiKey: '',

    async loadConfig() {
        const local = await chrome.storage.local.get([
            'sync_backend', 'githubToken',
            'webdavUrl', 'webdavUser', 'webdavPassword',
            'obsidianWebdavUrl', 'obsidianWebdavUser', 'obsidianWebdavPassword', 'obsidianFolder',
            'obsidianLocalPort', 'obsidianLocalApiKey'
        ]);
        this.backend = local.sync_backend || 'none';
        this.token = local.githubToken || '';
        this.webdavUrl = local.webdavUrl || '';
        this.webdavUser = local.webdavUser || '';
        this.webdavPassword = local.webdavPassword || '';
        this.obsidianWebdavUrl = local.obsidianWebdavUrl || '';
        this.obsidianWebdavUser = local.obsidianWebdavUser || '';
        this.obsidianWebdavPassword = local.obsidianWebdavPassword || '';
        this.obsidianFolder = local.obsidianFolder || 'prompts';
        this.obsidianLocalPort = local.obsidianLocalPort || 27123;
        this.obsidianLocalApiKey = local.obsidianLocalApiKey || '';
    },

    /** Await this before any storage operation to guarantee config is loaded. */
    async ready() {
        if (this._configPromise) await this._configPromise;
    },

    // --- WebDAV Integration ---
    async triggerWebdavSync() {
        if (this.backend !== 'webdav' || !this.webdavUrl || !this.webdavUser || !this.webdavPassword) return;

        return debounce('webdav_sync_upload', async () => {
            try {
                // Collect local state
                const promptsRaw = await chrome.storage.local.get('prompts');
                const prompts = promptsRaw.prompts || [];
                const slimPrompts = prompts.map(toSlimPrompt);

                const payload = { prompts: slimPrompts };
                const compressed = compressForSync(JSON.stringify(payload));

                await webdavClient.putFile(this.webdavUrl, this.webdavUser, this.webdavPassword, 'prompt_ark_sync.json', compressed);
                console.log('[SyncManager] WebDAV sync successful');
            } catch (e) {
                console.error('[SyncManager] WebDAV sync failed:', e);
            }
        }, 2000); // 2 second debounce
    },

    async pullFromWebdavAndMerge() {
        if (this.backend !== 'webdav') throw new Error('ERR_WEBDAV_NOT_ENABLED');
        if (!this.webdavUrl || !this.webdavUser || !this.webdavPassword) {
            throw new Error('ERR_WEBDAV_MISSING_CONFIG');
        }

        let content = '';
        try {
            content = await webdavClient.getFile(this.webdavUrl, this.webdavUser, this.webdavPassword, 'prompt_ark_sync.json');
        } catch (e) {
            if (e.message.includes('FILE_NOT_FOUND')) {
                console.log('[SyncManager] WebDAV file not found. Initializing new file...');
                this.triggerWebdavSync();
                throw new Error('ERR_WEBDAV_EMPTY_AUTO_CREATE');
            }
            throw e;
        }

        const json = decompressFromSync(content);
        let payload;
        try {
            payload = JSON.parse(json);
        } catch (e) {
            throw new Error('ERR_WEBDAV_PARSE_FAILED');
        }


        // Merge Prompts
        if (payload.prompts && payload.prompts.length > 0) {
            const localPrompts = await chrome.storage.local.get('prompts').then(r => r.prompts || []);
            const merged = mergePrompts(payload.prompts, localPrompts);
            await chrome.storage.local.set({ 'prompts': merged });
        }

        console.log('[SyncManager] Successfully pulled and merged from WebDAV');
        return { message: 'MSG_WEBDAV_SYNC_SUCCESS' };
    },

    // --- Obsidian Vault Integration ---
    // Unlike gist/webdav which store a single compressed JSON blob,
    // Obsidian sync reads/writes individual .md files with YAML frontmatter.

    _getObsidianUrl() {
        let base = this.obsidianWebdavUrl.trim();
        if (!base.endsWith('/')) base += '/';
        const folder = this.obsidianFolder.trim().replace(/^\/+|\/+$/g, '');
        return folder ? `${base}${folder}/` : base;
    },

    async triggerObsidianSync() {
        if (this.backend !== 'obsidian') return;
        if (!this.obsidianWebdavUrl || !this.obsidianWebdavUser || !this.obsidianWebdavPassword) return;

        return debounce('obsidian_sync_upload', async () => {
            try {
                const prompts = await chrome.storage.local.get('prompts').then(r => r.prompts || []);
                const url = this._getObsidianUrl();

                for (const prompt of prompts) {
                    const filename = promptToFilename(prompt);
                    const markdown = promptToMarkdown(prompt);
                    await webdavClient.putMarkdownFile(url, this.obsidianWebdavUser, this.obsidianWebdavPassword, filename, markdown);
                }
                console.log(`[SyncManager] Obsidian sync pushed ${prompts.length} prompts`);
            } catch (e) {
                console.error('[SyncManager] Obsidian sync failed:', e);
            }
        }, 3000); // 3 second debounce (more files = more time)
    },

    async pullFromObsidianAndMerge() {
        if (this.backend !== 'obsidian') throw new Error('ERR_OBSIDIAN_NOT_ENABLED');
        if (!this.obsidianWebdavUrl || !this.obsidianWebdavUser || !this.obsidianWebdavPassword) {
            throw new Error('ERR_OBSIDIAN_MISSING_CONFIG');
        }

        const url = this._getObsidianUrl();

        // Step 1: List all .md files in the vault folder
        let files;
        try {
            files = await webdavClient.listMarkdownFiles(url, this.obsidianWebdavUser, this.obsidianWebdavPassword);
        } catch (e) {
            if (e.message.includes('DIR_NOT_FOUND')) {
                console.log('[SyncManager] Obsidian folder not found. Creating and pushing local prompts...');
                await this.triggerObsidianSync();
                throw new Error('ERR_OBSIDIAN_DIR_NOT_FOUND_AUTO_CREATE');
            }
            throw e;
        }

        if (files.length === 0) {
            console.log('[SyncManager] Obsidian folder is empty. Pushing local prompts...');
            await this.triggerObsidianSync();
            return { message: 'MSG_OBSIDIAN_EMPTY_PUSHED' };
        }

        // Step 2: Download and parse each .md file
        const vaultPrompts = [];
        for (const file of files) {
            try {
                const content = await webdavClient.getFile(url, this.obsidianWebdavUser, this.obsidianWebdavPassword, file.name);
                const prompt = markdownToPrompt(content, file.name);
                vaultPrompts.push(prompt);
            } catch (e) {
                console.warn(`[SyncManager] Failed to read ${file.name}:`, e.message);
            }
        }

        // Step 3: Merge vault prompts with local prompts
        const localPrompts = await chrome.storage.local.get('prompts').then(r => r.prompts || []);
        const merged = this._mergeObsidianPrompts(vaultPrompts, localPrompts);
        await chrome.storage.local.set({ prompts: merged });

        console.log(`[SyncManager] Obsidian sync: ${vaultPrompts.length} vault files, ${merged.length} total after merge`);
        return { message: 'MSG_OBSIDIAN_SYNC_SUCCESS' };
    },

    /**
     * Merge vault prompts with local prompts.
     * Matching strategy: prompt_ark_id (if present in frontmatter) > title match > new.
     */
    _mergeObsidianPrompts(vaultPrompts, localPrompts) {
        const localById = new Map(localPrompts.map(p => [p.id, p]));
        const localByTitle = new Map(localPrompts.map(p => [p.title?.toLowerCase(), p]));
        const merged = [];
        const seenIds = new Set();

        for (const vp of vaultPrompts) {
            let local = null;

            // Match by prompt_ark_id (highest priority)
            if (vp.id && localById.has(vp.id)) {
                local = localById.get(vp.id);
            }
            // Match by title (fuzzy merge for first-time sync)
            else if (vp.title && localByTitle.has(vp.title.toLowerCase())) {
                local = localByTitle.get(vp.title.toLowerCase());
            }

            if (local) {
                seenIds.add(local.id);
                merged.push({
                    ...local,
                    title: vp.title || local.title,
                    content: vp.content || local.content,
                    category: vp.category || local.category,
                    tags: vp.tags?.length ? vp.tags : local.tags,
                    favorite: vp.favorite || local.favorite,
                    shortcut: vp.shortcut || local.shortcut,
                    variables: vp.variables?.length ? vp.variables : local.variables,
                });
            } else {
                // New prompt from vault
                merged.push({
                    ...vp,
                    id: vp.id || crypto.randomUUID(),
                    versions: [],
                    usageCount: 0,
                    lastUsedAt: null,
                    createdAt: Date.now(),
                });
            }
        }

        // Keep local-only prompts that weren't in vault
        for (const lp of localPrompts) {
            if (!seenIds.has(lp.id)) {
                merged.push(lp);
            }
        }

        return merged;
    },

    // --- Obsidian Local (Plugin REST API) ---
    // Communicates with the prompt-ark-sync Obsidian plugin via localhost HTTP.

    _getObsidianLocalBaseUrl() {
        return `http://127.0.0.1:${this.obsidianLocalPort}`;
    },

    _getObsidianLocalHeaders() {
        const headers = { 'Content-Type': 'application/json' };
        if (this.obsidianLocalApiKey) {
            headers['Authorization'] = `Bearer ${this.obsidianLocalApiKey}`;
        }
        return headers;
    },

    async triggerObsidianLocalSync() {
        if (this.backend !== 'obsidian-local') return;

        return debounce('obsidian_local_sync_upload', async () => {
            await updateSyncStatus('syncing');
            try {
                const prompts = await chrome.storage.local.get('prompts').then(r => r.prompts || []);
                const baseUrl = this._getObsidianLocalBaseUrl();
                const headers = this._getObsidianLocalHeaders();

                for (const prompt of prompts) {
                    const filename = promptToFilename(prompt);
                    const body = JSON.stringify({
                        title: prompt.title,
                        content: prompt.content,
                        category: prompt.category || '',
                        tags: prompt.tags || [],
                        favorite: prompt.favorite || false,
                        shortcut: prompt.shortcut || '',
                        variables: prompt.variables || [],
                        prompt_ark_id: prompt.id,
                    });

                    await fetch(`${baseUrl}/prompt-ark/prompts/${encodeURIComponent(filename)}`, {
                        method: 'PUT',
                        headers,
                        body
                    });
                }
                console.log(`[SyncManager] Obsidian Local sync pushed ${prompts.length} prompts`);
                await updateSyncStatus('synced');
            } catch (e) {
                console.error('[SyncManager] Obsidian Local sync failed:', e);
                await updateSyncStatus('failed');
            }
        }, 3000);
    },

    async pullFromObsidianLocalAndMerge() {
        if (this.backend !== 'obsidian-local') throw new Error('ERR_OBSIDIAN_LOCAL_NOT_ENABLED');

        const baseUrl = this._getObsidianLocalBaseUrl();
        const headers = this._getObsidianLocalHeaders();

        // Step 1: Health check
        let healthResp;
        try {
            healthResp = await fetch(`${baseUrl}/prompt-ark/health`, { headers });
        } catch (e) {
            throw new Error('ERR_OBSIDIAN_LOCAL_OFFLINE');
        }

        if (!healthResp.ok) {
            throw new Error('ERR_OBSIDIAN_LOCAL_OFFLINE');
        }

        // Step 2: Fetch all prompts
        const listResp = await fetch(`${baseUrl}/prompt-ark/prompts`, { headers });
        if (!listResp.ok) {
            throw new Error('ERR_OBSIDIAN_LOCAL_FETCH_FAILED');
        }

        const data = await listResp.json();
        const vaultPrompts = data.prompts || [];

        if (vaultPrompts.length === 0) {
            console.log('[SyncManager] Obsidian Local vault is empty. Pushing local prompts...');
            await this.triggerObsidianLocalSync();
            return { message: 'MSG_OBSIDIAN_EMPTY_PUSHED' };
        }

        // Step 3: Merge
        const localPrompts = await chrome.storage.local.get('prompts').then(r => r.prompts || []);
        // Map vault prompt id field from prompt_ark_id
        const mappedVault = vaultPrompts.map(vp => ({
            ...vp,
            id: vp.prompt_ark_id || vp.id || null,
        }));
        const merged = this._mergeObsidianPrompts(mappedVault, localPrompts);
        await chrome.storage.local.set({ prompts: merged });

        console.log(`[SyncManager] Obsidian Local sync: ${vaultPrompts.length} vault prompts, ${merged.length} total after merge`);
        return { message: 'MSG_OBSIDIAN_SYNC_SUCCESS' };
    },
};
// Initialize config — store the promise so ready() can await it
SyncManager._configPromise = SyncManager.loadConfig();

/**
 * Strip a prompt to sync-safe fields only.
 * Removes versions, usage stats, and other large/device-specific data.
 */
function toSlimPrompt(prompt) {
    const slim = {};
    for (const field of SYNC_FIELDS) {
        if (prompt[field] !== undefined) {
            slim[field] = prompt[field];
        }
    }
    return slim;
}

/**
 * Utilities for LZ-String compression
 */
function compressForSync(jsonStr) {
    return 'lz::' + LZString.compressToUTF16(jsonStr);
}

function decompressFromSync(str) {
    if (typeof str === 'string' && str.startsWith('lz::')) {
        return LZString.decompressFromUTF16(str.slice(4));
    }
    return str; // Legacy uncompressed payload
}

/**
 * Merge synced slim data with local full data.
 * Sync is the source of truth for core fields; local supplements with versions/usage.
 */
function mergePrompts(syncPrompts, localPrompts) {
    if (!syncPrompts || syncPrompts.length === 0) return localPrompts || [];
    if (!localPrompts || localPrompts.length === 0) return syncPrompts;

    const localMap = new Map(localPrompts.map(p => [p.id, p]));
    const merged = [];

    for (const sp of syncPrompts) {
        const local = localMap.get(sp.id);
        if (local) {
            // Merge: sync core fields + local-only fields
            merged.push(normalizePromptUsage({
                ...sp,
                versions: local.versions || [],
                usageCount: local.usageCount || 0,
                lastUsedAt: local.lastUsedAt || null,
                lastUsed: local.lastUsed || null,
            }));
            localMap.delete(sp.id);
        } else {
            // New from sync (another device), no local data yet
            merged.push(normalizePromptUsage({
                ...sp,
                versions: [],
                usageCount: 0,
                lastUsedAt: null,
                lastUsed: null,
            }));
        }
    }

    // Local-only prompts not in sync (shouldn't normally happen, but handle gracefully)
    // These will get synced on next write
    for (const local of localMap.values()) {
        merged.push(normalizePromptUsage(local));
    }

    return merged;
}

function normalizePromptUsage(prompt) {
    const usageCount = Number(prompt?.usageCount || 0);
    const legacyUsed = prompt?.lastUsed || null;
    const normalizedUsedAt = prompt?.lastUsedAt || (usageCount > 0 ? legacyUsed : null);
    return {
        ...prompt,
        usageCount,
        lastUsedAt: normalizedUsedAt || null,
        lastUsed: normalizedUsedAt || null,
    };
}


// --- Chunked Sync Storage ---
export const SyncStorage = {
    /**
     * Read a chunked value from sync storage.
     * Handles both legacy (single-key) and chunked (multi-key) formats.
     */
    async get(key) {
        if (SyncManager.backend === 'none' || SyncManager.backend === 'gist' || SyncManager.backend === 'webdav' || SyncManager.backend === 'obsidian') {
            const local = await chrome.storage.local.get(`_gist_${key}`);
            return local[`_gist_${key}`] ?? null;
        }

        try {
            // First check for chunk metadata
            const metaKey = `${key}_meta`;
            const metaResult = await chrome.storage.sync.get(metaKey);

            if (metaResult[metaKey]) {
                // Chunked format: reassemble
                const { totalChunks } = metaResult[metaKey];
                const chunkKeys = Array.from({ length: totalChunks }, (_, i) => `${key}_${i}`);
                const chunks = await chrome.storage.sync.get(chunkKeys);

                let payload = '';
                for (let i = 0; i < totalChunks; i++) {
                    const chunk = chunks[`${key}_${i}`];
                    if (chunk === undefined) {
                        console.warn(`SyncStorage: missing chunk ${key}_${i}`);
                        return null;
                    }
                    payload += chunk;
                }
                const json = decompressFromSync(payload);
                return JSON.parse(json);
            }

            // Legacy single-key format
            const result = await chrome.storage.sync.get(key);
            if (result[key]) {
                const payload = result[key];
                if (typeof payload === 'string' && payload.startsWith('lz::')) {
                    return JSON.parse(decompressFromSync(payload));
                }
                return payload;
            }
            return null;
        } catch (e) {
            console.error(`SyncStorage.get(${key}) failed:`, e);
            // Fallback: try local storage
            const local = await chrome.storage.local.get(key);
            return local[key] ?? null;
        }
    },

    /**
     * Write a value to sync storage with automatic byte-safe chunking.
     * Each chunk is guaranteed to fit within QUOTA_BYTES_PER_ITEM (8192 bytes).
     * Falls back to local if total sync quota exceeded.
     */
    async set(key, value) {
        if (SyncManager.backend === 'none' || SyncManager.backend === 'gist' || SyncManager.backend === 'webdav' || SyncManager.backend === 'obsidian' || SyncManager.backend === 'obsidian-local') {
            await chrome.storage.local.set({ [`_gist_${key}`]: value });
            if (SyncManager.backend === 'gist') await SyncManager.triggerGistSync();
            if (SyncManager.backend === 'webdav') await SyncManager.triggerWebdavSync();
            if (SyncManager.backend === 'obsidian') await SyncManager.triggerObsidianSync();
            if (SyncManager.backend === 'obsidian-local') await SyncManager.triggerObsidianLocalSync();
            return { synced: true, bytesUsed: 0 };
        }

        const json = JSON.stringify(value);
        const payload = compressForSync(json);
        const byteSize = _encoder.encode(payload).length;

        // Check total quota
        const bytesInUse = await chrome.storage.sync.getBytesInUse(null);
        const oldBytes = await this._getKeyBytes(key);
        const projected = bytesInUse - oldBytes + byteSize + 200;

        if (projected > SYNC_QUOTA_BYTES) {
            console.warn(`SyncStorage: quota exceeded (${projected}/${SYNC_QUOTA_BYTES} bytes). Falling back to local.`);
            // Clean up old chunks before falling back (prevent orphaned keys)
            try { await this._removeChunks(key); } catch {}
            await chrome.storage.local.set({ [key]: value });
            return { synced: false, reason: 'QUOTA_EXCEEDED', bytesUsed: projected };
        }

        // Clean up old chunks first
        await this._removeChunks(key);

        // Byte-safe chunking (handles multibyte chars like CJK)
        const chunks = this._chunkByBytes(payload);

        if (chunks.length === 1) {
            // Fits in a single key
            await chrome.storage.sync.set({ [key]: payload });
            return { synced: true, bytesUsed: byteSize };
        }

        // Write metadata + string chunks
        const metaKey = `${key}_meta`;
        const writeData = { [metaKey]: { totalChunks: chunks.length } };
        chunks.forEach((chunk, i) => {
            writeData[`${key}_${i}`] = chunk;
        });

        await chrome.storage.sync.set(writeData);
        console.log(`SyncStorage: wrote ${key} in ${chunks.length} chunks (${byteSize} bytes)`);
        return { synced: true, bytesUsed: byteSize, chunks: chunks.length };
    },

    /**
     * Debounced write - prevents hitting the 1800 writes/hour limit.
     */
    async setDebounced(key, value) {
        return debounce(`sync_${key}`, () => this.set(key, value));
    },

    /**
     * Get current sync storage usage info.
     */
    async getUsage() {
        const bytesInUse = await chrome.storage.sync.getBytesInUse(null);
        return {
            bytesInUse,
            quotaBytes: SYNC_QUOTA_BYTES,
            percentUsed: Math.round((bytesInUse / SYNC_QUOTA_BYTES) * 100),
        };
    },

    // --- Internal helpers ---

    /**
     * Split a JSON string into chunks where each chunk's UTF-8 byte length ≤ MAX_CHUNK_BYTES.
     * Uses binary search to handle multibyte characters (CJK = 3 bytes/char in UTF-8).
     */
    _chunkByBytes(json) {
        const totalBytes = _encoder.encode(json).length;
        if (totalBytes <= MAX_CHUNK_BYTES) return [json];

        const chunks = [];
        let pos = 0;

        while (pos < json.length) {
            if (pos + 1 >= json.length) {
                chunks.push(json.slice(pos));
                break;
            }

            // Binary search for max character end position fitting in MAX_CHUNK_BYTES
            let lo = pos + 1;
            let hi = Math.min(pos + MAX_CHUNK_BYTES, json.length); // Upper bound (all ASCII best case)

            while (lo < hi) {
                const mid = Math.ceil((lo + hi) / 2);
                if (_encoder.encode(json.slice(pos, mid)).length <= MAX_CHUNK_BYTES) {
                    lo = mid;
                } else {
                    hi = mid - 1;
                }
            }

            chunks.push(json.slice(pos, lo));
            pos = lo;
        }

        return chunks;
    },

    async _getKeyBytes(key) {
        try {
            const metaKey = `${key}_meta`;
            const metaResult = await chrome.storage.sync.get(metaKey);

            if (metaResult[metaKey]) {
                const { totalChunks } = metaResult[metaKey];
                const chunkKeys = [metaKey, ...Array.from({ length: totalChunks }, (_, i) => `${key}_${i}`)];
                return await chrome.storage.sync.getBytesInUse(chunkKeys);
            }

            return await chrome.storage.sync.getBytesInUse(key);
        } catch {
            return 0;
        }
    },

    async _removeChunks(key) {
        try {
            const metaKey = `${key}_meta`;
            const metaResult = await chrome.storage.sync.get(metaKey);

            const keysToRemove = [key, metaKey]; // Always try removing single-key format too

            if (metaResult[metaKey]) {
                const { totalChunks } = metaResult[metaKey];
                for (let i = 0; i < totalChunks; i++) {
                    keysToRemove.push(`${key}_${i}`);
                }
            }

            await chrome.storage.sync.remove(keysToRemove);
        } catch {
            // Ignore cleanup errors
        }
    },
};


// --- Local Storage (thin wrapper for consistency) ---
export const LocalStorage = {
    async get(key) {
        const result = await chrome.storage.local.get(key);
        return result[key] ?? null;
    },

    async set(key, value) {
        await chrome.storage.local.set({ [key]: value });
    },

    async remove(key) {
        await chrome.storage.local.remove(key);
    },
};


// --- PromptStorage: Per-key sync with auto-chunking for large content ---
// Sync layout:
//   p_index         → [id1, id2, ...]
//   p_${id}         → slim prompt (if < 8KB, includes content)
//   p_${id}_c1..cN  → content overflow chunks (only for large prompts)
// Each key must be < 8,192 bytes (QUOTA_BYTES_PER_ITEM)
const P_INDEX = 'p_index';
const P_PREFIX = 'p_';
const MAX_ITEM_BYTES = 8192;
const SAFE_ITEM_BYTES = 7500; // leave headroom for JSON overhead

function syncKey(id) { return P_PREFIX + id; }
function contentChunkKey(id, n) { return `${P_PREFIX}${id}_c${n}`; }

/**
 * Write a single prompt to sync. Auto-chunks content if > 8KB per key.
 * If total quota exceeded, falls back to metadata-only (no content in sync).
 * Content is always safe in local storage regardless.
 */
async function writeSyncPrompt(prompt) {
    if (SyncManager.backend === 'none') return [];
    if (SyncManager.backend === 'gist') {
        return SyncManager.triggerGistSync();
    }
    if (SyncManager.backend === 'webdav') {
        return SyncManager.triggerWebdavSync();
    }
    if (SyncManager.backend === 'obsidian') {
        return SyncManager.triggerObsidianSync();
    }
    if (SyncManager.backend === 'obsidian-local') {
        return SyncManager.triggerObsidianLocalSync();
    }

    const slim = toSlimPrompt(prompt);
    const json = JSON.stringify(slim);
    const payload = compressForSync(json);
    const bytes = _encoder.encode(payload).length;

    // --- Try full write (with content) ---
    try {
        if (bytes <= SAFE_ITEM_BYTES) {
            slim._chunks = 0;
            // Re-compress the object state with _chunks=0 marker
            const basePayload = compressForSync(JSON.stringify(slim));
            await chrome.storage.sync.set({ [syncKey(prompt.id)]: basePayload });
            return [syncKey(prompt.id)];
        }

        // Content too large for one key — chunk it
        const content = slim.content || '';
        delete slim.content;
        slim._chunks = 0;

        // Compress base metadata
        const basePayload = compressForSync(JSON.stringify(slim));
        const baseOverhead = _encoder.encode(basePayload).length + 50;
        const contentBudget = SAFE_ITEM_BYTES - baseOverhead;

        // Compress full content blocks individually to map to keys safely 
        // Note: For overflow chunks, we compress the raw content string
        const chunks = [];
        let remaining = content;
        while (remaining.length > 0) {
            let sliceLen = Math.min(remaining.length, contentBudget);
            while (_encoder.encode(compressForSync(JSON.stringify(remaining.slice(0, sliceLen)))).length > (chunks.length === 0 ? contentBudget : SAFE_ITEM_BYTES - 50)) {
                sliceLen = Math.max(1, Math.floor(sliceLen * 0.9));
            }
            chunks.push(remaining.slice(0, sliceLen));
            remaining = remaining.slice(sliceLen);
        }

        slim.content = chunks[0];
        slim._chunks = chunks.length - 1;

        const writeData = { [syncKey(prompt.id)]: compressForSync(JSON.stringify(slim)) };
        const keysWritten = [syncKey(prompt.id)];
        for (let i = 1; i < chunks.length; i++) {
            const ck = contentChunkKey(prompt.id, i);
            writeData[ck] = compressForSync(JSON.stringify(chunks[i]));
            keysWritten.push(ck);
        }

        await chrome.storage.sync.set(writeData);
        console.log(`[PromptStorage] write: ${prompt.id} (${keysWritten.length} keys, ${bytes} bytes)`);
        return keysWritten;

    } catch (e) {
        if (!e.message?.includes('quota') && !e.message?.includes('QUOTA')) throw e;

        // Clean up old chunks before falling back (prevent orphaned keys)
        try { await removeSyncPrompt(prompt.id); } catch {}

        // --- Quota exceeded: fallback to metadata-only (no content in sync) ---
        console.warn(`[PromptStorage] Quota exceeded for ${prompt.id}, falling back to metadata-only sync`);
        const metaOnly = { ...slim };
        delete metaOnly.content;
        delete metaOnly.variables;
        metaOnly._chunks = 0;
        metaOnly._contentLocal = true; // flag: content is in local only

        try {
            const fallbackPayload = compressForSync(JSON.stringify(metaOnly));
            await chrome.storage.sync.set({ [syncKey(prompt.id)]: fallbackPayload });
            return [syncKey(prompt.id)];
        } catch (e2) {
            console.error(`[PromptStorage] Even metadata-only sync failed for ${prompt.id}:`, e2.message);
            return []; // give up on sync, data is safe in local
        }
    }
}

/**
 * Read a single prompt from sync, reassembling chunks.
 */
async function readSyncPrompt(id, prefetchedData) {
    let baseRaw = prefetchedData?.[syncKey(id)];
    if (!baseRaw) return null;

    let base;
    if (typeof baseRaw === 'string' && baseRaw.startsWith('lz::')) {
        base = JSON.parse(decompressFromSync(baseRaw));
    } else {
        base = baseRaw; // legacy
    }

    if (!base._chunks || base._chunks === 0) {
        const { _chunks, ...clean } = base;
        return clean;
    }

    // Reassemble overflow chunks
    let fullContent = base.content || '';
    for (let i = 1; i <= base._chunks; i++) {
        const key = contentChunkKey(id, i);
        let chunkRaw = prefetchedData?.[key];
        if (chunkRaw === undefined) {
            // Chunk wasn't prefetched — fetch individually
            const fetched = await chrome.storage.sync.get(key);
            chunkRaw = fetched[key];
        }

        if (typeof chunkRaw === 'string') {
            if (chunkRaw.startsWith('lz::')) {
                fullContent += JSON.parse(decompressFromSync(chunkRaw));
            } else {
                fullContent += chunkRaw; // legacy
            }
        }
    }

    const { _chunks, ...clean } = base;
    clean.content = fullContent;
    return clean;
}

/**
 * Remove all sync keys for a prompt (base + overflow chunks).
 */
async function removeSyncPrompt(id) {
    if (SyncManager.backend === 'none') return;
    if (SyncManager.backend === 'gist') {
        return SyncManager.triggerGistSync();
    }
    if (SyncManager.backend === 'webdav') {
        return SyncManager.triggerWebdavSync();
    }
    if (SyncManager.backend === 'obsidian') {
        return SyncManager.triggerObsidianSync();
    }
    if (SyncManager.backend === 'obsidian-local') {
        return SyncManager.triggerObsidianLocalSync();
    }

    // Read base to find chunk count (must decompress first)
    const data = await chrome.storage.sync.get(syncKey(id));
    const baseRaw = data[syncKey(id)];
    const keysToRemove = [syncKey(id)];

    if (baseRaw) {
        let base;
        if (typeof baseRaw === 'string' && baseRaw.startsWith('lz::')) {
            base = JSON.parse(decompressFromSync(baseRaw));
        } else {
            base = baseRaw; // legacy
        }

        if (base._chunks) {
            for (let i = 1; i <= base._chunks; i++) {
                keysToRemove.push(contentChunkKey(id, i));
            }
        }
    }

    await chrome.storage.sync.remove(keysToRemove);
}

/**
 * Merge a single synced slim prompt with its local counterpart.
 */
function mergeOne(slim, local) {
    if (!local) return normalizePromptUsage({ ...slim, versions: [], usageCount: 0, lastUsedAt: null, lastUsed: null });
    return normalizePromptUsage({
        ...local,
        ...slim,
        versions: local.versions || [],
        usageCount: local.usageCount || 0,
        lastUsedAt: local.lastUsedAt || null,
        lastUsed: local.lastUsed || null,
    });
}

export const PromptStorage = {
    /**
     * Read all prompts. Merges sync (slim) + local (full).
     * Supports both new per-key format and legacy chunked format.
     */
    async get() {
        await SyncManager.ready();
        if (SyncManager.backend === 'none' || SyncManager.backend === 'gist' || SyncManager.backend === 'webdav' || SyncManager.backend === 'obsidian' || SyncManager.backend === 'obsidian-local') {
            // For Gist/WebDAV/Obsidian backend, the local cache `prompts` IS the single source of truth 
            // after the initial pull completes via SyncManager.
            const prompts = await LocalStorage.get('prompts') || [];
            return prompts.map(normalizePromptUsage);
        }

        // Try new per-key format first
        const indexResult = await chrome.storage.sync.get(P_INDEX);
        const ids = indexResult[P_INDEX];

        if (ids && Array.isArray(ids)) {
            // Build list of all keys to fetch (base + potential chunks)
            const allKeys = [];
            for (const id of ids) allKeys.push(syncKey(id));
            // First pass: get base keys to learn chunk counts
            const baseData = allKeys.length > 0 ? await chrome.storage.sync.get(allKeys) : {};

            // Collect chunk keys needed
            const chunkKeys = [];
            for (const id of ids) {
                const base = baseData[syncKey(id)];
                if (base?._chunks) {
                    for (let i = 1; i <= base._chunks; i++) {
                        chunkKeys.push(contentChunkKey(id, i));
                    }
                }
            }
            // Fetch chunks in one batch if needed
            const chunkData = chunkKeys.length > 0 ? await chrome.storage.sync.get(chunkKeys) : {};
            const allData = { ...baseData, ...chunkData };

            const localPrompts = await LocalStorage.get('prompts') || [];
            const localMap = new Map(localPrompts.map(p => [p.id, p]));
            const seenIds = new Set();

            const prompts = [];
            for (const id of ids) {
                seenIds.add(id);
                const slim = await readSyncPrompt(id, allData);
                if (slim) {
                    prompts.push(mergeOne(slim, localMap.get(id)));
                } else if (localMap.has(id)) {
                    // Sync data missing (write failed) — use local data
                    prompts.push(normalizePromptUsage(localMap.get(id)));
                }
            }

            // Include local-only prompts not in index at all
            for (const local of localMap.values()) {
                if (!seenIds.has(local.id)) {
                    prompts.push(normalizePromptUsage(local));
                }
            }
            return prompts;
        }

        // Fallback: legacy chunked format
        const [syncPrompts, localPrompts] = await Promise.all([
            SyncStorage.get('prompts'),
            LocalStorage.get('prompts'),
        ]);
        return mergePrompts(syncPrompts, localPrompts);
    },

    /**
     * Read a single prompt by ID. Fast path: local-only, no sync merge.
     * @param {string} id - Prompt ID
     * @returns {Promise<object|null>}
     */
    async getById(id) {
        const locals = await LocalStorage.get('prompts') || [];
        return locals.find(p => p.id === id) || null;
    },

    /**
     * Save a new prompt. Local write is guaranteed; sync is best-effort.
     */
    async save(prompt) {
        await SyncManager.ready();
        // Local first (always succeeds)
        const locals = await LocalStorage.get('prompts') || [];
        locals.push(prompt);
        await LocalStorage.set('prompts', locals);

        // Sync: best-effort (p_index only needed for chrome backend)
        try {
            if (SyncManager.backend === 'chrome') {
                await updateSyncStatus('syncing');
                const indexResult = await chrome.storage.sync.get(P_INDEX);
                const ids = indexResult[P_INDEX] || [];
                ids.push(prompt.id);
                await chrome.storage.sync.set({ [P_INDEX]: ids });
            }
            await writeSyncPrompt(prompt);
            if (SyncManager.backend === 'chrome') {
                await updateSyncStatus('synced');
            }
        } catch (e) {
            console.warn(`[PromptStorage] sync save failed for ${prompt.id}, data safe in local:`, e.message);
            if (SyncManager.backend === 'chrome') {
                await updateSyncStatus('failed');
            }
        }
        console.log(`[PromptStorage] save: ${prompt.id}`);
    },

    /**
     * Update an existing prompt. Local write is guaranteed; sync is best-effort.
     */
    async update(prompt) {
        await SyncManager.ready();
        const locals = await LocalStorage.get('prompts') || [];
        const idx = locals.findIndex(p => p.id === prompt.id);
        if (idx >= 0) locals[idx] = prompt; else locals.push(prompt);
        await LocalStorage.set('prompts', locals);

        try {
            if (SyncManager.backend === 'chrome') {
                await updateSyncStatus('syncing');
            }
            await removeSyncPrompt(prompt.id);
            await writeSyncPrompt(prompt);
            if (SyncManager.backend === 'chrome') {
                await updateSyncStatus('synced');
            }
        } catch (e) {
            console.warn(`[PromptStorage] sync update failed for ${prompt.id}:`, e.message);
            if (SyncManager.backend === 'chrome') {
                await updateSyncStatus('failed');
            }
        }
        console.log(`[PromptStorage] update: ${prompt.id}`);
    },

    /**
     * Delete a prompt. Local write is guaranteed; sync is best-effort.
     */
    async delete(id) {
        await SyncManager.ready();
        const locals = await LocalStorage.get('prompts') || [];
        await LocalStorage.set('prompts', locals.filter(p => p.id !== id));

        try {
            if (SyncManager.backend === 'chrome') {
                await updateSyncStatus('syncing');
                const indexResult = await chrome.storage.sync.get(P_INDEX);
                const ids = (indexResult[P_INDEX] || []).filter(i => i !== id);
                await chrome.storage.sync.set({ [P_INDEX]: ids });
            }
            await removeSyncPrompt(id);
            if (SyncManager.backend === 'chrome') {
                await updateSyncStatus('synced');
            }
        } catch (e) {
            console.warn(`[PromptStorage] sync delete failed for ${id}:`, e.message);
            if (SyncManager.backend === 'chrome') {
                await updateSyncStatus('failed');
            }
        }
        console.log(`[PromptStorage] delete: ${id}`);
    },

    /**
     * Bulk set (for import and onInstalled defaults). Writes all prompts one by one.
     */
    async bulkSet(prompts) {
        await SyncManager.ready();
        await LocalStorage.set('prompts', prompts);

        if (SyncManager.backend === 'gist') {
            await SyncManager.triggerGistSync();
            console.log(`[PromptStorage] bulkSet Gist: ${prompts.length} prompts`);
            return;
        }

        if (SyncManager.backend === 'webdav') {
            await SyncManager.triggerWebdavSync();
            console.log(`[PromptStorage] bulkSet WebDAV: ${prompts.length} prompts`);
            return;
        }

        if (SyncManager.backend === 'obsidian') {
            await SyncManager.triggerObsidianSync();
            console.log(`[PromptStorage] bulkSet Obsidian: ${prompts.length} prompts`);
            return;
        }

        if (SyncManager.backend === 'obsidian-local') {
            await SyncManager.triggerObsidianLocalSync();
            console.log(`[PromptStorage] bulkSet Obsidian Local: ${prompts.length} prompts`);
            return;
        }

        // 'none' backend — local only, no remote sync
        if (SyncManager.backend !== 'chrome') {
            console.log(`[PromptStorage] bulkSet local-only: ${prompts.length} prompts`);
            return;
        }

        // Chrome sync: write per-key format
        const ids = prompts.map(p => p.id);
        await chrome.storage.sync.set({ [P_INDEX]: ids });
        for (const p of prompts) {
            await writeSyncPrompt(p);
        }
        console.log(`[PromptStorage] bulkSet Chrome Sync: ${prompts.length} prompts`);
    },

    /**
     * Legacy-compatible set() — full rewrite to per-key format.
     */
    async set(prompts) {
        await LocalStorage.set('prompts', prompts);

        // Only write to chrome.storage.sync for chrome backend
        if (SyncManager.backend === 'chrome') {
            const ids = prompts.map(p => p.id);
            await chrome.storage.sync.set({ [P_INDEX]: ids });
            for (const p of prompts) {
                await writeSyncPrompt(p);
            }
        }
    },
};


// --- Migration: old chunked format → new per-key format ---
export async function migrateToPerKeySync() {
    // Only migrate for chrome backend — other backends don't use per-key sync
    if (SyncManager.backend !== 'chrome') return;

    // Check if already migrated (p_index exists AND has data)
    const indexResult = await chrome.storage.sync.get(P_INDEX);
    if (indexResult[P_INDEX] && indexResult[P_INDEX].length > 0) {
        console.log('[Migration] Already using per-key format');
        return;
    }

    // Local storage is the most reliable data source (no quota issues)
    const localPrompts = await LocalStorage.get('prompts') || [];

    // Also try old chunked sync format
    let oldSyncPrompts = [];
    try {
        oldSyncPrompts = await SyncStorage.get('prompts') || [];
    } catch (e) {
        console.warn('[Migration] Failed to read old sync format:', e);
    }

    // Merge: local is primary, sync supplements
    const merged = localPrompts.length > 0
        ? mergePrompts(oldSyncPrompts, localPrompts)
        : oldSyncPrompts;

    if (merged.length === 0) {
        console.log('[Migration] No data to migrate');
        return;
    }

    // Write to new per-key format (one by one, tolerate individual failures)
    const ids = [];
    for (const p of merged) {
        try {
            await writeSyncPrompt(p);
            ids.push(p.id);
        } catch (e) {
            console.warn(`[Migration] Failed to write prompt ${p.id}:`, e.message);
            // Still include in index — data is in local, sync will catch up later
            ids.push(p.id);
        }
    }
    await chrome.storage.sync.set({ [P_INDEX]: ids });
    await LocalStorage.set('prompts', merged);

    // Clean up old chunked keys ONLY after successful migration
    try {
        await SyncStorage._removeChunks('prompts');
        await chrome.storage.sync.remove('prompts');
    } catch { /* ignore cleanup errors */ }

    console.log(`[Migration] → per-key sync (${ids.length} prompts migrated)`);
}

// Legacy migration wrapper (backward compat for callers)
export async function migrateLocalToSync() {
    await migrateToPerKeySync();
}
