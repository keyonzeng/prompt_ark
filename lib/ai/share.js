// lib/ai/share.js — Share content generation + social platform definitions
import { fetchWithTimeout, getActiveProvider } from './provider.js';
import { callGeminiWeb } from '../gemini-web.js';
import { loadPrompt } from '../prompt-loader.js';

export const SHARE_PLATFORM_NAMES = ['twitter', 'reddit', 'zhihu', 'wechat', 'xiaohongshu', 'linkedin'];

// Social platform editor configs for auto-inject (verified via browser inspection)
export const SOCIAL_EDITORS = {
    zhihu: {
        url: 'https://zhuanlan.zhihu.com/write',
        titleSelectors: ['textarea.WriteIndex-titleInput', 'textarea[placeholder*="标题"]'],
        contentSelectors: ['.public-DraftEditor-content', '.Editable-content', '[contenteditable="true"]'],
        publishSelector: 'button.PublishPanel-stepOneButton, button[data-tooltip="发布"]',
    },
    wechat: {
        url: 'https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit_v2&action=edit&isNew=1&type=77&createType=0',
        titleSelectors: ['textarea#title', 'textarea.js_title', 'textarea[placeholder*="标题"]'],
        contentSelectors: ['div.ProseMirror', '[contenteditable="true"]'],
        abstractSelectors: ['textarea#js_description'],
        publishSelector: 'button#js_send, a.preview_send_btn',
    },
    xiaohongshu: {
        url: 'https://creator.xiaohongshu.com/publish/publish?from=menu&target=article',
        preClickSelector: 'button.new-btn', // Must click "新的创作" first
        titleSelectors: ['textarea.d-text[placeholder="输入标题"]', 'textarea[placeholder*="标题"]'],
        contentSelectors: ['.tiptap.ProseMirror', '.ProseMirror', '[contenteditable="true"]'],
        publishSelector: 'button.el-button--primary, button:has(.publishBtn)',
    },
    linkedin: {
        url: 'https://www.linkedin.com/feed/?shareActive=true',
        titleSelectors: [],
        contentSelectors: ['div.ql-editor[contenteditable="true"]', '[role="textbox"][aria-multiline="true"]', '[contenteditable="true"]'],
        publishSelector: 'button.share-actions__primary-action, button.share-box-scaffold__primary-btn',
    },
};

// Variant labels for UI
export const VARIANT_LABELS = ['concise', 'contract', 'full-spec'];

// Article sharing platforms and their language config
export const ARTICLE_SHARE_PLATFORMS = {
    zhihu: { promptName: 'share-article-zhihu', lang: 'zh' },
    reddit: { promptName: 'share-article-reddit', lang: 'en' },
    wechat: { promptName: 'share-article-wechat', lang: 'zh' },
    linkedin: { promptName: 'share-article-linkedin', lang: 'en' },
    xiaohongshu: { promptName: 'share-article-xiaohongshu', lang: 'zh' },
    twitter: { promptName: 'share-article-twitter', lang: 'en' },
};

export function buildFallbackText(platform, title, url, prompt = {}) {
    if (platform === 'zhihu') {
        const content = prompt.content || '';
        const preview = content.replace(/\{\{[^}]+\}\}/g, '___').substring(0, 150);
        const varCount = (content.match(/\{\{([^}]+)\}\}/g) || []).length;
        
        return `# ${title}

很多人用AI的效果不好，核心原因往往不是AI不行，而是prompt写得太随意。

一个好的prompt通常包含三个要素：**角色设定**、**任务约束**、**输出格式**。

${preview.length > 20 ? `\n以这个prompt为例：\n\n> ${preview}...\n` : ''}
${varCount > 0 ? `它还设计了${varCount}个变量插槽，可以根据不同场景快速填入。\n` : ''}
---
完整prompt模板：${url}`;
    }
    
    if (platform === 'wechat') {
        const category = prompt.category || 'AI';
        
        return `## 用AI提效，关键不在工具，在方法

你有没有遇到过这种情况：同样用ChatGPT，别人几分钟搞定的事，你来回改了半小时还不满意？

差距不在AI，在于怎么跟它"说话"。今天分享3个立刻能用的技巧：

## 技巧一：先给AI一个身份

与其说"帮我写个方案"，不如说"你是一位有10年经验的${category}专家"。给AI角色设定，输出质量会有质的提升。

## 技巧二：约束输出格式

直接说"用markdown表格对比3个方案的优劣势"，比"分析一下"清晰100倍。AI最怕模糊指令。

## 技巧三：用现成的好模板

「${title}」就是一个设计好的prompt模板，把上面两个技巧都融入了结构里，填入变量就能直接用。

---

完整prompt模板 → ${url}`;
    }
    
    if (platform === 'xiaohongshu') {
        const category = prompt.category || 'AI';
        
        return `3个让${category}效率翻倍的AI使用技巧 🔥

📌 技巧1：给AI一个专业身份
不要 说"帮我写"，而是说"你是XX领域专家"
效果立刻不一样！

💡 技巧2：指定输出格式
"用表格对比" > "分析一下"
AI最怕你说得不清楚

✅ 技巧3：用好prompt模板
「${title}」就是一个现成的好模板
角色+约束+格式都设计好了

⚡ 这3个方法不管用哪个AI都有效
ChatGPT / Gemini / Claude 通吃

💬 完整prompt模板 → 链接见评论区`;
    }
    
    return '';
}

export async function generateShareText(promptContent, title, url, platform) {
    const provider = await getActiveProvider();
    if (!provider) return null;

    if (!SHARE_PLATFORM_NAMES.includes(platform)) return null;
    const systemPrompt = await loadPrompt(`share-${platform}`);

    const userContent = JSON.stringify({
        title,
        content: promptContent.substring(0, 800),
        url,
    });

    // Determine expected output schema based on platform
    const isReddit = platform === 'reddit';
    const schemaProps = isReddit
        ? {
            title: { type: 'string', description: 'Reddit post title' },
            body: { type: 'string', description: 'Reddit post body in markdown' },
        }
        : { text: { type: 'string', description: 'Generated share content' } };
    const schemaRequired = isReddit ? ['title', 'body'] : ['text'];

    try {
        if (provider.type === 'gemini') {
            const model = provider.model || 'gemini-2.0-flash';
            const resp = await fetchWithTimeout(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': provider.apiKey },
                    body: JSON.stringify({
                        systemInstruction: { parts: [{ text: systemPrompt }] },
                        contents: [{ parts: [{ text: userContent }] }],
                        generationConfig: {
                            responseModalities: ['TEXT'],
                            responseMimeType: 'application/json',
                            responseSchema: {
                                type: 'object',
                                properties: schemaProps,
                                required: schemaRequired,
                            },
                        },
                    }),
                }
            );
            if (!resp.ok) throw new Error(`Gemini API ${resp.status}`);
            const data = await resp.json();
            const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
            return raw ? JSON.parse(raw) : null;
        }

        if (provider.type === 'openai') {
            const jsonHint = isReddit
                ? 'Return JSON only: {"title":"...","body":"..."}'
                : 'Return JSON only: {"text":"..."}';
            const resp = await fetchWithTimeout(`${provider.apiUrl}/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${provider.apiKey}` },
                body: JSON.stringify({
                    model: provider.model || 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: systemPrompt + '\n\n' + jsonHint },
                        { role: 'user', content: userContent },
                    ],
                    response_format: { type: 'json_object' },
                }),
            });
            if (!resp.ok) throw new Error(`OpenAI API ${resp.status}`);
            const data = await resp.json();
            const raw = data.choices?.[0]?.message?.content;
            return raw ? JSON.parse(raw) : null;
        }

        if (provider.type === 'gemini-web') {
            const jsonHint = isReddit
                ? 'Return JSON only: {"title":"...","body":"..."}'
                : 'Return JSON only: {"text":"..."}';
            const webPrompt = `${systemPrompt}\n\n${jsonHint}\n\nPrompt data:\n\`\`\`\n${userContent}\n\`\`\``;
            let result = await callGeminiWeb(webPrompt);
            result = result.replace(/https?:\/\/[^\s]*googleusercontent\.com\/image_generation_content[^\s]*/g, '').trim();
            const jsonMatch = result.match(/\{[\s\S]*\}/);
            return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        }
    } catch (e) {
        console.error('[generateShareText] Error:', e);
        return null;
    }

    return null;
}

/**
 * Generate article share text by rewriting source content for a social platform.
 * Uses platform-specific prompt with embedded humanization rules.
 * @param {string} sourceText - Raw text from page selection or body
 * @param {string} platform - One of ARTICLE_SHARE_PLATFORMS keys
 * @returns {Promise<{title?: string, body: string} | null>}
 */
export async function generateArticleShareText(sourceText, platform) {
    const platformConfig = ARTICLE_SHARE_PLATFORMS[platform];
    if (!platformConfig) return null;

    const provider = await getActiveProvider();
    if (!provider) return null;

    const systemPrompt = await loadPrompt(platformConfig.promptName);
    // Truncate source text to avoid exceeding context limits
    const userContent = sourceText.substring(0, 8000);




    const schemaProps = {
        title: { type: 'string', description: 'Article title' },
        body: { type: 'string', description: 'Article body' },
    };

    try {
        if (provider.type === 'gemini') {
            const model = provider.model || 'gemini-2.0-flash';
            const resp = await fetchWithTimeout(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': provider.apiKey },
                    body: JSON.stringify({
                        systemInstruction: { parts: [{ text: systemPrompt }] },
                        contents: [{ parts: [{ text: userContent }] }],
                        generationConfig: {
                            responseModalities: ['TEXT'],
                            responseMimeType: 'application/json',
                            responseSchema: {
                                type: 'object',
                                properties: schemaProps,
                                required: ['body'],
                            },
                        },
                    }),
                }
            );
            if (!resp.ok) throw new Error(`Gemini API ${resp.status}`);
            const data = await resp.json();
            const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
            return raw ? JSON.parse(raw) : null;
        }

        if (provider.type === 'openai') {
            const jsonHint = 'Return JSON only: {"title":"...","body":"..."}';
            const resp = await fetchWithTimeout(`${provider.apiUrl}/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${provider.apiKey}` },
                body: JSON.stringify({
                    model: provider.model || 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: systemPrompt + '\n\n' + jsonHint },
                        { role: 'user', content: userContent },
                    ],
                    response_format: { type: 'json_object' },
                }),
            });
            if (!resp.ok) throw new Error(`OpenAI API ${resp.status}`);
            const data = await resp.json();
            const raw = data.choices?.[0]?.message?.content;
            return raw ? JSON.parse(raw) : null;
        }

        if (provider.type === 'gemini-web') {
            const jsonHint = 'Return JSON only: {"title":"...","body":"..."}';
            const webPrompt = `${systemPrompt}\n\n${jsonHint}\n\nSource content to rewrite:\n\`\`\`\n${userContent}\n\`\`\``;
            let result = await callGeminiWeb(webPrompt);
            result = result.replace(/https?:\/\/[^\s]*googleusercontent\.com\/image_generation_content[^\s]*/g, '').trim();
            const jsonMatch = result.match(/\{[\s\S]*\}/);
            return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        }
    } catch (e) {
        console.error('[generateArticleShareText] Error:', e);
        return null;
    }

    return null;
}

/**
 * Inject share content into a social media editor tab.
 * Encapsulates the entire multi-step MAIN world injection pipeline.
 * @returns {Promise<string>} Generated share text
 */
export async function shareToSocialPlatform({ content, title, url, platform, fallbackText, skipGenerate }, sendResponse) {
    const editor = SOCIAL_EDITORS[platform];
    if (!editor) {
        sendResponse({ success: false, error: 'Unsupported platform' });
        return;
    }

    // Generate share text via LLM (skip if caller already generated content, e.g. article share)
    let shareText = fallbackText || '';
    if (!skipGenerate) {
        try {
            const result = await generateShareText(content, title, url, platform);
            if (result?.text) shareText = result.text;
        } catch (e) {
            console.warn('[SHARE_TO_PLATFORM] LLM failed, using fallback:', e);
        }
    }

    // Open the editor tab
    const newTab = await chrome.tabs.create({ url: editor.url });

    // Multi-step injection function — runs in page's MAIN world
    const injectInMainWorld = async (tabId) => {
        const editorConfig = { ...editor, shareText, promptTitle: title };
        await chrome.scripting.executeScript({
            target: { tabId },
            world: 'MAIN',
            func: (config) => {
                const delay = (ms) => new Promise(r => setTimeout(r, ms));

                const findEl = (selectors) => {
                    for (const sel of selectors) {
                        const el = document.querySelector(sel);
                        if (el) return el;
                    }
                    return null;
                };

                const fillInput = async (el, text) => {
                    if (!el) return false;
                    el.focus();
                    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
                        const nativeSetter = Object.getOwnPropertyDescriptor(
                            window.HTMLTextAreaElement.prototype, 'value'
                        )?.set || Object.getOwnPropertyDescriptor(
                            window.HTMLInputElement.prototype, 'value'
                        )?.set;
                        if (nativeSetter) nativeSetter.call(el, text);
                        else el.value = text;
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                        el.dispatchEvent(new Event('change', { bubbles: true }));
                    } else {
                        // Contenteditable (Draft.js, ProseMirror, Tiptap)
                        el.focus();
                        el.click();

                        // Method 1: Simulated paste event (works with Draft.js)
                        try {
                            const htmlText = text.replace(/\n/g, '<br>');
                            const dt = new DataTransfer();
                            dt.setData('text/plain', text);
                            dt.setData('text/html', `<p>${htmlText}</p>`);
                            const pasteEvent = new ClipboardEvent('paste', {
                                bubbles: true, cancelable: true, clipboardData: dt
                            });
                            el.dispatchEvent(pasteEvent);
                        } catch (e) {
                            // Method 2: execCommand fallback (ProseMirror/Tiptap)
                            document.execCommand('selectAll', false, null);
                            document.execCommand('insertText', false, text);
                        }

                        // Method 3: If still empty, direct innerHTML assignment
                        await delay(300);
                        if (el.textContent.trim().length < 10) {
                            const htmlContent = text.split('\n')
                                .map(line => `<p>${line || '<br>'}</p>`).join('');
                            el.innerHTML = htmlContent;
                            el.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                    }
                    return true;
                };

                (async () => {
                    // Step 1: PreClick (小红书 "新的创作")
                    if (config.preClickSelector) {
                        const btn = document.querySelector(config.preClickSelector);
                        if (btn) {
                            btn.click();
                            await delay(2000);
                        }
                    }

                    // Step 2: Extract title from content first line
                    let titleText = config.promptTitle || '';
                    let bodyText = config.shareText;
                    const lines = config.shareText.split('\n');
                    if (lines.length > 1 && lines[0].length < 100) {
                        titleText = lines[0].replace(/^#+\s*/, '').trim();
                        bodyText = lines.slice(1).join('\n').trim();
                    }

                    // Step 3: Fill title
                    const titleEl = findEl(config.titleSelectors);
                    const titleFilled = fillInput(titleEl, titleText);
                    if (titleFilled) await delay(500);

                    // Step 4: Fill content body
                    const contentEl = findEl(config.contentSelectors);
                    const contentText = titleFilled ? bodyText : config.shareText;
                    fillInput(contentEl, contentText);
                    await delay(500);

                    // Step 5: Highlight publish button (don't click!)
                    if (config.publishSelector) {
                        const pubBtn = findEl([config.publishSelector]);
                        if (pubBtn) {
                            pubBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            pubBtn.style.cssText += ';box-shadow:0 0 12px 4px rgba(59,130,246,0.7);border:2px solid #3b82f6;transition:box-shadow 0.3s;';
                            let on = true;
                            const pulse = setInterval(() => {
                                pubBtn.style.boxShadow = on
                                    ? '0 0 20px 6px rgba(59,130,246,0.9)'
                                    : '0 0 12px 4px rgba(59,130,246,0.5)';
                                on = !on;
                            }, 800);
                            setTimeout(() => clearInterval(pulse), 10000);
                        }
                    }

                    // Step 6: Copy to clipboard as backup
                    try { await navigator.clipboard.writeText(config.shareText); } catch (e) { }
                })();
            },
            args: [editorConfig],
        });
    };

    // Wait for tab to load, then inject in MAIN world
    const listener = async (tabId, changeInfo) => {
        if (tabId === newTab.id && changeInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            // Wait for SPA hydration
            setTimeout(async () => {
                try {
                    await injectInMainWorld(tabId);
                } catch (e) {
                    console.warn('[SHARE_TO_PLATFORM] MAIN world injection failed, trying content script:', e);
                    try {
                        await chrome.tabs.sendMessage(tabId, {
                            type: 'INSERT_SHARE_CONTENT',
                            content: shareText,
                            promptTitle: title,
                            titleSelectors: editor.titleSelectors,
                            contentSelectors: editor.contentSelectors,
                            preClickSelector: editor.preClickSelector || null,
                        });
                    } catch (e2) {
                        console.error('[SHARE_TO_PLATFORM] Both injection methods failed:', e2);
                    }
                }
            }, 3000);
        }
    };
    chrome.tabs.onUpdated.addListener(listener);

    sendResponse({ success: true, text: shareText });
}
