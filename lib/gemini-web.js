/**
 * Gemini Web Driver — calls Gemini via browser session (no API key needed).
 * User must be logged in to gemini.google.com.
 *
 * Protocol updated 2026-03-05:
 * - `at` (SNlM0e) token is STILL required in POST body
 * - x-goog-ext-525001261-jspb now carries a traceId (16-char hex) that must match f.req inner[4]
 * - x-goog-ext-525005358-jspb carries a random UUID that must match f.req inner[59]
 * - f.req inner array is extensively expanded (>60 indices) but most are null/fixed
 * - URL requires bl, f.sid, hl, _reqid, rt
 */

// --- Model Registry ---
const GEMINI_WEB_MODELS = {
    'gemini-3-flash': '9ec249fc9ad08861',
    'gemini-3-flash-thinking': '4af6c7f5da75d65d',
    'gemini-3-pro': '9d8ca3786ebdfbea',
};

const DEFAULT_WEB_MODEL = 'gemini-3-flash';

// --- Credential Cache ---
let _credentialCache = null;
let _credentialTimestamp = 0;
const CREDENTIAL_TTL_MS = 5 * 60 * 1000; // 5 minutes

// --- Utilities ---

/**
 * Extract a WIZ data value from Gemini page HTML.
 * Looks for patterns like "KEY":"<value>" in the page source.
 */
function extractWizValue(key, html) {
    const regex = new RegExp(`"${key}":"([^"]+)"`);
    const match = regex.exec(html);
    return match?.[1] || null;
}

/** Build cookie header for Edge/non-Chrome environments */
async function getGeminiCookieHeader() {
    try {
        if (!chrome?.cookies?.getAll) return '';
        const cookies = await chrome.cookies.getAll({ domain: '.google.com', url: 'https://gemini.google.com' });
        if (!cookies.length) return '';
        return cookies.map(c => `${c.name}=${c.value}`).join('; ');
    } catch {
        return '';
    }
}

/** Fetch with cookies attached explicitly (Edge SW compat) */
async function fetchWithCookies(url, options = {}, timeoutMs = 30000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const cookieHeader = await getGeminiCookieHeader();
        if (cookieHeader) {
            options.headers = { ...(options.headers || {}), 'Cookie': cookieHeader };
        }
        options.credentials = 'include';
        options.signal = controller.signal;
        return await fetch(url, options);
    } finally {
        clearTimeout(timer);
    }
}

/** Generate a random 16-char lowercase hex string (trace ID) */
function randomHex16() {
    return Array.from(crypto.getRandomValues(new Uint8Array(8)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// ---  Credential Fetching ---

/**
 * Fetch authentication credentials from gemini.google.com.
 * Returns { atValue, blValue, fSid, authUser }.
 * Throws 'NOT_LOGGED_IN' if user is not signed in.
 */
export async function fetchGeminiWebCredentials(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && _credentialCache && (now - _credentialTimestamp) < CREDENTIAL_TTL_MS) {
        return _credentialCache;
    }

    console.log('[Gemini Web] Fetching credentials from gemini.google.com...');

    const resp = await fetchWithCookies('https://gemini.google.com/app', { method: 'GET' });
    if (!resp.ok) {
        throw new Error(`Failed to reach gemini.google.com: ${resp.status}`);
    }

    const html = await resp.text();

    // Detect hard login-wall redirect
    if (!html.includes('WIZ_global_data') && (html.includes('accounts.google.com') || html.includes('"SignIn"'))) {
        throw new Error('NOT_LOGGED_IN');
    }

    const atValue = extractWizValue('SNlM0e', html); // XSRF token — still required in POST body
    const blValue = extractWizValue('cfb2h', html); // build label — goes in ?bl= URL param
    const fSid = extractWizValue('FdrFJe', html); // session ID  — goes in ?f.sid= URL param

    if (!atValue) {
        // SNlM0e missing most likely means we hit a guest/not-fully-loaded page
        throw new Error('NOT_LOGGED_IN');
    }

    _credentialCache = { atValue, blValue: blValue || '', fSid: fSid || '', authUser: '0' };
    _credentialTimestamp = now;

    console.log('[Gemini Web] Credentials: at=ok, bl=', !!blValue, 'f.sid=', !!fSid);
    return _credentialCache;
}

// --- Response Parsing ---

/**
 * Parse a single response line from the StreamGenerate endpoint.
 * Returns { text, thoughts } or null.
 */
function parseStreamLine(line) {
    try {
        const clean = line.replace(/^\)\]\}'/, '').trim();
        if (!clean) return null;

        const envelope = JSON.parse(clean);
        if (!Array.isArray(envelope)) return null;

        for (const item of envelope) {
            if (!Array.isArray(item) || item.length < 3 || typeof item[2] !== 'string') continue;
            try {
                const payload = JSON.parse(item[2]);
                if (!Array.isArray(payload) || payload.length < 5) continue;

                const candidates = payload[4];
                if (!Array.isArray(candidates) || !candidates[0]) continue;

                const candidate = candidates[0];
                if (!Array.isArray(candidate) || candidate.length < 2) continue;

                let text = '';
                const textNode = candidate[1];
                if (Array.isArray(textNode) && typeof textNode[0] === 'string') {
                    text = textNode[0];
                }

                let thoughts = null;
                if (candidate[37]?.[0] && Array.isArray(candidate[37][0]) && typeof candidate[37][0][0] === 'string') {
                    thoughts = candidate[37][0][0];
                }

                return { text, thoughts };
            } catch { /* skip unparseable payload */ }
        }
    } catch { /* skip non-JSON lines */ }

    return null;
}

// --- Public API ---

/**
 * Call Gemini Web API and return the full text response.
 * @param {string} prompt
 * @param {string} [model]
 * @returns {Promise<string>}
 */
export async function callGeminiWeb(prompt, model = DEFAULT_WEB_MODEL) {
    return _callGeminiWebInner(prompt, model, false);
}

async function _callGeminiWebInner(prompt, model, _retrying) {
    const creds = await fetchGeminiWebCredentials();

    // Per-request correlation tokens — must be synchronized across header and f.req body
    const traceId = randomHex16();           // matches x-goog-ext-525001261-jspb[4] AND f.req inner[4]
    const requestId = crypto.randomUUID().toUpperCase(); // matches x-goog-ext-525005358-jspb[0] AND f.req inner[59]

    const modelTraceId = GEMINI_WEB_MODELS[model] || GEMINI_WEB_MODELS[DEFAULT_WEB_MODEL];

    // Build f.req inner payload — sparse array with >60 indices
    // Only populate the fields the server validates: [0] prompt, [1] lang, [4] traceId, [59] uuid
    const inner = new Array(68).fill(null);
    inner[0] = [prompt, 0, null, null, null, null, 0]; // prompt tuple
    inner[1] = ['en'];                                  // language
    inner[4] = traceId;                                 // must match header trace
    inner[6] = [0];
    inner[7] = 1;
    inner[10] = 1;
    inner[30] = [4];
    inner[41] = [2];
    inner[59] = requestId;                               // must match header UUID
    inner[68 - 1] = 1;                                   // index 67

    const fReq = JSON.stringify([null, JSON.stringify(inner)]);

    // URL query params
    const queryParams = new URLSearchParams({
        bl: creds.blValue,
        hl: 'en-US',
        _reqid: String(Math.floor(Math.random() * 900000) + 100000),
        rt: 'c',
    });
    if (creds.fSid) queryParams.set('f.sid', creds.fSid);

    const endpoint = `https://gemini.google.com/u/${creds.authUser}/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate?${queryParams}`;

    console.log(`[Gemini Web] model=${model} traceId=${traceId} uuid=${requestId.substring(0, 8)}...`);

    const response = await fetchWithCookies(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
            'X-Same-Domain': '1',
            'X-Goog-AuthUser': creds.authUser,
            // Model selector header — traceId in position [4] must match f.req inner[4]
            'x-goog-ext-525001261-jspb': `[1,null,null,null,"${modelTraceId}",null,null,0,[4],null,null,2]`,
            // Request ID header — UUID in position [0] must match f.req inner[59]
            'x-goog-ext-525005358-jspb': `["${requestId}",1]`,
            'Origin': 'https://gemini.google.com',
            'Referer': 'https://gemini.google.com/',
        },
        body: new URLSearchParams({
            at: creds.atValue, // SNlM0e — XSRF token, still required
            'f.req': fReq,
        }),
    });

    if (!response.ok) {
        if (response.status === 401 || response.status === 403) _credentialCache = null;
        throw new Error(`Gemini Web API error: ${response.status}`);
    }

    const body = await response.text();

    // Login-redirect detection
    if (body.includes('<!DOCTYPE html>') || body.includes('<html') || body.includes('"SignIn"')) {
        _credentialCache = null;
        throw new Error('NOT_LOGGED_IN');
    }

    // Parse line-by-line, keep last valid result
    let finalResult = null;
    for (const line of body.split('\n')) {
        const parsed = parseStreamLine(line);
        if (parsed) finalResult = parsed;
    }

    if (!finalResult) {
        if (!_retrying) {
            console.warn('[Gemini Web] Empty response — retrying with fresh credentials...');
            _credentialCache = null;
            return _callGeminiWebInner(prompt, model, true);
        }
        throw new Error('No valid response from Gemini Web');
    }

    console.log(`[Gemini Web] Response: ${finalResult.text.length} chars`);
    return finalResult.text;
}

/**
 * Check if Gemini Web session is active.
 * @returns {Promise<boolean>}
 */
export async function isGeminiWebAvailable() {
    try {
        await fetchGeminiWebCredentials();
        return true;
    } catch {
        return false;
    }
}
