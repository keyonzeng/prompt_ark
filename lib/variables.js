// lib/variables.js — Variable parsing, classification, and context resolution

/**
 * Parse a single variable spec: "name:opt1|opt2" → { name, type, options, default, raw }
 */
export function parseVariableSpec(rawName) {
    if (rawName.startsWith('@')) {
        return { name: rawName, type: 'context', raw: rawName };
    }
    const colonIdx = rawName.indexOf(':');
    if (colonIdx === -1) {
        return { name: rawName, type: 'text', default: null, raw: rawName };
    }
    const name = rawName.substring(0, colonIdx).trim();
    const rest = rawName.substring(colonIdx + 1);
    if (rest.includes('|')) {
        const options = rest.split('|').map(o => o.trim()).filter(o => o.length > 0);
        if (options.length >= 2) {
            return { name, type: 'enum', options, default: options[0], raw: rawName };
        }
    }
    // Single value after colon = default value
    const defaultVal = rest.trim();
    if (defaultVal.length > 0) {
        return { name, type: 'default', default: defaultVal, raw: rawName };
    }
    // Empty after colon — treat as plain text
    return { name, type: 'text', default: null, raw: rawName };
}

/**
 * Extract and parse all variables from content. Returns structured objects.
 */
export function extractVariables(content) {
    const rawMatches = [];

    // Match {{Variable}} or {{name:opt1|opt2}}
    const brackets = content.match(/\{\{([^}]+)\}\}/g);
    if (brackets) {
        rawMatches.push(...brackets.map(m => m.slice(2, -2).trim()));
    }

    // Match [Variable] (no colon/enum support for bracket syntax)
    const squares = content.match(/\[([a-zA-Z][a-zA-Z0-9_\s]*)\](?!\()/g);
    if (squares) {
        rawMatches.push(...squares.map(m => m.slice(1, -1).trim()));
    }

    // Dedupe by raw string, parse each
    const seen = new Set();
    return rawMatches
        .filter(v => v.length > 0 && !seen.has(v) && seen.add(v))
        .map(parseVariableSpec);
}

/**
 * Separate context vars from user vars (based on parsed type)
 */
export function classifyVariables(varSpecs) {
    const context = varSpecs.filter(v => v.type === 'context');
    const user = varSpecs.filter(v => v.type !== 'context');
    return { context, user };
}

/**
 * Resolve all {{@...}} context variables in content
 */
export async function resolveContextVariables(content) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const resolvedMap = {};

    // Detect which context vars are actually used
    const used = (content.match(/\{\{@([a-zA-Z_]+)\}\}/g) || [])
        .map(m => m.slice(2, -2).trim());
    const uniqueUsed = [...new Set(used)];
    if (uniqueUsed.length === 0) return { resolved: content, resolvedMap };

    // Resolve all vars in parallel where possible
    const resolvers = uniqueUsed.map(async (varName) => {
        try {
            switch (varName) {
                case '@clipboard':
                    return [varName, null];
                case '@selection':
                    if (tab?.id) {
                        const selResp = await chrome.tabs.sendMessage(tab.id, { type: 'GET_SELECTION' }).catch(() => null);
                        return [varName, selResp?.text || ''];
                    }
                    return [varName, ''];
                case '@page_url':
                    return [varName, tab?.url || ''];
                case '@page_title':
                    return [varName, tab?.title || ''];
                case '@page_text':
                    if (tab?.id) {
                        const textResp = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_TEXT' }).catch(() => null);
                        return [varName, textResp?.text || ''];
                    }
                    return [varName, ''];
                case '@date':
                    return [varName, new Date().toISOString().split('T')[0]];
                case '@lang': {
                    const data = await chrome.storage.sync.get({ language: 'zh_CN' });
                    return [varName, data.language];
                }
                default:
                    return [varName, null];
            }
        } catch (e) {
            console.error(`[ContextVar] Failed to resolve ${varName}:`, e);
            return [varName, ''];
        }
    });

    const results = await Promise.all(resolvers);

    let resolved = content;
    for (const [varName, value] of results) {
        if (value === null) continue;
        resolvedMap[varName] = value;
        resolved = resolved.split(`{{${varName}}}`).join(value);
    }

    return { resolved, resolvedMap };
}

/**
 * Simple prompt composition (content override or default)
 */
export function composePrompt(prompt, contentOverride = null) {
    return contentOverride || prompt.content;
}
