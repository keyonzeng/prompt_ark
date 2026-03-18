// lib/popup/share-manager.js - Hub sharing, social panel, and Pack mode
import { i18n } from '../../i18n-manager.js';
import { showToast } from './utils.js';
import { HUB_URL } from '../supabase/config.js';
import { buildFallbackText } from '../ai/share.js';

/**
 * ShareManager handles prompt sharing via GitHub Gist,
 * social sharing panel, and Prompt Pack selection mode.
 * SRP: All share/export-to-external workflows.
 */
export class ShareManager {
    constructor({ getPrompts }) {
        this._getPrompts = getPrompts;
        this._shareUrl = null;
        this._shareTitle = null;
        this._sharePromptId = null;
        this._packMode = false;
        this._packSelected = null;
    }

    async _storePendingIntent(action, promptData) {
        const pendingIntent = {
            action,
            promptData,
            timestamp: Date.now()
        };
        await chrome.storage.local.set({ pendingIntent });
    }

    _redirectToLogin() {
        const loginUrl = `${HUB_URL}/?source=extension&action=login`;
        chrome.tabs.create({ url: loginUrl });
    }

    async _handleNotLoggedIn(action, prompt, platform = null) {
        if (platform === 'json') {
            if (prompt) {
                const json = JSON.stringify({ title: prompt.title, content: prompt.content, category: prompt.category, tags: prompt.tags }, null, 2);
                await navigator.clipboard.writeText(json);
                showToast(i18n.t('jsonCopied'));
            }
            this.hideSharePanel();
            return;
        }
        
        const promptData = platform 
            ? { ...prompt, platform }
            : prompt;
        await this._storePendingIntent(action, promptData);
        
        const message = platform 
            ? i18n.t('loginRequiredForShare')
            : i18n.t('loginRequiredForPublish');
        
        if (confirm(`${message}\n\n${i18n.t('loginRedirectHint')}`)) {
            this._redirectToLogin();
            this.hideSharePanel();
        }
    }

    /** @returns {boolean} Whether pack mode is active */
    get isPackMode() { return this._packMode; }

    /**
     * Share a single prompt - JIT mode (no network request until user action)
     * @param {string} id - Prompt ID
     */
    sharePrompt(id) {
        const prompts = this._getPrompts();
        const prompt = prompts.find(p => p.id === id);
        this.showSharePanel(null, prompt?.title || 'Untitled Prompt', id);
    }

    /**
     * Show the floating share panel with social options.
     * @param {string} url - Hub URL (can be null for JIT mode)
     * @param {string} title - Prompt title
     */
    showSharePanel(url, title, promptId = null) {
        this._shareUrl = url;
        this._shareTitle = title;
        this._sharePromptId = promptId;
        document.getElementById('sharePanelTitle').textContent = `${i18n.t('sharePrompt')} "${title}"`;
        document.getElementById('sharePanel').classList.remove('hidden');
        document.getElementById('sharePanelBackdrop').classList.remove('hidden');
    }

    /** Hide the share panel. */
    hideSharePanel() {
        document.getElementById('sharePanel').classList.add('hidden');
        document.getElementById('sharePanelBackdrop').classList.add('hidden');
        this._shareUrl = null;
        this._shareTitle = null;
        this._sharePromptId = null;
    }

    /**
     * Handle a share option click (twitter, reddit, copy, json).
     * JIT mode: uploads to Hub first if URL not available.
     * @param {string} platform
     */
    async handleShareOption(platform) {
        const url = this._shareUrl;
        const title = this._shareTitle || 'AI Prompt';

        // Hub publishing — separate flow
        if (platform === 'hub') {
            const promptId = this._sharePromptId;
            if (promptId) {
                this.hideSharePanel();
                await this.publishToHub(promptId);
            }
            return;
        }

        // Get prompt data
        const prompts = this._getPrompts();
        const prompt = this._sharePromptId
            ? prompts.find(p => p.id === this._sharePromptId)
            : prompts.find(p => p.title === title);

        // For copy/social platforms - need URL first (upload if not exists)
        let shareUrl = url;
        if (!shareUrl) {
            showToast('✨ 上传中...');
            try {
                const resp = await chrome.runtime.sendMessage({ 
                    type: 'SHARE_PROMPT', 
                    prompt: prompt,
                    visibility: 'unlisted'
                });
                if (resp.success) {
                    shareUrl = resp.url;
                } else if (resp.error === 'NOT_LOGGED_IN') {
                    await this._handleNotLoggedIn('SHARE_TO_PLATFORM', prompt, platform);
                    return;
                } else {
                    showToast('❌ ' + (resp.error || '上传失败'));
                    return;
                }
            } catch (e) {
                showToast('❌ ' + i18n.t('shareFailed'));
                return;
            }
        }

        const effectiveUrl = shareUrl;

        const socialPlatforms = ['twitter', 'reddit', 'zhihu', 'wechat', 'xiaohongshu', 'linkedin'];
        if (socialPlatforms.includes(platform)) {
            const content = prompt?.content || '';

            // --- Auto-inject platforms (知乎/公众号/小红书): delegate to background ---
            if (platform === 'zhihu' || platform === 'xiaohongshu' || platform === 'wechat') {
                showToast('✨ Generating & opening editor...');
                const fallbackText = buildFallbackText(platform, title, effectiveUrl, prompt);
                try {
                    await chrome.runtime.sendMessage({
                        type: 'SHARE_TO_PLATFORM',
                        content,
                        title,
                        url: effectiveUrl,
                        platform,
                        fallbackText,
                    });
                } catch (e) {
                    // Fallback: copy to clipboard
                    await navigator.clipboard.writeText(fallbackText);
                    showToast('📋 内容已复制到剪贴板');
                }
                this.hideSharePanel();
                return;
            }

            // --- URL-based platforms (Twitter/Reddit) + clipboard (WeChat) ---
            let aiResult = null;
            if (content.length > 0) {
                showToast('✨ Generating share text...');
                try {
                    aiResult = await chrome.runtime.sendMessage({
                        type: 'GENERATE_SHARE_TEXT',
                        content,
                        title,
                        url: effectiveUrl,
                        platform,
                    });
                } catch (e) {
                    console.warn('[ShareManager] LLM share text failed:', e);
                }
            }

            if (platform === 'twitter') {
                const text = (aiResult?.success && aiResult?.text)
                    ? aiResult.text
                    : this._buildTwitterText(title, effectiveUrl, prompt);
                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
            } else if (platform === 'reddit') {
                const redditTitle = (aiResult?.success && aiResult?.title)
                    ? aiResult.title
                    : this._buildRedditTitle(title, prompt);
                const redditBody = (aiResult?.success && aiResult?.body)
                    ? aiResult.body
                    : this._buildRedditBody(title, effectiveUrl, prompt);
                await navigator.clipboard.writeText(redditBody);
                showToast('📋 Post body copied — paste into Reddit');
                window.open(`https://old.reddit.com/submit?selftext=true&title=${encodeURIComponent(redditTitle)}&text=${encodeURIComponent(redditBody)}`, '_blank');
            } else if (platform === 'linkedin') {
                const linkedinText = (aiResult?.success && aiResult?.text)
                    ? aiResult.text
                    : this._buildLinkedInFallback(title, effectiveUrl, prompt);
                await navigator.clipboard.writeText(linkedinText + '\n\n🔗 ' + effectiveUrl);
                showToast('📋 Post copied — paste into LinkedIn');
                window.open('https://www.linkedin.com/feed/', '_blank');
            } else if (platform === 'wechat') {
                const wechatText = (aiResult?.success && aiResult?.text)
                    ? aiResult.text
                    : this._buildWechatFallback(title, effectiveUrl, prompt);
                await navigator.clipboard.writeText(wechatText);
                showToast('📋 已复制公众号文章 — 粘贴到公众号编辑器');
            }
            this.hideSharePanel();
            return;
        }

        switch (platform) {
            case 'copy': {
                await navigator.clipboard.writeText(effectiveUrl);
                showToast(i18n.t('linkCopied'));
                break;
            }
            case 'json': {
                if (prompt) {
                    const json = JSON.stringify({ title: prompt.title, content: prompt.content, category: prompt.category, tags: prompt.tags }, null, 2);
                    await navigator.clipboard.writeText(json);
                    showToast(i18n.t('jsonCopied'));
                }
                break;
            }
        }
        this.hideSharePanel();
    }

    /**
     * Build compelling Twitter share text.
     * Strategy: hook + preview + features + CTA + hashtags
     */
    _buildTwitterText(title, url, prompt) {
        const lines = [`🧠 "${title}"`];
        const content = prompt?.content || '';

        // Content preview — always show first meaningful snippet
        if (content.length > 0) {
            const firstLines = content.split(/\r?\n/).filter(l => l.trim()).slice(0, 2).join(' ');
            const preview = firstLines.replace(/\{\{[^}]+\}\}/g, '___').substring(0, 100);
            if (preview.length > 0) lines.push(`\n\n💬 "${preview}${content.length > 100 ? '...' : ''}"`);
        }

        // Feature highlights — extract from content directly
        const features = this._extractShareFeatures(content);
        if (features.length > 0) lines.push(`\n\n⚡ ${features.join(' · ')}`);

        // CTA
        lines.push(`\n\n🔗 One-click install → ${url}`);

        // Smart hashtags
        const tags = ['#PromptEngineering', '#AI'];
        if (prompt?.category) tags.push(`#${prompt.category.replace(/[\s/]+/g, '')}`);
        if (prompt?.tags?.length > 0) tags.push(`#${prompt.tags[0].replace(/\s+/g, '')}`);
        lines.push(`\n${tags.slice(0, 4).join(' ')}`);

        return lines.join('');
    }

    /**
     * Build Reddit post title with value hook.
     */
    _buildRedditTitle(title, prompt) {
        const content = prompt?.content || '';
        const features = this._extractShareFeatures(content);
        const suffix = features.length > 0 ? ` [${features.join(', ')}]` : '';
        const category = prompt?.category ? `[${prompt.category}] ` : '';
        return `${category}${title}${suffix} — Free AI Prompt (one-click install)`;
    }

    /**
     * Build Reddit post body with preview, features, and CTA.
     */
    _buildRedditBody(title, url, prompt) {
        const sections = [];
        const content = prompt?.content || '';

        // Prompt preview — always show
        if (content.length > 0) {
            const preview = content
                .replace(/\{\{@[^}]+\}\}/g, '[auto-filled]')
                .replace(/\{\{([^}:]+):[^}]*\|[^}]*\}\}/g, '[choose: $1]')
                .replace(/\{\{([^}:]+):[^}]+\}\}/g, '[$1]')
                .replace(/\{\{([^}]+)\}\}/g, '[$1]')
                .substring(0, 300);
            sections.push(`**Prompt preview:**\n\n> ${preview}${content.length > 300 ? '...' : ''}`);
        }

        // Feature breakdown — always show something
        const details = [];
        const varMatches = content.match(/\{\{([^}]+)\}\}/g) || [];
        const enumCount = varMatches.filter(m => m.includes('|')).length;
        const contextCount = varMatches.filter(m => m.includes('@')).length;
        const defaultCount = varMatches.filter(m => m.includes(':') && !m.includes('|') && !m.includes('@')).length;
        const plainCount = varMatches.length - enumCount - contextCount - defaultCount;

        if (enumCount > 0) details.push(`⚡ **${enumCount} dropdown selector${enumCount > 1 ? 's' : ''}** — pick options from a menu`);
        if (defaultCount > 0) details.push(`📝 **${defaultCount} smart default${defaultCount > 1 ? 's' : ''}** — pre-filled, change anytime`);
        if (plainCount > 0) details.push(`🔤 **${plainCount} fill-in variable${plainCount > 1 ? 's' : ''}** — customize to your needs`);
        if (content.includes('{{@clipboard}}')) details.push('📋 **Auto-pastes your clipboard** into the prompt');
        if (content.includes('{{@page_text}}')) details.push('🌐 **Reads the current webpage** for context');
        if (content.includes('{{@selection}}')) details.push('✏️ **Uses your selected text** as input');

        // Always include word count and structure hints
        const wordCount = content.split(/\s+/).length;
        if (wordCount > 50) details.push(`📏 **${wordCount} words** — detailed, structured prompt`);
        if (content.includes('###') || content.includes('**')) details.push('📋 **Markdown formatted** — well-organized sections');

        if (details.length > 0) {
            sections.push(`**What makes this special:**\n\n${details.join('\n')}`);
        }

        // Tags
        if (prompt?.tags?.length > 0) {
            sections.push(`**Tags:** ${prompt.tags.join(', ')}`);
        }

        // CTA
        sections.push(`---\n\n🔗 **[One-click install with Prompt Ark](${url})** — Free, open-source prompt manager for ChatGPT / Gemini / Claude / DeepSeek + 15 AI platforms.\n\nWorks in any AI chat. Install prompt → fill variables → go.`);

        return sections.join('\n\n');
    }

    /**
     * Extract feature highlights directly from prompt content.
     * Does NOT rely on stored prompt.variables (which may not exist).
     */
    _extractShareFeatures(content) {
        if (!content) return [];
        const features = [];
        const varMatches = content.match(/\{\{([^}]+)\}\}/g) || [];

        const enumCount = varMatches.filter(m => m.includes('|')).length;
        const contextCount = varMatches.filter(m => m.includes('@')).length;
        const totalVars = varMatches.length - contextCount;

        if (enumCount > 0) features.push(`${enumCount} dropdown${enumCount > 1 ? 's' : ''}`);
        else if (totalVars > 0) features.push(`${totalVars} variable${totalVars > 1 ? 's' : ''}`);
        if (contextCount > 0) features.push('auto-context');

        const wordCount = content.split(/\s+/).length;
        if (wordCount > 100) features.push(`${wordCount}+ words`);

        return features;
    }

    /**
     * Template fallback: 知乎方法论短文
     */
    _buildZhihuFallback(title, url, prompt) {
        const content = prompt?.content || '';
        const preview = content.replace(/\{\{[^}]+\}\}/g, '___').substring(0, 150);
        const varCount = (content.match(/\{\{([^}]+)\}\}/g) || []).length;

        const sections = [
            `# ${title}\n`,
            `很多人用AI的效果不好，核心原因往往不是AI不行，而是prompt写得太随意。`,
            `\n一个好的prompt通常包含三个要素：**角色设定**、**任务约束**、**输出格式**。`,
        ];

        if (preview.length > 20) {
            sections.push(`\n以这个prompt为例：\n\n> ${preview}...`);
        }
        if (varCount > 0) {
            sections.push(`\n它还设计了${varCount}个变量插槽，可以根据不同场景快速填入，避免每次重写。`);
        }
        sections.push(`\n---\n完整prompt模板：${url}`);

        return sections.join('');
    }

    /**
     * Template fallback: 微信公众号实用文章
     */
    _buildWechatFallback(title, url, prompt) {
        const content = prompt?.content || '';
        const category = prompt?.category || 'AI';

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

    /**
     * Template fallback: 小红书干货笔记
     */
    _buildXiaohongshuFallback(title, url, prompt) {
        const category = prompt?.category || 'AI';

        return `3个让${category}效率翻倍的AI使用技巧 🔥

📌 技巧1：给AI一个专业身份
不要说"帮我写"，而是说"你是XX领域专家"
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

    /**
     * Template fallback: LinkedIn professional post
     */
    _buildLinkedInFallback(title, url, prompt) {
        const content = prompt?.content || '';
        const category = prompt?.category || 'AI';
        const wordCount = content.split(/\s+/).length;
        const varCount = (content.match(/\{\{([^}]+)\}\}/g) || []).length;

        const lines = [`I spent way too long on ${category.toLowerCase()} tasks last week.`];
        lines.push(`\nThen I found a structured prompt template that cut the time in half.\n`);
        lines.push(`Here's what makes "${title}" different:\n`);

        if (varCount > 0) lines.push(`📊 ${varCount} customizable variables — adapts to your specific context`);
        if (wordCount > 50) lines.push(`📋 ${wordCount}+ words of structured guidance — not a one-liner`);
        if (content.includes('###') || content.includes('**')) lines.push(`🎯 Well-organized sections — role, task, constraints, output format`);

        lines.push(`\nThe key insight: good AI output is 80% prompt structure, 20% the model itself.`);
        lines.push(`\nLink in the first comment 👇`);
        lines.push(`\nWhat's your go-to approach for ${category.toLowerCase()} prompts?`);
        lines.push(`\n#PromptEngineering #${category.replace(/[\s/]+/g, '')} #AIProductivity`);

        return lines.join('\n');
    }

    // --- Publish to Hub ---

    /**
     * Publish a single prompt to the Prompt Hub (Supabase version).
     * @param {string} id - Prompt ID
     */
    async publishToHub(id) {
        const prompts = this._getPrompts();
        const prompt = prompts.find(p => p.id === id);
        if (!prompt) { showToast('❌ Prompt not found'); return; }

        showToast('📢 Publishing to Hub...');

        try {
            const resp = await chrome.runtime.sendMessage({ 
                type: 'PUBLISH_TO_HUB', 
                prompt: prompt,
                visibility: 'public'
            });
            
            if (!resp.success) {
                if (resp.error === 'NOT_LOGGED_IN') {
                    await this._handleNotLoggedIn('PUBLISH_TO_HUB', prompt);
                } else {
                    showToast('❌ ' + resp.error);
                }
                return;
            }

            showToast('✅ Published to Hub!');

            prompt.hubId = resp.id;
            prompt.hubPublishedAt = new Date().toISOString();

            this.hideSharePanel();
            this.showSharePanel(resp.url, prompt.title, id);
        } catch (e) {
            showToast('❌ Publish failed: ' + e.message);
        }
    }

    /**
     * Publish a Prompt Pack to the Hub (Supabase version).
     * @param {string[]} ids - Array of prompt IDs
     * @param {string} packTitle - Pack title
     */
    async publishPackToHub(ids, packTitle) {
        if (ids.length === 0) { showToast('Select at least one prompt'); return; }

        const prompts = this._getPrompts();
        const packPrompts = ids.map(id => prompts.find(p => p.id === id)).filter(Boolean);

        showToast('📢 Publishing Pack to Hub...');

        try {
            const resp = await chrome.runtime.sendMessage({
                type: 'PUBLISH_PACK_TO_HUB',
                prompts: packPrompts,
                packTitle,
                visibility: 'public'
            });
            if (!resp.success) {
                if (resp.error === 'NOT_LOGGED_IN') {
                    await this._handleNotLoggedIn('PUBLISH_PACK_TO_HUB', { prompts: packPrompts, packTitle });
                } else {
                    showToast('❌ ' + resp.error);
                }
                return;
            }

            showToast('✅ Pack published to Hub!');
            this.exitPackMode();
            this.showSharePanel(resp.url, packTitle);
        } catch (e) {
            showToast('❌ Publish failed: ' + e.message);
        }
    }

    // --- Prompt Pack (Selection Mode) ---

    /** Enter pack selection mode. */
    enterPackMode() {
        this._packMode = true;
        this._packSelected = new Set();
        document.querySelectorAll('.prompt-item').forEach(el => el.classList.add('selectable'));
        document.getElementById('packToolbar').classList.remove('hidden');
        document.getElementById('packTitleInput').value = '';
        this._updatePackCount();
        showToast(i18n.t('packMode'));
    }

    /** Exit pack selection mode. */
    exitPackMode() {
        this._packMode = false;
        this._packSelected = null;
        document.querySelectorAll('.prompt-item').forEach(el => {
            el.classList.remove('selectable', 'selected');
        });
        document.getElementById('packToolbar').classList.add('hidden');
    }

    /** Update the selected count display in the pack toolbar. */
    _updatePackCount() {
        const count = document.querySelectorAll('.prompt-item.selected').length;
        document.getElementById('packSelectedCount').textContent = count;
        document.getElementById('packShareBtn').disabled = count === 0;
    }

    /** Share the selected pack (Supabase version - unlisted). */
    async sharePack() {
        const selectedItems = document.querySelectorAll('.prompt-item.selected');
        const ids = Array.from(selectedItems).map(el => el.dataset.id);
        const packTitle = document.getElementById('packTitleInput').value.trim() || `Prompt Pack (${ids.length})`;

        if (ids.length === 0) {
            showToast(i18n.t('packSelectOne'));
            return;
        }

        const prompts = this._getPrompts();
        const packPrompts = ids.map(id => prompts.find(p => p.id === id)).filter(Boolean);

        const btn = document.getElementById('packShareBtn');
        btn.disabled = true;
        btn.textContent = i18n.t('packSharing');

        try {
            const resp = await chrome.runtime.sendMessage({ 
                type: 'PUBLISH_PACK_TO_HUB', 
                prompts: packPrompts,
                packTitle,
                visibility: 'unlisted'
            });
            if (!resp.success) {
                if (resp.error === 'NOT_LOGGED_IN') {
                    showToast(i18n.t('configureGithubToken'));
                } else {
                    showToast('❌ ' + resp.error);
                }
                return;
            }
            this.exitPackMode();
            this.showSharePanel(resp.url, packTitle);
        } catch (e) {
            showToast('❌ ' + i18n.t('packShareFailed') + ': ' + e.message);
        } finally {
            btn.disabled = false;
            btn.textContent = i18n.t('packShare');
        }
    }
}
