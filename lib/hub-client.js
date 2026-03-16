// lib/hub-client.js - Prompt Hub registry client
// Handles Index Gist reads/writes and listing Gist registration.
// Architecture: "Index Gist + Listing Gists" (no backend required)

import { PromptScorer } from './scorer.js';

// The Index Gist ID — resolved dynamically at runtime.
// In extension context: stored in chrome.storage.local('hub_index_gist_id')
// In Hub SPA: passed via constructor or URL param
let _indexGistId = '';
const INDEX_FILENAME = 'prompt-ark-hub-index.json';
const LISTING_FILENAME = 'prompt-ark-hub-listing.json';
const HUB_FORMAT = 'prompt-ark-hub';
const HUB_VERSION = 1;
const GITHUB_API = 'https://api.github.com';

/**
 * Get the Index Gist ID from chrome.storage.local (extension context).
 * Falls back to the in-memory cache.
 */
async function getIndexGistId() {
    if (_indexGistId) return _indexGistId;
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        const result = await chrome.storage.local.get('hub_index_gist_id');
        _indexGistId = result.hub_index_gist_id || '';
    }
    return _indexGistId;
}

/**
 * Store the Index Gist ID in chrome.storage.local.
 */
async function setIndexGistId(id) {
    _indexGistId = id;
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await chrome.storage.local.set({ hub_index_gist_id: id });
    }
}

/**
 * Build standard API headers with auth token.
 * @param {string} token - GitHub Personal Access Token
 */
function apiHeaders(token) {
    const h = {
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
    };
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
}

/**
 * Build listing metadata from a prompt object.
 * @param {object} prompt - Full prompt object
 * @returns {object} Listing metadata for the index
 */
function buildListingMeta(prompt, author, authorAvatar) {
    const content = prompt.content || '';
    return {
        title: prompt.title || 'Untitled',
        description: content.replace(/\{\{[^}]+\}\}/g, '___').substring(0, 200),
        category: prompt.category || 'General',
        tags: prompt.tags || [],
        language: detectLanguage(content),
        qualityScore: PromptScorer.score(content),
        tokenEstimate: Math.ceil(content.length / 4),
        variableCount: (content.match(/\{\{([^}]+)\}\}/g) || []).length,
        variables: extractVariableNames(content),
        author: author || 'anonymous',
        authorAvatar: authorAvatar || '',
        type: 'prompt',
    };
}

/**
 * Build a full listing payload for a single prompt.
 * This is stored as the content of the Listing Gist.
 */
function buildListingPayload(prompt, meta) {
    return {
        format: HUB_FORMAT,
        version: HUB_VERSION,
        type: 'prompt',
        listing: {
            title: meta.title,
            description: meta.description,
            category: meta.category,
            tags: meta.tags,
            language: meta.language,
            qualityScore: meta.qualityScore,
            tokenEstimate: meta.tokenEstimate,
            variableCount: meta.variableCount,
            variables: meta.variables,
        },
        stats: {
            upvotes: 0,
            downvotes: 0,
            installCount: 0,
            voters: [],
        },
        prompts: [{
            id: prompt.id,
            title: prompt.title || 'Untitled',
            content: prompt.content || '',
            category: prompt.category || '',
            tags: prompt.tags || [],
            variables: prompt.variables || [],
            createdAt: prompt.createdAt || new Date().toISOString(),
        }],
        pack: null,
    };
}

/**
 * Build a full listing payload for a Prompt Pack.
 */
function buildPackListingPayload(prompts, packTitle, meta) {
    return {
        format: HUB_FORMAT,
        version: HUB_VERSION,
        type: 'pack',
        listing: {
            ...meta,
            title: packTitle,
        },
        stats: {
            upvotes: 0,
            downvotes: 0,
            installCount: 0,
            voters: [],
        },
        prompts: prompts.map(p => ({
            id: p.id,
            title: p.title || 'Untitled',
            content: p.content || '',
            category: p.category || '',
            tags: p.tags || [],
            variables: p.variables || [],
            createdAt: p.createdAt || new Date().toISOString(),
        })),
        pack: {
            title: packTitle,
            count: prompts.length,
        },
    };
}

/** Simple language detection (CJK vs Latin) */
function detectLanguage(text) {
    if (!text) return 'en';
    const cjk = text.match(/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/g);
    return (cjk && cjk.length > text.length * 0.1) ? 'zh' : 'en';
}

/** Extract variable names from prompt content */
function extractVariableNames(content) {
    const matches = content.match(/\{\{([^}]+)\}\}/g) || [];
    return [...new Set(matches.map(m => {
        const inner = m.replace(/\{\{|\}\}/g, '');
        return inner.split(/[:=|]/)[0].trim();
    }))];
}


// ========================
// Hub Client (Public API)
// ========================

export const HubClient = {
    /**
     * Fetch the Hub index (all listing summaries).
     * Works without auth for public Gists.
     * @param {string} [token] - Optional GitHub token for higher rate limits
     * @returns {Promise<{version: number, listings: Array}>}
     */
    async fetchIndex(token, indexGistIdOverride) {
        const indexGistId = indexGistIdOverride || await getIndexGistId();
        if (!indexGistId) {
            return { version: HUB_VERSION, listings: [] };
        }

        const resp = await fetch(`${GITHUB_API}/gists/${indexGistId}`, {
            headers: apiHeaders(token),
        });

        if (!resp.ok) {
            throw new Error(`Failed to fetch Hub index: ${resp.status}`);
        }

        const gist = await resp.json();
        const file = gist.files[INDEX_FILENAME];
        if (!file) {
            return { version: HUB_VERSION, listings: [] };
        }

        return JSON.parse(file.content);
    },

    /**
     * Publish a single prompt to the Hub.
     * 1. Creates a public Listing Gist with the prompt data
     * 2. Registers the listing in the Index Gist
     * @returns {Promise<{gistId: string, hubUrl: string}>}
     */
    async publishPrompt(prompt, token) {
        if (!token) throw new Error('GitHub token required to publish');

        // Step 1: Get author info from GitHub
        const { author, authorAvatar } = await this._fetchAuthorInfo(token);

        // Step 2: Build listing
        const meta = buildListingMeta(prompt, author, authorAvatar);

        // Step 3: Update existing listing if already published
        if (prompt.hubGistId) {
            await this.updateListing(prompt.hubGistId, prompt, token);
            const indexId = await getIndexGistId();
            return {
                gistId: prompt.hubGistId,
                indexGistId: indexId,
                hubUrl: `https://keyonzeng.github.io/prompt_ark/?index=${indexId}&gist=${prompt.hubGistId}`,
                updated: true,
            };
        }

        // Step 4: Create new public Listing Gist
        const payload = buildListingPayload(prompt, meta);
        const resp = await fetch(`${GITHUB_API}/gists`, {
            method: 'POST',
            headers: apiHeaders(token),
            body: JSON.stringify({
                description: `[Prompt Ark Hub] ${meta.title}`,
                public: true,
                files: {
                    [LISTING_FILENAME]: {
                        content: JSON.stringify(payload, null, 2),
                    },
                },
            }),
        });

        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err.message || `GitHub API error: ${resp.status}`);
        }

        const gist = await resp.json();
        const gistId = gist.id;
        const now = new Date().toISOString();

        // Step 5: Register in Index Gist
        await this._registerInIndex(token, {
            gistId,
            title: meta.title,
            category: meta.category,
            tags: meta.tags,
            author,
            authorAvatar,
            qualityScore: meta.qualityScore,
            upvotes: 0,
            downvotes: 0,
            installCount: 0,
            type: 'prompt',
            language: meta.language,
            variableCount: meta.variableCount,
            tokenEstimate: meta.tokenEstimate,
            publishedAt: now,
            updatedAt: now,
        });

        const indexId = await getIndexGistId();
        return {
            gistId,
            indexGistId: indexId,
            hubUrl: `https://keyonzeng.github.io/prompt_ark/?index=${indexId}&gist=${gistId}`,
            updated: false,
        };
    },

    /**
     * Publish a Prompt Pack to the Hub.
     * @param {Array} prompts - Array of prompt objects
     * @param {string} packTitle - Pack title
     * @param {string} token - GitHub token
     * @returns {Promise<{gistId: string, hubUrl: string}>}
     */
    async publishPack(prompts, packTitle, token) {
        if (!token) throw new Error('GitHub token required to publish');

        const { author, authorAvatar } = await this._fetchAuthorInfo(token);

        // Use first prompt for category/tags metadata
        const firstPrompt = prompts[0] || {};
        const meta = buildListingMeta(firstPrompt, author, authorAvatar);
        meta.type = 'pack';
        meta.title = packTitle;

        const payload = buildPackListingPayload(prompts, packTitle, meta);

        const resp = await fetch(`${GITHUB_API}/gists`, {
            method: 'POST',
            headers: apiHeaders(token),
            body: JSON.stringify({
                description: `[Prompt Ark Hub] Pack: ${packTitle} (${prompts.length} prompts)`,
                public: true,
                files: {
                    [LISTING_FILENAME]: {
                        content: JSON.stringify(payload, null, 2),
                    },
                },
            }),
        });

        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err.message || `GitHub API error: ${resp.status}`);
        }

        const gist = await resp.json();
        const gistId = gist.id;
        const now = new Date().toISOString();

        await this._registerInIndex(token, {
            gistId,
            title: packTitle,
            category: meta.category,
            tags: meta.tags,
            author,
            authorAvatar,
            qualityScore: meta.qualityScore,
            upvotes: 0,
            downvotes: 0,
            installCount: 0,
            type: 'pack',
            packCount: prompts.length,
            language: meta.language,
            variableCount: meta.variableCount,
            tokenEstimate: meta.tokenEstimate,
            publishedAt: now,
            updatedAt: now,
        });

        const indexId = await getIndexGistId();
        return {
            gistId,
            indexGistId: indexId,
            hubUrl: `https://keyonzeng.github.io/prompt_ark/?index=${indexId}&gist=${gistId}`,
        };
    },

    /**
     * Update an existing Hub listing Gist (re-publish after edit).
     */
    async updateListing(gistId, prompt, token) {
        if (!token) throw new Error('GitHub token required to update');

        const { author, authorAvatar } = await this._fetchAuthorInfo(token);
        const meta = buildListingMeta(prompt, author, authorAvatar);
        const payload = buildListingPayload(prompt, meta);

        const resp = await fetch(`${GITHUB_API}/gists/${gistId}`, {
            method: 'PATCH',
            headers: apiHeaders(token),
            body: JSON.stringify({
                files: {
                    [LISTING_FILENAME]: {
                        content: JSON.stringify(payload, null, 2),
                    },
                },
            }),
        });

        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err.message || `GitHub API error: ${resp.status}`);
        }

        // Update index entry too
        await this._updateIndexEntry(token, gistId, {
            title: meta.title,
            category: meta.category,
            tags: meta.tags,
            qualityScore: meta.qualityScore,
            updatedAt: new Date().toISOString(),
        });

        return true;
    },

    /**
     * Fetch a full listing from a Listing Gist.
     * @param {string} gistId
     * @param {string} [token]
     */
    async fetchListing(gistId, token) {
        const resp = await fetch(`${GITHUB_API}/gists/${gistId}`, {
            headers: apiHeaders(token),
        });

        if (!resp.ok) throw new Error(`Failed to fetch listing: ${resp.status}`);

        const gist = await resp.json();
        const file = gist.files[LISTING_FILENAME];
        if (!file) throw new Error('Invalid Hub listing Gist');

        const listing = JSON.parse(file.content);
        // Enrich with Gist owner info
        listing._gistOwner = gist.owner?.login || 'anonymous';
        listing._gistOwnerAvatar = gist.owner?.avatar_url || '';
        return listing;
    },

    // --- Internal helpers ---

    /** Fetch authenticated user info from GitHub (cached per session) */
    _authorCache: null,
    async _fetchAuthorInfo(token) {
        if (this._authorCache) return this._authorCache;
        try {
            const resp = await fetch(`${GITHUB_API}/user`, {
                headers: apiHeaders(token),
            });
            if (resp.ok) {
                const user = await resp.json();
                this._authorCache = { author: user.login, authorAvatar: user.avatar_url || '' };
                return this._authorCache;
            }
        } catch (e) {
            console.warn('[HubClient] Failed to fetch author info:', e);
        }
        return { author: 'anonymous', authorAvatar: '' };
    },

    /** Register a new listing entry in the Index Gist */
    async _registerInIndex(token, entry) {
        let indexGistId = await getIndexGistId();

        // Auto-create Index Gist on first publish
        if (!indexGistId) {
            indexGistId = await this._createIndexGist(token);
        }

        // Fetch current index (reuse indexGistId to avoid redundant I/O)
        const index = await this.fetchIndex(token, indexGistId);

        // Append new entry (avoid duplicates by gistId)
        index.listings = index.listings.filter(l => l.gistId !== entry.gistId);
        index.listings.unshift(entry); // Newest first

        // Write back
        const resp = await fetch(`${GITHUB_API}/gists/${indexGistId}`, {
            method: 'PATCH',
            headers: apiHeaders(token),
            body: JSON.stringify({
                files: {
                    [INDEX_FILENAME]: {
                        content: JSON.stringify(index, null, 2),
                    },
                },
            }),
        });
        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(`Index update failed: ${err.message || resp.status}`);
        }
    },

    /** Update a specific entry in the Index Gist */
    async _updateIndexEntry(token, gistId, updates) {
        const indexGistId = await getIndexGistId();
        if (!indexGistId) return;

        try {
            const index = await this.fetchIndex(token);
            const entry = index.listings.find(l => l.gistId === gistId);
            if (entry) {
                Object.assign(entry, updates);
                await fetch(`${GITHUB_API}/gists/${indexGistId}`, {
                    method: 'PATCH',
                    headers: apiHeaders(token),
                    body: JSON.stringify({
                        files: {
                            [INDEX_FILENAME]: {
                                content: JSON.stringify(index, null, 2),
                            },
                        },
                    }),
                });
            }
        } catch (e) {
            console.error('[HubClient] Failed to update index entry:', e);
        }
    },

    /** Auto-create the Hub Index Gist (called on first publish) */
    async _createIndexGist(token) {
        console.log('[HubClient] Creating Hub Index Gist...');
        const initialIndex = {
            format: HUB_FORMAT,
            version: HUB_VERSION,
            listings: [],
            createdAt: new Date().toISOString(),
        };

        const resp = await fetch(`${GITHUB_API}/gists`, {
            method: 'POST',
            headers: apiHeaders(token),
            body: JSON.stringify({
                description: '[Prompt Ark Hub] Community Prompt Registry Index',
                public: true,
                files: {
                    [INDEX_FILENAME]: {
                        content: JSON.stringify(initialIndex, null, 2),
                    },
                },
            }),
        });

        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(`Failed to create Index Gist: ${err.message || resp.status}`);
        }

        const gist = await resp.json();
        const newId = gist.id;
        await setIndexGistId(newId);
        console.log(`[HubClient] Index Gist created: ${newId}`);
        return newId;
    },

    /** Set Index Gist ID externally (e.g., from hub-app.js URL param) */
    setIndexGistId(id) {
        _indexGistId = id;
    },
};
