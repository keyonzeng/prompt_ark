/**
 * Client for interacting with GitHub API to fetch repo contents recursively.
 */
export class GitHubClient {
    constructor(token = '') {
        this.baseUrl = 'https://api.github.com';
        this.maxFiles = 50;
        this.scannedFiles = 0;
        this.maxDepth = 10;
        this.token = token; // GitHub PAT for authenticated requests (5000 req/hr vs 60)
    }

    // Build headers with auth token if available (5000 req/hr vs 60)
    _apiHeaders() {
        const headers = { 'Accept': 'application/vnd.github.v3+json' };
        if (this.token) headers['Authorization'] = `token ${this.token}`;
        return headers;
    }

    /**
     * Parses a GitHub URL into owner, repo, and path.
     * Supports:
     * - https://github.com/owner/repo
     * - https://github.com/owner/repo/tree/branch/path
     * - https://github.com/owner/repo/blob/branch/path (treated as single file)
     */
    parseUrl(url) {
        try {
            const u = new URL(url);
            if (u.hostname !== 'github.com') return null;

            const parts = u.pathname.split('/').filter(p => p);
            if (parts.length < 2) return null;

            const owner = parts[0];
            const repo = parts[1];
            let path = '';
            let branch = 'main';
            let branchFromUrl = false;

            // Check for /tree/ or /blob/
            const typeIndex = parts.indexOf('tree');
            const blobIndex = parts.indexOf('blob');
            const index = typeIndex !== -1 ? typeIndex : blobIndex;

            if (index !== -1 && parts.length > index + 2) {
                branch = parts[index + 1];
                branchFromUrl = true;
                path = parts.slice(index + 2).join('/');
            }

            return { owner, repo, path, branch, branchFromUrl, type: blobIndex !== -1 ? 'file' : 'dir' };
        } catch {
            return null;
        }
    }

    /**
     * Scans a GitHub URL recursively for prompt files.
     * @param {string} url - The GitHub URL to scan.
     * @param {function} onProgress - Callback for progress updates (msg).
     * @param {boolean} deepScan - If true, scan deeper (maxDepth=10). If false, shallow (maxDepth=1).
     * @returns {Promise<Array<{path: string, content: string, url: string}>>}
     */
    async scanRecursively(url, onProgress = () => { }, deepScan = true) {
        this.scannedFiles = 0;
        this.maxDepth = deepScan ? 10 : 1;
        const info = this.parseUrl(url);
        if (!info) throw new Error('Invalid GitHub URL');

        onProgress(`Scanning ${info.owner}/${info.repo}...`);

        // Auto-detect default branch via GitHub API if not explicitly in URL
        if (!info.branchFromUrl) {
            try {
                onProgress(`Detecting default branch for ${info.owner}/${info.repo}...`);
                const repoJson = await this._fetchUrl(`${this.baseUrl}/repos/${info.owner}/${info.repo}`);
                if (repoJson) {
                    const repoData = JSON.parse(repoJson);
                    if (repoData.default_branch) {
                        info.branch = repoData.default_branch;
                    }
                }
            } catch { /* fallback to 'main' */ }
        }

        if (info.type === 'file') {
            const content = await this.fetchRawContent(info.owner, info.repo, info.path, info.branch);
            return [{
                path: info.path,
                content,
                url: url
            }];
        }

        // Directory traversal
        const results = [];
        await this._traverse(info.owner, info.repo, info.path, info.branch, 0, results, onProgress);
        return results;
    }

    async _traverse(owner, repo, path, branch, depth, results, onProgress) {
        if (depth > this.maxDepth || this.scannedFiles >= this.maxFiles) return;

        const apiUrl = `${this.baseUrl}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
        try {
            const response = await fetch(apiUrl, { headers: this._apiHeaders() });
            if (!response.ok) {
                if (response.status === 403) throw new Error('Rate limit exceeded. Try again later.');
                return; // Skip invalid paths
            }

            const items = await response.json();
            if (!Array.isArray(items)) {
                // It's a file (if path pointed to a file)
                if (items.type === 'file' && this._isSupportedFile(items.name)) {
                    await this._processFile(items, results, onProgress);
                }
                return;
            }

            for (const item of items) {
                if (this.scannedFiles >= this.maxFiles) break;

                if (item.type === 'file' && this._isSupportedFile(item.name)) {
                    await this._processFile(item, results, onProgress);
                } else if (item.type === 'dir') {
                    await this._traverse(owner, repo, item.path, branch, depth + 1, results, onProgress);
                }
            }

        } catch (error) {
            console.error('Traversal error:', error);
            onProgress(`Error scanning ${path}: ${error.message}`);
        }
    }

    async _processFile(item, results, onProgress) {
        onProgress(`Fetching ${item.name} (${this.scannedFiles + 1}/${this.maxFiles})...`);
        try {
            const content = await this._fetchUrl(item.download_url);
            if (content) {
                results.push({
                    path: item.path,
                    content,
                    url: item.html_url
                });
                this.scannedFiles++;
            }
        } catch (e) {
            console.error(`Failed to fetch ${item.name}`, e);
        }
    }

    async fetchRawContent(owner, repo, path, branch) {
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
        return await this._fetchUrl(rawUrl);
    }

    async _fetchUrl(url) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        try {
            const resp = await fetch(url, { signal: controller.signal });
            clearTimeout(timeout);
            if (!resp.ok) return null;
            return await resp.text();
        } catch (e) {
            clearTimeout(timeout);
            if (e.name === 'AbortError') return null;
            throw e;
        }
    }

    _isSupportedFile(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        return ['md', 'json', 'csv', 'txt', 'yaml', 'yml'].includes(ext);
    }
}
