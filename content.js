// content.js - Prompt Ark Content Script
// Unified deep traversal strategy for all platforms

// --- Image Prompt Feature (Embedded) ---
class ImagePromptHandler {
  constructor() {
    this.enabled = false;
    this.imageModelId = "";
    this.processedImages = new WeakSet();
    this.currentButton = null;
    this.hoverTimer = null;
    this.currentImg = null;
    this.observer = null;
    this.adDomains = ["googleads", "doubleclick", "googlesyndication", "google-analytics", "facebook.com/tr", "amazon-adsystem", "adsystem.amazon"];
    this.init();
  }
  async init() {
    await this.loadSettings();
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === "IMAGE_PROMPT_SETTINGS_CHANGED") {
        this.enabled = message.enabled;
        this.enabled ? this.startDetection() : this.stopDetection();
      }
    });
    if (this.enabled) this.startDetection();
  }
  async loadSettings() {
    try {
      const resp = await chrome.runtime.sendMessage({ type: "GET_IMAGE_PROMPT_SETTINGS" });
      this.enabled = resp.enabled || false;
      this.imageModelId = resp.imageModelId || "";
    } catch (e) {
      console.error("[ImagePrompt] Failed to load settings:", e);
    }
  }
  startDetection() {
    if (this.observer) return;
    this.scanImages();
    let debounceTimer = null;
    this.observer = new MutationObserver(() => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => this.scanImages(), 300);
    });
    this.observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".image-prompt-btn")) this.hideButton();
    });
  }
  stopDetection() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.hideButton();
  }
  scanImages() {
    if (!this.enabled) return;
    document.querySelectorAll("img").forEach((img) => {
      if (this.processedImages.has(img)) return;
      if (!this.isValidImage(img)) return;
      this.processedImages.add(img);
      this.attachHoverListener(img);
    });
  }
  isValidImage(img) {
    if (img.dataset.imagePromptAttached) return false;
    const rect = img.getBoundingClientRect();
    if (rect.width < 100 || rect.height < 100) return false;
    if (!this.isVisible(img)) return false;
    if (img.tagName.toLowerCase() === "svg" || img.src?.endsWith(".svg")) return false;
    if (this.isAdImage(img)) return false;
    if (!img.src || (img.src.startsWith("data:") && img.naturalWidth === 0)) return false;
    return true;
  }
  isVisible(el) {
    const style = window.getComputedStyle(el);
    return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
  }
  isAdImage(img) {
    return this.adDomains.some((domain) => (img.src || "").includes(domain));
  }
  attachHoverListener(img) {
    img.dataset.imagePromptAttached = "true";
    img.addEventListener("mouseenter", () => {
      this.hoverTimer = setTimeout(() => this.showButton(img), 300);
    });
    img.addEventListener("mouseleave", () => {
      if (this.hoverTimer) {
        clearTimeout(this.hoverTimer);
        this.hoverTimer = null;
      }
    });
  }
  showButton(img) {
    this.hideButton();
    this.currentImg = img;
    const btn = document.createElement("button");
    btn.className = "image-prompt-btn";
    btn.innerHTML = "✨";
    btn.title = "Generate Image Prompt";
    const rect = img.getBoundingClientRect();
    btn.style.cssText = `position:fixed;top:${rect.top + 8}px;left:${rect.right - 32}px;width:24px;height:24px;border-radius:50%;background:rgba(0,0,0,0.6);color:white;border:none;cursor:pointer;z-index:2147483647;font-size:14px;display:flex;align-items:center;justify-content:center;opacity:0.7;transition:opacity 0.2s;pointer-events:auto;`;
    btn.addEventListener("mouseenter", () => (btn.style.opacity = "1"));
    btn.addEventListener("mouseleave", () => (btn.style.opacity = "0.7"));
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.handleImageClick(img);
    });
    document.body.appendChild(btn);
    this.currentButton = btn;
  }
  hideButton() {
    if (this.currentButton) {
      this.currentButton.remove();
      this.currentButton = null;
    }
    this.currentImg = null;
  }
  async handleImageClick(img) {
    try {
      // Open standalone image prompt page instead of sending message to popup
      const imageUrl = encodeURIComponent(img.src);
      const modelId = encodeURIComponent(this.imageModelId);
      const pageUrl = chrome.runtime.getURL(`image-prompt.html?url=${imageUrl}&model=${modelId}`);
      window.open(pageUrl, '_blank', 'width=800,height=900,scrollbars=yes');
    } catch (e) {
      console.error("[ImagePrompt] Failed to open analysis page:", e);
    }
  }
}

// content.js - Prompt Ark Content Script
// Unified deep traversal strategy for all platforms

class AIPromptManager {
  constructor() {
    this.platform = this.detectPlatform();
    this.pickerVisible = false;
    this.prompts = [];
    this.injectedMarker = 'data-apm-injected';
    this.onSelectCallback = null;
    this.i18nDict = {}; // Custom i18n dictionary (syncs with background.js)

    // Slash command state
    this.slashDropdown = null;
    this.slashShortcuts = [];
    this.slashActiveIndex = -1;

    this.init();
    this._loadI18nDict();
  }

  // Guard: check if extension context is still valid
  isContextValid() {
    try {
      return !!chrome.runtime?.id;
    } catch (e) {
      return false;
    }
  }

  detectPlatform() {
    const h = window.location.hostname;
    if (h.includes('chatgpt.com') || h.includes('chat.openai.com')) return 'chatgpt';
    if (h.includes('claude.ai')) return 'claude';
    if (h.includes('gemini.google.com')) return 'gemini';
    if (h.includes('notebooklm.google.com')) return 'notebooklm';
    if (h.includes('aistudio.google.com')) return 'aistudio';
    if (h.includes('grok.com')) return 'grok';
    if (h.includes('chat.deepseek.com')) return 'deepseek';
    if (h.includes('kimi.com') || h.includes('kimi.moonshot.cn')) return 'kimi';
    if (h.includes('chatglm.cn')) return 'zhipu';
    if (h.includes('doubao.com')) return 'doubao';
    if (h.includes('yiyan.baidu.com')) return 'wenxin';
    if (h.includes('tongyi.aliyun.com') || h.includes('qwen.ai')) return 'qwen';
    if (h.includes('hailuoai.com')) return 'minimax';
    if (h.includes('hunyuan.tencent.com')) return 'hunyuan';
    return 'generic';
  }

  // --- Input Detection ---

  findInputSimple() {
    const configs = {
      chatgpt: ['#prompt-textarea', 'div[contenteditable="true"].ProseMirror'],
      claude: ['div[contenteditable="true"].ProseMirror', 'div[enterkeyhint="enter"][contenteditable="true"]'],
      gemini: ['rich-textarea div[contenteditable="true"]', 'div[role="textbox"]', '.ql-editor'],
      notebooklm: ['textarea[placeholder]', 'textarea.mat-input-element'],
      aistudio: ['textarea[placeholder]', '.code-block textarea', 'div[contenteditable="true"]'],
      grok: ['textarea[placeholder]', 'div[contenteditable="true"]'],
      deepseek: ['textarea#chat-input', 'textarea[placeholder]'],
      kimi: ['div[contenteditable="true"][class*="editor"]', 'div[contenteditable="true"].ProseMirror'],
      zhipu: ['textarea.ant-input'],
      doubao: ['div[data-slate-editor="true"]', 'div[contenteditable="true"][role="textbox"]'],
      wenxin: ['div[contenteditable="true"]', 'textarea[placeholder]'],
      qwen: ['div[contenteditable="true"][class*="editor"]'],
      minimax: ['textarea[placeholder]', 'div[contenteditable="true"]'],
      hunyuan: ['textarea[placeholder]', 'div[contenteditable="true"]'],
    };
    // Try platform-specific selectors first, then generic fallback
    const selectors = configs[this.platform] || [];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && this.isVisible(el)) return el;
    }
    // Generic fallback for all platforms
    for (const sel of ['textarea', 'div[contenteditable="true"]']) {
      const el = document.querySelector(sel);
      if (el && this.isVisible(el)) return el;
    }
    return null;
  }

  // Collect ALL matching elements, traversing Shadow DOM boundaries
  queryAllDeep(predicate) {
    const results = [];
    const queue = [document];
    while (queue.length > 0) {
      const root = queue.shift();
      const elements = root.querySelectorAll ? root.querySelectorAll('*') : [];
      elements.forEach(el => {
        if (predicate(el)) results.push(el);
        if (el.shadowRoot) queue.push(el.shadowRoot);
      });
    }
    return results;
  }

  findInputElement() {
    // Try platform-specific simple selectors first (fast path)
    const simple = this.findInputSimple();
    if (simple) return simple;

    // Deep traversal fallback for Shadow DOM inputs
    const deep = this.queryAllDeep(el => {
      const tag = el.tagName?.toLowerCase();
      if (tag !== 'textarea' && !(tag === 'div' && el.isContentEditable)) return false;
      return this.isVisible(el);
    });
    return deep[0] || null;
  }

  isVisible(element) {
    if (!element) return false;
    const style = window.getComputedStyle(element);
    return style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0' &&
      element.getBoundingClientRect().height > 0;
  }

  // --- Prompt Injection ---

  async injectIntoElement(inputEl, text, options = {}) {
    if (!inputEl) return false;

    const { replaceAll = false } = options;

    inputEl.focus();
    await new Promise(r => setTimeout(r, 50));

    let success = false;

    // Strategy A: ProseMirror / ContentEditable (ChatGPT, Claude)
    if (inputEl.classList.contains('ProseMirror') || inputEl.isContentEditable) {
      if (replaceAll) {
        try {
          const selection = window.getSelection();
          if (selection) {
            const range = document.createRange();
            range.selectNodeContents(inputEl);
            selection.removeAllRanges();
            selection.addRange(range);
          }
        } catch (e) { /* selection API may fail on some editors */ }
      }

      try {
        success = document.execCommand('insertText', false, text);
      } catch (e) { /* execCommand not supported */ }

      if (!success && replaceAll) {
        try {
          inputEl.textContent = text;
          success = true;
        } catch (e) { /* fallback below */ }
      }
    }

    // Strategy B: Textarea/Input with React bypass (Gemini, NotebookLM, or Generic Web Forms)
    if (!success) {
      if (inputEl.tagName === 'TEXTAREA' || inputEl.tagName === 'INPUT') {
        const valueSetter = Object.getOwnPropertyDescriptor(inputEl, 'value')?.set;
        const protoSetter = Object.getOwnPropertyDescriptor(
          Object.getPrototypeOf(inputEl), 'value'
        )?.set;

        const finalSetter = valueSetter || protoSetter;

        if (finalSetter) {
          finalSetter.call(inputEl, text);
        } else {
          inputEl.value = text;
        }

        // Reset React's value tracker so it recognizes the change
        const tracker = inputEl._valueTracker;
        if (tracker) tracker.setValue('');

        success = true;
      } else {
        // ContentEditable fallback
        inputEl.textContent = text;
        success = true;
      }
    }

    // Trigger event chain to activate Send button
    [
      new Event('input', { bubbles: true }),
      new Event('change', { bubbles: true }),
      new KeyboardEvent('keydown', { bubbles: true, key: ' ' }),
      new KeyboardEvent('keyup', { bubbles: true, key: ' ' })
    ].forEach(e => inputEl.dispatchEvent(e));

    this.showNotification(this.msg('insertSuccess', 'Prompt已填入'), 'success');
    return true;
  }

  async injectPromptRobust(text) {
    const inputEl = this.findInputElement();
    if (!inputEl) {
      this.showNotification(this.msg('inputNotFound', '未找到输入框'), 'error');
      return false;
    }
    return this.injectIntoElement(inputEl, text);
  }

  // --- Variable Processing ---

  extractVariables(content) {
    const rawMatches = [];
    const brackets = content.match(/\{\{([^}]+)\}\}/g);
    if (brackets) {
      rawMatches.push(...brackets.map(m => m.slice(2, -2).trim()));
    }
    const squares = content.match(/\[([a-zA-Z][a-zA-Z0-9_\s]*)\](?!\()/g);
    if (squares) {
      rawMatches.push(...squares.map(m => m.slice(1, -1).trim()));
    }
    // Dedupe and parse into structured objects
    const seen = new Set();
    return rawMatches
      .filter(v => v.length > 0 && !seen.has(v) && seen.add(v))
      .map(raw => {
        if (raw.startsWith('@')) return { name: raw, type: 'context', raw };
        const colonIdx = raw.indexOf(':');
        if (colonIdx === -1) return { name: raw, type: 'text', default: null, raw };
        const name = raw.substring(0, colonIdx).trim();
        const rest = raw.substring(colonIdx + 1);
        if (rest.includes('|')) {
          const options = rest.split('|').map(o => o.trim()).filter(o => o.length > 0);
          if (options.length >= 2) return { name, type: 'enum', options, default: options[0], raw };
        }
        const defaultVal = rest.trim();
        if (defaultVal.length > 0) return { name, type: 'default', default: defaultVal, raw };
        return { name, type: 'text', default: null, raw };
      });
  }

  resolveVariables(content, values) {
    let resolved = content;
    for (const [name, value] of Object.entries(values)) {
      resolved = resolved.split(`{{${name}}}`).join(value);
      resolved = resolved.split(`[${name}]`).join(value);
    }
    return resolved;
  }

  // Context Grabber: auto-fill magic variables with live webpage data
  // These are resolved BEFORE showing the variable form, so users never see them.
  static CONTEXT_VARS = new Set(['@page_text', '@selection', '@page_url', '@page_title']);

  // Clean extracted text: remove technical noise, short status labels, duplicate lines
  static cleanExtractedText(rawText) {
    const shortNoiseExact = new Set([
      '进阶思考', '来源', '参考来源', 'Sources', 'Source',
      '思考', '原因', '结论', 'Details', 'Details:', 'More'
    ]);

    const shortNoisePatterns = [
      /^Thought for \d+s$/i,
      /^Reasoned for \d+ seconds?$/i,
      /^思考了 \d+ 秒$/i,
    ];

    const technicalNoiseMarkers = [
      'window.__',
      'requestAnimationFrame(',
      'document.querySelector',
      'addEventListener(',
      '__oai',
      'oai_logHTML',
      'oai_logTTI',
      'oai_SSR_HTML',
      'oai_SSR_TTI',
    ];

    const lines = rawText
      .split(/\n+/)
      .map(line => line.trim())
      .filter(Boolean)
      .filter(line => {
        if (technicalNoiseMarkers.some(marker => line.includes(marker))) {
          return false;
        }
        if (shortNoiseExact.has(line)) return false;
        if (shortNoisePatterns.some(re => re.test(line))) return false;
        return true;
      });

    // Compress consecutive duplicate lines
    const deduped = lines.filter((line, i) => i === 0 || line !== lines[i - 1]);

    return deduped.join('\n').substring(0, 5000);
  }

  async capturePageContext() {
    // Exclude extension-injected DOM (Prompt Picker, selection toolbar, slash dropdown)
    const article = document.querySelector('article') || document.querySelector('main');
    let rawText = '';
    if (article) {
      const clone = article.cloneNode(true);
      clone.querySelectorAll('#ai-prompt-picker, #apm-selection-toolbar, .apm-slash-dropdown').forEach(el => el.remove());
      rawText = clone.innerText || '';
    } else {
      const bodyClone = document.body.cloneNode(true);
      bodyClone.querySelectorAll('#ai-prompt-picker, #apm-selection-toolbar, .apm-slash-dropdown').forEach(el => el.remove());
      rawText = bodyClone.innerText || '';
    }

    const pageText = AIPromptManager.cleanExtractedText(rawText);

    try {
      await chrome.runtime.sendMessage({
        type: 'CAPTURE_PAGE_CONTEXT',
        context: {
          page_title: document.title || '',
          page_url: location.href || '',
          page_text: pageText || '',
          selected_text: window.getSelection()?.toString()?.trim() || ''
        }
      });
      this.showNotification('✅ ' + this.msg('contextCaptured', 'Context captured'), 'success');
    } catch (e) {
      console.error('[Prompt Ark] Context capture failed:', e);
      this.showNotification('❌ ' + this.msg('contextCaptureFailed', 'Failed to capture context'), 'error');
    }
  }

  // Async resolver: tries cached context first (cross-tab), falls back to live DOM
  async resolveContextVariables(content) {
    const vars = this.extractVariables(content);
    const hasContextVars = vars.some(v => AIPromptManager.CONTEXT_VARS.has(v.name));
    if (!hasContextVars) return content;

    const contextValues = {};

    // Strategy: try cached snapshot from background (cross-tab scenario)
    let cached = null;
    try {
      const resp = await chrome.runtime.sendMessage({ type: 'GET_PAGE_CONTEXT' });
      if (resp?.success && resp.context) cached = resp.context;
    } catch (e) { /* no cache available */ }

    // Fill each variable: prefer cache, fallback to current page
    if (vars.some(v => v.name === '@page_url')) {
      contextValues['@page_url'] = cached?.page_url || window.location.href;
    }
    if (vars.some(v => v.name === '@page_title')) {
      contextValues['@page_title'] = cached?.page_title || document.title || '';
    }
    if (vars.some(v => v.name === '@selection')) {
      // Selected text: prefer live selection (user might have just selected something)
      const liveSelection = window.getSelection()?.toString()?.trim() || '';
      contextValues['@selection'] = liveSelection || cached?.selected_text || '';
    }
    if (vars.some(v => v.name === '@page_text')) {
      if (cached?.page_text) {
        contextValues['@page_text'] = cached.page_text;
      } else {
        const article = document.querySelector('article') || document.querySelector('main') || document.body;
        contextValues['@page_text'] = (article?.innerText || '').substring(0, 4000).trim();
      }
    }

    return this.resolveVariables(content, contextValues);
  }

  // --- Initialization ---

  init() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sendResponse);
      return true;
    });

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        e.stopPropagation();
        this.showPromptPicker();
      }
      // Context Grabber: Ctrl+Shift+G = Smart grab page text and convert to prompt
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        e.stopPropagation();
        this.capturePageContext();
      }
      // Article Share: Ctrl+Shift+Y = Show platform picker for article sharing
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        e.stopPropagation();
        this._showArticleSharePicker();
      }
      if (e.key === 'Escape' && this.pickerVisible) {
        this.hidePromptPicker();
      }
    });

    this.initSlashCommands();
    this.initSelectionToolbar();

    // Initialize Image Prompt Handler (runs on all pages)
    this.imagePromptHandler = new ImagePromptHandler();

    // Guard: Deep DOM traversal and helper buttons only run on known AI platforms!
    // Running this heavily active observer globally on <all_urls> would destroy browser performance.
    if (this.platform !== 'generic') {
      this.initMutationObserver();
      setTimeout(() => this.initHelperButtons(), 1000);

      // Update button positions on scroll and resize
      let updateTimer = null;
      const updatePositions = () => {
        if (updateTimer) clearTimeout(updateTimer);
        updateTimer = setTimeout(() => this.updateHelperButtonPositions(), 100);
      };
      window.addEventListener('scroll', updatePositions, { passive: true });
      window.addEventListener('resize', updatePositions, { passive: true });
    }

    // Global Event Listener: Catch One-Click Install Events from Prompt Hub
    window.addEventListener('message', (event) => {
      // Security Check 1: Accept only from Verified Domains (e.g. your GitHub Pages, local dev)
      const verifiedDomains = [
        'https://promptark.oometa.ai',
        'http://127.0.0.1:8080',
        'http://localhost:8080',
        'http://127.0.0.1:5173',
        'http://localhost:5173',
        'http://127.0.0.1:3000',
        'http://localhost:3000',
      ];

      if (!verifiedDomains.includes(event.origin)) {
        return; // Ignore messages from untrusted origins
      }

      // Security Check 2: Accept events containing specifically structured payload
      if (event.data && event.data.type === 'PROMPT_ARK_IMPORT' && event.data.payload) {
        this.handleHubImportEvent(event.data.payload, event.source, event.origin);
      }
      // Handle Hub auth sync
      if (event.data && event.data.type === 'PROMPT_ARK_AUTH_SYNC' && event.data.payload) {
        this.handleHubAuthSync(event.data.payload);
      }
    });
  }



  async handleHubImportEvent(payload, sourceWindow, origin) {
    if (!payload || !payload.prompts || !Array.isArray(payload.prompts)) return;

    // Standardize prompts array for import
    const newPrompts = payload.prompts.map(p => ({
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      title: p.title || p.act || 'Untitled',
      content: p.content || p.prompt || '',
      category: p.category || 'Downloaded',
      tags: p.tags || [],
      variables: p.variables || [],
      shortcut: p.shortcut || '',
      usageCount: 0,
      lastUsed: Date.now(),
      pinned: false,
      keywords: [(p.title || p.act || '').toLowerCase()]
    }));

    try {
      const response = await chrome.runtime.sendMessage({ type: 'IMPORT_PROMPTS', prompts: newPrompts });
      if (response.success) {
        // Display success Toast directly on the webpage (since Popup is closed)
        this.showPageToast(`🚀 Successfully added ${newPrompts.length} prompt(s) to your Prompt Ark!`);
        // Notify the sender (the Hub page) that it was successful (targeted to verified origin)
        if (sourceWindow) {
          sourceWindow.postMessage({ type: 'PROMPT_ARK_IMPORT_SUCCESS' }, origin);
        }
      } else {
        console.error('[Prompt Ark] Import failed via Hub:', response.error);
        this.showPageToast(`❌ Import Failed: ${response.error || 'Unknown Error'}`);
      }
    } catch (e) {
      console.error('[Prompt Ark] Import Error:', e);
    }
  }

  // Handle Hub auth sync - forward to background script
  async handleHubAuthSync(payload) {
    console.log('[Prompt Ark] Received auth sync from Hub:', payload);
    try {
      await chrome.runtime.sendMessage({ 
        type: 'PROMPT_ARK_AUTH_SYNC', 
        payload: payload 
      });
    } catch (e) {
      console.error('[Prompt Ark] Auth sync error:', e);
    }
  }

  showPageToast(msg) {
    const toast = document.createElement('div');
    toast.textContent = msg;
    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%) translateY(20px)',
      background: 'rgba(15, 23, 42, 0.95)',
      backdropFilter: 'blur(8px)',
      color: '#fff',
      padding: '12px 24px',
      borderRadius: '999px',
      fontSize: '14px',
      fontWeight: '600',
      zIndex: '2147483647',
      boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
      border: '1px solid rgba(255,255,255,0.1)',
      opacity: '0',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    });
    document.body.appendChild(toast);

    // Animate In
    requestAnimationFrame(() => {
      toast.style.transform = 'translateX(-50%) translateY(0)';
      toast.style.opacity = '1';
    });

    // Animate Out after 3s
    setTimeout(() => {
      toast.style.transform = 'translateX(-50%) translateY(20px)';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  initMutationObserver() {
    const observer = new MutationObserver(() => {
      if (this.mutationTimer) clearTimeout(this.mutationTimer);
      this.mutationTimer = setTimeout(() => this.initHelperButtons(), 500);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  initHelperButtons() {
    // Clean up orphaned wrappers whose target input is no longer in the DOM
    document.querySelectorAll('.notebook-helper-wrapper').forEach(wrapper => {
      const targetInput = wrapper._apmTargetInput;
      if (!targetInput || !targetInput.isConnected) {
        wrapper.remove();
        if (targetInput) targetInput.removeAttribute(this.injectedMarker);
      }
    });

    const isValidInput = (el) => {
      if (el.getAttribute(this.injectedMarker) === 'true') return false;
      const tag = el.tagName.toLowerCase();
      if (tag !== 'textarea' && !(tag === 'div' && el.isContentEditable)) return false;
      const rect = el.getBoundingClientRect();
      if (rect.height < 10 || rect.width < 50) return false;
      if (window.getComputedStyle(el).display === 'none') return false;
      return true;
    };

    const candidates = this.queryAllDeep(isValidInput);

    candidates.forEach(input => {
      // Walk up to find a container without overflow clipping (max 5 levels)
      let container = input.parentElement;
      for (let i = 0; i < 5 && container && container !== document.body; i++) {
        const s = window.getComputedStyle(container);
        if (s.overflow !== 'hidden' && s.overflowX !== 'hidden' && s.overflowY !== 'hidden') break;
        container = container.parentElement;
      }
      if (!container) return;

      // Get input rect for positioning
      const rect = input.getBoundingClientRect();

      // Container for multiple buttons
      const btnWrapper = document.createElement('div');
      btnWrapper.className = 'notebook-helper-wrapper';
      btnWrapper._apmTargetInput = input;
      btnWrapper.style.display = 'flex';
      btnWrapper.style.gap = '4px';
      btnWrapper.style.zIndex = '9999';

      const btn = document.createElement('button');
      btn.className = 'notebook-helper-btn';

      const placeholder = (input.getAttribute('placeholder') || input.getAttribute('aria-label') || '').toLowerCase();
      const isSearch = placeholder.includes('search') || placeholder.includes('research') || placeholder.includes('搜索');

      btn.innerHTML = isSearch ? '<span>🔍</span>' : '<span>✨</span>';
      btn.title = isSearch ? 'Search Prompts' : 'Insert Prompt';
      if (isSearch) btn.classList.add('apm-type-search');
      else btn.classList.add('apm-type-chat');

      btn.addEventListener('mousedown', e => e.preventDefault());
      btn.addEventListener('mouseenter', () => input.classList.add('apm-target-highlight'));
      btn.addEventListener('mouseleave', () => input.classList.remove('apm-target-highlight'));

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        input.classList.add('apm-target-highlight');
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });

        this.showPromptPicker(async (content) => {
          if (!input.isConnected) {
            this.showNotification(this.msg('inputNotFound', '输入框已失效'), 'error');
            return;
          }
          await this.injectIntoElement(input, content);
        });
      });

      btnWrapper.appendChild(btn);

      // Only add Quick Actions on Chat inputs, not Search inputs
      if (!isSearch) {
        // Button 1: Quick Actions
        const qaBtn = document.createElement('button');
        qaBtn.className = 'notebook-helper-btn apm-type-qa';
        qaBtn.innerHTML = '<span>⚡</span>';
        qaBtn.title = 'Power Actions';

        qaBtn.addEventListener('mousedown', e => e.preventDefault());
        qaBtn.addEventListener('mouseenter', () => input.classList.add('apm-target-highlight'));
        qaBtn.addEventListener('mouseleave', () => input.classList.remove('apm-target-highlight'));

        qaBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          input.classList.add('apm-target-highlight');
          this.showQuickActionsMenu(qaBtn, input);
        });

        btnWrapper.appendChild(qaBtn);
      }

      // Position: fixed positioning outside input (upper-right)
      btnWrapper.style.position = 'fixed';

      // Calculate position - place above the input, right-aligned
      const btnHeight = 32; // 28px button + 4px margin
      const offset = 10;

      // Platform specific positioning
      if (this.platform === 'notebooklm') {
        // NotebookLM: position at top-right outside input
        btnWrapper.style.top = (rect.top) + 'px';
        btnWrapper.style.right = (window.innerWidth - rect.right + 4) + 'px';
      } else if (this.platform === 'gemini') {
        // Gemini: position at top-right outside input
        btnWrapper.style.top = (rect.top - btnHeight - (2 * offset)) + 'px';
        btnWrapper.style.right = (window.innerWidth - rect.right) + 'px';
      } else {
        // Default: position at upper-right outside input
        btnWrapper.style.top = (rect.top - btnHeight - offset) + 'px';
        btnWrapper.style.right = (window.innerWidth - rect.right + 4) + 'px';
      }

      document.body.appendChild(btnWrapper);
      input.setAttribute(this.injectedMarker, 'true');
    });
  }
  updateHelperButtonPositions() {
    const btnHeight = 32;
    const offset = 4;

    document.querySelectorAll('.notebook-helper-wrapper').forEach(wrapper => {
      const input = wrapper._apmTargetInput;
      if (!input || !input.isConnected) {
        wrapper.remove();
        return;
      }

      const rect = input.getBoundingClientRect();

      // Hide if input is outside viewport
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        wrapper.style.display = 'none';
        return;
      }

      wrapper.style.display = 'flex';

      // Platform specific positioning
      if (this.platform === 'notebooklm') {
        wrapper.style.top = (rect.top - btnHeight - offset) + 'px';
        wrapper.style.right = (window.innerWidth - rect.right + 4) + 'px';
      } else if (this.platform === 'gemini') {
        wrapper.style.top = (rect.top - btnHeight - offset) + 'px';
        wrapper.style.right = (window.innerWidth - rect.right + 48) + 'px';
      } else {
        wrapper.style.top = (rect.top - btnHeight - offset) + 'px';
        wrapper.style.right = (window.innerWidth - rect.right + 4) + 'px';
      }
    });
  }


  showQuickActionsMenu(anchorEl, inputEl) {
    // hide existing
    const existing = document.getElementById('apm-qa-menu');
    if (existing) existing.remove();

    const menu = document.createElement('div');
    menu.id = 'apm-qa-menu';
    menu.className = 'apm-qa-menu';
    const actions = [
      { id: 'rewrite', icon: '📝', label: this.msg('qaRewriteLabel', 'Rewrite'), prompt: this.msg('qaRewritePrompt', 'Please rewrite the text above to be clearer and more professional.') },
      { id: 'summarize', icon: '📋', label: this.msg('qaSummarizeLabel', 'Summarize'), prompt: this.msg('qaSummarizePrompt', 'Please provide a concise summary of the text above.') },
      { id: 'expand', icon: '➕', label: this.msg('qaExpandLabel', 'Expand'), prompt: this.msg('qaExpandPrompt', 'Please expand on the text above and provide more details.') },
      { id: 'translate', icon: '🌐', label: this.msg('qaTranslateLabel', 'Translate to EN'), prompt: this.msg('qaTranslatePrompt', 'Please translate the text above to English.') },
      { id: 'explain', icon: '💡', label: this.msg('qaExplainLabel', 'Explain'), prompt: this.msg('qaExplainPrompt', 'Please explain the text above simply.') }
    ];

    menu.innerHTML = actions.map(act => `
      <div class="apm-qa-item" data-id="${act.id}">
        <span class="apm-qa-icon">${act.icon}</span>
        <span class="apm-qa-label">${act.label}</span>
      </div>
    `).join('');

    document.body.appendChild(menu);

    // Position relative to anchorEl
    const rect = anchorEl.getBoundingClientRect();
    menu.style.position = 'fixed';

    // Check if there's space below, else show above
    if (rect.bottom + 200 > window.innerHeight) {
      menu.style.bottom = (window.innerHeight - rect.top + 4) + 'px';
      menu.style.top = 'auto';
    } else {
      menu.style.top = (rect.bottom + 4) + 'px';
      menu.style.bottom = 'auto';
    }

    // Align right
    menu.style.right = (window.innerWidth - rect.right) + 'px';
    menu.style.left = 'auto';
    menu.style.zIndex = '2147483647';

    // Event listeners
    menu.querySelectorAll('.apm-qa-item').forEach((item, idx) => {
      item.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const action = actions[idx];
        await this.injectIntoElement(inputEl, action.prompt);
        menu.remove();
        inputEl.classList.remove('apm-target-highlight');
      });
    });

    // Close on outside click
    const closeFn = (e) => {
      if (!menu.contains(e.target) && e.target !== anchorEl) {
        menu.remove();
        inputEl.classList.remove('apm-target-highlight');
        document.removeEventListener('click', closeFn);
      }
    };
    setTimeout(() => document.addEventListener('click', closeFn), 10);
  }

  handleMessage(message, sendResponse) {
    switch (message.type) {
      case 'INSERT_PROMPT':
        this.injectPromptRobust(message.content).then(success => sendResponse({ success }));
        break;
      case 'INSERT_SHARE_CONTENT': {
        // Inject share content into social platform editors (知乎, 小红书, etc.)
        const { contentSelectors = [], titleSelectors = [], preClickSelector, promptTitle } = message;
        const shareContent = message.content || '';

        // Copy to clipboard as backup immediately
        navigator.clipboard.writeText(shareContent).catch(() => { });

        const doInject = async () => {
          // Step 1: Click "新的创作" button if needed (小红书)
          if (preClickSelector) {
            const btn = document.querySelector(preClickSelector);
            if (btn) {
              btn.click();
              await new Promise(r => setTimeout(r, 1500)); // Wait for editor to appear
            }
          }

          // Step 2: Extract title from content (first line) or use prompt title
          let titleText = promptTitle || '';
          let bodyText = shareContent;
          const lines = shareContent.split('\n');
          if (lines.length > 1 && lines[0].length < 100) {
            // First line looks like a title
            titleText = lines[0].replace(/^#+\s*/, '').trim(); // Strip markdown heading
            bodyText = lines.slice(1).join('\n').trim();
          }

          // Step 3: Inject title
          let titleInjected = false;
          if (titleText && titleSelectors.length > 0) {
            for (const sel of titleSelectors) {
              const el = document.querySelector(sel);
              if (el) {
                await this.injectIntoElement(el, titleText);
                titleInjected = true;
                break;
              }
            }
          }

          // Step 4: Inject content body
          let contentInjected = false;
          const contentText = titleInjected ? bodyText : shareContent;
          for (const sel of contentSelectors) {
            const el = document.querySelector(sel);
            if (el) {
              await this.injectIntoElement(el, contentText);
              contentInjected = true;
              break;
            }
          }

          // Fallback: try generic selectors
          if (!contentInjected) {
            const genericEl = document.querySelector('[contenteditable="true"]') || document.querySelector('textarea');
            if (genericEl) {
              await this.injectIntoElement(genericEl, shareContent);
              contentInjected = true;
            }
          }

          if (contentInjected) {
            this.showNotification('✅ 内容已自动填入，请检查后发布', 'success');
          } else {
            this.showNotification('📋 编辑器未就绪，内容已复制到剪贴板', 'info');
          }
          sendResponse({ success: contentInjected });
        };

        doInject().catch(() => {
          this.showNotification('📋 内容已复制到剪贴板', 'info');
          sendResponse({ success: false });
        });
        break;
      }
      case 'SHOW_PROMPT_PICKER':
        this.showPromptPicker();
        sendResponse({ success: true });
        break;
      case 'SAVE_FROM_CONTEXT_MENU_SUCCESS':
        this.showNotification(this.msg('contextMenuSaveSuccess', '已添加到 Prompt Ark ✓'), 'success');
        sendResponse({ success: true });
        break;
      case 'SMART_CONVERT_STATUS':
        this._handleSmartConvertStatus(message.status, message.title);
        sendResponse({ success: true });
        break;
      case 'GET_PLATFORM':
        sendResponse({ platform: this.platform });
        break;
      case 'GRAB_CONTEXT':
        this.capturePageContext();
        sendResponse({ success: true });
        break;
      case 'PROMPTS_UPDATED':
        // Invalidate slash cache so command edits are effective without page refresh.
        this.slashShortcuts = [];
        break;
      case 'UPDATE_I18N_DICT':
        if (request.dict) this.i18nDict = request.dict;
        break;
      case 'GET_SELECTION':
        sendResponse({ text: this._savedSelection || window.getSelection().toString() });
        break;
      case 'GET_PAGE_TEXT': {
        // Return cleaned page text, capped at 5000 chars
        // Exclude extension-injected DOM (Prompt Picker, selection toolbar, slash dropdown)
        const article = document.querySelector('article') || document.querySelector('main');
        let rawText = '';
        if (article) {
          const clone = article.cloneNode(true);
          clone.querySelectorAll('#ai-prompt-picker, #apm-selection-toolbar, .apm-slash-dropdown').forEach(el => el.remove());
          rawText = clone.innerText || '';
        } else {
          const bodyClone = document.body.cloneNode(true);
          bodyClone.querySelectorAll('#ai-prompt-picker, #apm-selection-toolbar, .apm-slash-dropdown').forEach(el => el.remove());
          rawText = bodyClone.innerText || '';
        }
        const cleaned = AIPromptManager.cleanExtractedText(rawText);
        sendResponse({ text: cleaned });
        break;
      }
      case 'COPY_TO_CLIPBOARD':
        navigator.clipboard.writeText(message.text || '').catch(() => { });
        sendResponse({ success: true });
        break;
      case 'SHOW_ARTICLE_SHARE_PICKER':
        this._showArticleSharePicker();
        sendResponse({ success: true });
        break;
      case 'ARTICLE_SHARE_PICK_PLATFORM':
        this._triggerArticleShare(message.platform);
        sendResponse({ success: true });
        break;
    }
  }

  // --- Article Share: Platform Picker UI ---

  _showArticleSharePicker() {
    // Remove existing picker if any
    const existing = document.querySelector('.pa-article-share-picker');
    if (existing) { existing.remove(); return; }

    const platforms = [
      { id: 'zhihu', label: '知乎', icon: '📝' },
      { id: 'reddit', label: 'Reddit', icon: '🔗' },
      { id: 'wechat', label: '公众号', icon: '💬' },
      { id: 'linkedin', label: 'LinkedIn', icon: '💼' },
      { id: 'xiaohongshu', label: '小红书', icon: '📕' },
      { id: 'twitter', label: 'Twitter/X', icon: '🐦' },
    ];

    const picker = document.createElement('div');
    picker.className = 'pa-article-share-picker';
    picker.innerHTML = `
      <div class="pa-asp-title">Share Article to...</div>
      <div class="pa-asp-grid">
        ${platforms.map(p => `
          <button class="pa-asp-btn" data-platform="${p.id}" title="${p.label}">
            <span class="pa-asp-icon">${p.icon}</span>
            <span class="pa-asp-label">${p.label}</span>
          </button>
        `).join('')}
      </div>
    `;

    // Style
    const style = document.createElement('style');
    style.textContent = `
      .pa-article-share-picker {
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        z-index: 2147483647; background: #1a1a2e; border: 1px solid rgba(255,255,255,0.1);
        border-radius: 16px; padding: 20px 24px; box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        animation: pa-asp-fadein 0.2s ease;
      }
      @keyframes pa-asp-fadein { from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
      .pa-asp-title { color: #e0e0e0; font-size: 14px; font-weight: 600; margin-bottom: 16px; text-align: center; }
      .pa-asp-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
      .pa-asp-btn {
        display: flex; flex-direction: column; align-items: center; gap: 6px;
        background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
        border-radius: 12px; padding: 14px 8px; cursor: pointer; transition: all 0.15s;
        color: #ccc; font-size: 11px; min-width: 80px;
      }
      .pa-asp-btn:hover { background: rgba(99,102,241,0.2); border-color: rgba(99,102,241,0.4); color: #fff; transform: translateY(-2px); }
      .pa-asp-icon { font-size: 24px; }
      .pa-asp-label { font-weight: 500; }
      .pa-asp-loading { position: absolute; inset: 0; background: rgba(26,26,46,0.9); border-radius: 16px; display: flex; align-items: center; justify-content: center; color: #818cf8; font-size: 14px; }
    `;
    picker.appendChild(style);

    // Click handlers
    picker.addEventListener('click', (e) => {
      const btn = e.target.closest('.pa-asp-btn');
      if (btn) {
        const platform = btn.dataset.platform;
        this._triggerArticleShare(platform);
        // Show loading state
        const loading = document.createElement('div');
        loading.className = 'pa-asp-loading';
        loading.textContent = 'Generating...';
        picker.appendChild(loading);
        // Auto-close after 30s
        setTimeout(() => picker.remove(), 30000);
      }
    });

    // Close on Escape or outside click
    const closePicker = (e) => {
      if (e.key === 'Escape' || (e.type === 'click' && !picker.contains(e.target))) {
        picker.remove();
        document.removeEventListener('keydown', closePicker);
        document.removeEventListener('click', closePicker);
      }
    };
    setTimeout(() => {
      document.addEventListener('keydown', closePicker);
      document.addEventListener('click', closePicker);
    }, 100);

    document.body.appendChild(picker);
  }

  _triggerArticleShare(platform) {
    // Grab selection or article content (prefer semantic tags over full page)
    const selection = window.getSelection().toString().trim();
    let sourceText = selection;
    if (!sourceText) {
      // Try semantic article containers first (cleaner content, less nav/sidebar noise)
      const articleEl = document.querySelector('article') || document.querySelector('[role="article"]') || document.querySelector('main') || document.querySelector('.post-content, .article-content, .entry-content, .content-body');
      const rawText = articleEl ? articleEl.innerText : (document.body.innerText || '');
      sourceText = rawText.replace(/\s+/g, ' ').trim().substring(0, 8000);
    }

    if (!sourceText) return;

    // Send to background for processing
    chrome.runtime.sendMessage({
      type: 'ARTICLE_SHARE_TO_PLATFORM',
      platform,
      sourceText,
    }, (resp) => {
      // Remove picker on response
      const picker = document.querySelector('.pa-article-share-picker');
      if (picker) picker.remove();

      if (!resp?.success && resp?.error) {
        console.warn('[ArticleShare] Failed:', resp.error);
      }
    });
  }

  // --- UI: Prompt Picker ---

  async showPromptPicker(onSelect = null) {
    if (this.pickerVisible) {
      this.hidePromptPicker();
      return;
    }

    // Save current selection before opening picker (clicking may clear selection)
    this._savedSelection = window.getSelection().toString().trim();

    if (!this.isContextValid()) {
      this.showNotification(this.msg('extensionReload', '扩展已更新，请刷新页面'), 'error');
      return;
    }

    this.onSelectCallback = onSelect;
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_PROMPTS' });
      if (!response.success) {
        this.showNotification(this.msg('loadError', '无法加载Prompts'), 'error');
        return;
      }
      this.prompts = response.prompts;
      // Smart sort: favorites first, then by most recently used
      this.prompts.sort((a, b) => {
        if (a.favorite && !b.favorite) return -1;
        if (!a.favorite && b.favorite) return 1;
        return (b.lastUsedAt || 0) - (a.lastUsedAt || 0);
      });
      this.renderPromptPicker();
      this.pickerVisible = true;
    } catch (e) {
      this.showNotification(this.msg('extensionReload', '扩展已更新，请刷新页面'), 'error');
    }
  }

  hidePromptPicker() {
    this.hideHoverPreview();
    clearTimeout(this._hoverTimer);
    const picker = document.getElementById('ai-prompt-picker');
    if (picker) picker.remove();
    this.pickerVisible = false;
    this.onSelectCallback = null;
    document.querySelectorAll('.apm-target-highlight').forEach(el => {
      el.classList.remove('apm-target-highlight');
    });
  }

  async selectPrompt(id) {
    const prompt = this.prompts.find(p => p.id === id);
    if (!prompt) return;

    // Track usage
    chrome.runtime.sendMessage({ type: 'TRACK_USAGE', id }).catch(() => { });

    // 1. Compose prompt content
    const composeResp = await chrome.runtime.sendMessage({ type: 'COMPOSE_PROMPT', prompt });
    const composedRaw = composeResp?.success ? composeResp.composed : prompt.content;

    // 2. Context Grabber: auto-resolve magic variables FIRST
    const contextResolved = await this.resolveContextVariables(composedRaw);

    // 3. Now check for remaining user-defined variables (exclude context vars)
    const variables = this.extractVariables(contextResolved).filter(v => v.type !== 'context');

    if (variables.length > 0) {
      // Show variable fill form (only manual variables remain)
      this.showVariableForm({ ...prompt, content: contextResolved }, variables);
    } else {
      if (this.onSelectCallback) {
        await this.onSelectCallback(contextResolved);
      } else {
        await this.injectPromptRobust(contextResolved);
      }
      this.hidePromptPicker();
    }
  }



  // --- UI: Variable Fill Form ---

  showVariableForm(prompt, variables) {
    // Remove picker modal content, replace with variable form
    const picker = document.getElementById('ai-prompt-picker');
    if (!picker) return;

    const modal = picker.querySelector('.apm-modal');
    modal.innerHTML = `
      <div class="apm-header">
        <span class="apm-title">${this.escapeHtml(prompt.title)}</span>
        <button class="apm-close">&times;</button>
      </div>
      <div class="apm-var-form">
        ${variables.map(v => {
      const escapedName = this.escapeHtml(v.name || v);
      const escapedRaw = this.escapeHtml(v.raw || v.name || v);

      // Enum: dropdown
      if (v.type === 'enum' && v.options) {
        return `
              <div class="apm-var-group">
                <label class="apm-var-label">${escapedName}</label>
                <select class="apm-var-input" data-var="${escapedRaw}">
                  ${v.options.map(opt => `<option value="${this.escapeHtml(opt)}">${this.escapeHtml(opt)}</option>`).join('')}
                </select>
              </div>`;
      }

      // Default value or plain text
      const defaultVal = v.type === 'default' && v.default ? this.escapeHtml(v.default) : '';
      return `
            <div class="apm-var-group">
              <label class="apm-var-label">${escapedName}</label>
              <textarea class="apm-var-input" data-var="${escapedRaw}" 
                placeholder="${defaultVal || `[${escapedName}]`}" rows="2">${defaultVal}</textarea>
            </div>`;
    }).join('')}
      </div>
      <div class="apm-actions">
        <button class="apm-btn apm-btn-cancel">Cancel</button>
        <button class="apm-btn apm-btn-primary">Insert</button>
      </div>
    `;

    // Focus first input
    const firstInput = modal.querySelector('.apm-var-input');
    if (firstInput) setTimeout(() => firstInput.focus(), 50);

    // Bind events
    modal.querySelector('.apm-close').addEventListener('click', () => this.hidePromptPicker());
    modal.querySelector('.apm-btn-cancel').addEventListener('click', () => this.hidePromptPicker());
    modal.querySelector('.apm-btn-primary').addEventListener('click', async () => {
      const values = {};
      modal.querySelectorAll('.apm-var-input').forEach(el => {
        values[el.dataset.var] = el.value;
      });

      // Resolve using raw spec as key
      let resolved = prompt.content;
      for (const [rawSpec, val] of Object.entries(values)) {
        resolved = resolved.split(`{{${rawSpec}}}`).join(val || '');
        if (!rawSpec.includes(':')) {
          resolved = resolved.split(`[${rawSpec}]`).join(val || '');
        }
      }

      if (this.onSelectCallback) {
        await this.onSelectCallback(resolved);
      } else {
        await this.injectPromptRobust(resolved);
      }
      this.hidePromptPicker();
    });
  }

  renderPromptPicker() {
    const existingPicker = document.getElementById('ai-prompt-picker');
    if (existingPicker) existingPicker.remove();

    const picker = document.createElement('div');
    picker.id = 'ai-prompt-picker';
    picker.innerHTML = `
      <div class="apm-overlay"></div>
      <div class="apm-modal">
        <div class="apm-header">
          <input type="text" class="apm-search" placeholder="Search..." autofocus>
          <button class="apm-close">&times;</button>
        </div>
        <div class="apm-list">
          ${this.renderPromptList(this.prompts)}
        </div>
      </div>
    `;
    document.body.appendChild(picker);
    this.bindPickerEvents(picker);
    setTimeout(() => picker.querySelector('.apm-search').focus(), 100);
  }

  renderPromptList(prompts) {
    if (prompts.length === 0) return '<div class="apm-empty">No prompts</div>';
    return prompts.map(p => {
      const vars = this.extractVariables(p.content);
      const varBadge = vars.length > 0
        ? `<span class="apm-item-vars">${vars.length} vars</span>`
        : '';
      const preview = this.escapeHtml(p.content.substring(0, 120));
      return `
        <div class="apm-item" data-id="${p.id}">
          <div class="apm-item-title">${this.escapeHtml(p.title)}</div>
          <div class="apm-item-preview md-content">${preview}</div>
          ${varBadge}
        </div>
      `;
    }).join('');
  }

  bindPickerEvents(picker) {
    picker.querySelector('.apm-close').addEventListener('click', () => this.hidePromptPicker());
    picker.querySelector('.apm-overlay').addEventListener('click', () => this.hidePromptPicker());

    picker.querySelector('.apm-search').addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase();
      const filtered = this.prompts.filter(p =>
        p.title.toLowerCase().includes(term) || p.content.toLowerCase().includes(term)
      );
      picker.querySelector('.apm-list').innerHTML = this.renderPromptList(filtered);
    });

    picker.querySelector('.apm-list').addEventListener('click', (e) => {
      const item = e.target.closest('.apm-item');
      if (item) {
        this.hideHoverPreview();
        this.selectPrompt(item.dataset.id);
      }
    });

    // Hover preview with 200ms delay
    this._hoverTimer = null;
    this._hoverCard = null;

    picker.querySelector('.apm-list').addEventListener('mouseover', (e) => {
      const item = e.target.closest('.apm-item');
      if (!item) return;
      clearTimeout(this._hoverTimer);
      this._hoverTimer = setTimeout(() => {
        this.showHoverPreview(item);
      }, 200);
    });

    picker.querySelector('.apm-list').addEventListener('mouseout', (e) => {
      const item = e.target.closest('.apm-item');
      if (!item) return;
      clearTimeout(this._hoverTimer);
      this.hideHoverPreview();
    });
  }

  showHoverPreview(item) {
    this.hideHoverPreview();
    const prompt = this.prompts.find(p => p.id === item.dataset.id);
    if (!prompt) return;

    const card = document.createElement('div');
    card.className = 'apm-hover-preview';
    card.textContent = prompt.content;

    document.body.appendChild(card);
    this._hoverCard = card;

    // Position relative to item
    const rect = item.getBoundingClientRect();
    let left = rect.right + 8;
    let top = rect.top;

    // Adjust if overflowing right edge
    if (left + 400 > window.innerWidth) {
      left = rect.left - 400 - 8;
      if (left < 0) left = rect.left;
    }

    // Adjust if overflowing bottom edge
    if (top + 300 > window.innerHeight) {
      top = window.innerHeight - 300 - 8;
      if (top < 0) top = 8;
    }

    card.style.left = left + 'px';
    card.style.top = top + 'px';
  }

  hideHoverPreview() {
    if (this._hoverCard) {
      this._hoverCard.remove();
      this._hoverCard = null;
    }
  }

  // --- Selection Floating Toolbar ---
  // Shows a mini-toolbar above selected text with Add / Smart Convert actions.

  initSelectionToolbar() {
    this._toolbarHideTimer = null;

    document.addEventListener('mouseup', (e) => {
      // Don't show toolbar when clicking inside the toolbar itself
      if (e.target.closest('#apm-selection-toolbar')) return;
      // Don't show inside editable elements (user is writing/editing)
      if (e.target.isContentEditable || ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      clearTimeout(this._toolbarHideTimer);
      // Small delay to let the browser finalise the selection
      setTimeout(() => {
        const sel = window.getSelection();
        const text = sel?.toString().trim();
        if (text && text.length >= 10 && sel.rangeCount > 0) {
          const rect = sel.getRangeAt(0).getBoundingClientRect();
          this.showSelectionToolbar(text, rect);
        } else {
          this.hideSelectionToolbar();
        }
      }, 50);
    });

    // Hide when selection is cleared via keyboard
    document.addEventListener('selectionchange', () => {
      const text = window.getSelection()?.toString().trim();
      if (!text) {
        this._toolbarHideTimer = setTimeout(() => this.hideSelectionToolbar(), 200);
      }
    });

    // Hide on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.hideSelectionToolbar();
    });
  }

  showSelectionToolbar(selectedText, selectionRect) {
    this.hideSelectionToolbar();
    if (!this.isContextValid()) return;

    const toolbar = document.createElement('div');
    toolbar.id = 'apm-selection-toolbar';

    const addLabel = this.msg('selectionToolbarAdd', 'Add to Prompt Ark');
    const convertLabel = this.msg('selectionToolbarConvert', 'Smart Convert');

    toolbar.innerHTML = `
      <button class="apm-toolbar-btn apm-toolbar-btn-add" data-action="add" title="${addLabel}">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
        ${addLabel}
      </button>
      <div class="apm-toolbar-divider"></div>
      <button class="apm-toolbar-btn apm-toolbar-btn-convert" data-action="convert" title="${convertLabel}">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 9.5L9.5 2M6 2h3.5v3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        ${convertLabel}
      </button>
    `;

    // Position: above the selection, centred horizontally
    document.body.appendChild(toolbar);
    const tbRect = toolbar.getBoundingClientRect();
    const GAP = 8;
    let top = selectionRect.top - tbRect.height - GAP;
    let left = selectionRect.left + (selectionRect.width / 2) - (tbRect.width / 2);

    // Clamp to viewport
    if (top < 8) top = selectionRect.bottom + GAP;
    left = Math.max(8, Math.min(left, window.innerWidth - tbRect.width - 8));

    toolbar.style.top = top + 'px';
    toolbar.style.left = left + 'px';

    // Prevent mousedown from clearing selection
    toolbar.addEventListener('mousedown', (e) => e.preventDefault());

    toolbar.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      this.hideSelectionToolbar();
      window.getSelection()?.removeAllRanges();

      if (action === 'add') {
        try {
          const resp = await chrome.runtime.sendMessage({ type: 'QUICK_ADD_SELECTION', text: selectedText, pageTitle: document.title, pageUrl: location.href });
          if (resp?.success) {
            this.showNotification(this.msg('contextMenuSaveSuccess', 'Added to Prompt Ark ✓'), 'success');
          }
        } catch (err) {
          this.showNotification('Error saving prompt', 'error');
        }
      } else if (action === 'convert') {
        this._handleSmartConvertStatus('start');
        try {
          const resp = await chrome.runtime.sendMessage({ type: 'SMART_CONVERT_SELECTION', text: selectedText, pageTitle: document.title, pageUrl: location.href });
          if (resp?.success) {
            this._handleSmartConvertStatus('success', resp.title);
          } else {
            this._handleSmartConvertStatus('error');
          }
        } catch (err) {
          this._handleSmartConvertStatus('error');
        }
      }
    });
  }

  hideSelectionToolbar() {
    document.getElementById('apm-selection-toolbar')?.remove();
  }

  // --- Utilities ---

  showNotification(message, type) {
    const div = document.createElement('div');
    div.className = `apm-notification apm-${type}`;
    div.textContent = message;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
  }

  _handleSmartConvertStatus(status, title) {
    const TOAST_ID = 'apm-smart-convert-toast';

    const removeExisting = () => document.getElementById(TOAST_ID)?.remove();

    const STYLES = {
      base: 'position:fixed;top:20px;right:20px;z-index:999999;padding:12px 20px;border-radius:8px;font-size:14px;font-family:system-ui;box-shadow:0 4px 12px rgba(0,0,0,0.3);color:white;transition:opacity 0.3s;',
      pending: 'background:rgba(15,23,42,0.92);border:1px solid rgba(255,255,255,0.15);',
      success: 'background:#10b981;',
      error: 'background:#f59e0b;',
      no_provider: 'background:#ef4444;',
    };

    const MESSAGES = {
      start: this.msg('contextMenuConvertStart', '⏳ Converting to prompt...'),
      success: title ? `✨ ${this.msg('contextMenuConvertSuccess', 'Smart prompt saved!')}: "${title}"` : `✨ ${this.msg('contextMenuConvertSuccess', 'Smart prompt saved!')}`,
      error: this.msg('contextMenuConvertError', '❌ Smart Convert failed, saved as raw text'),
      no_provider: '❌ ' + this.msg('smartConvertNoProvider', 'Smart Convert requires an AI provider. Configure one in Prompt Ark settings.'),
    };

    if (status === 'start') {
      removeExisting();
      const toast = document.createElement('div');
      toast.id = TOAST_ID;
      toast.style.cssText = STYLES.base + STYLES.pending;
      toast.textContent = MESSAGES.start;
      document.body.appendChild(toast);
      return;
    }

    // For terminal states: replace the pending toast
    removeExisting();
    const toast = document.createElement('div');
    toast.style.cssText = STYLES.base + (STYLES[status] || STYLES.error);
    toast.textContent = MESSAGES[status] || MESSAGES.error;
    document.body.appendChild(toast);
    const duration = status === 'no_provider' ? 4000 : 3000;
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, duration);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // i18n helper: use cached dict first, then chrome.i18n, then fallback
  msg(key, fallback) {
    if (this.i18nDict && this.i18nDict[key]) return this.i18nDict[key];
    try {
      return chrome.i18n.getMessage(key) || fallback;
    } catch (e) {
      return fallback;
    }
  }

  // Load translation dictionary directly from chrome.storage (no background.js needed)
  _loadI18nDict() {
    // Inline translation map — only keys content.js actually uses
    const CONTENT_TRANSLATIONS = {
      zh_CN: {
        insertSuccess: 'Prompt 已填入',
        inputNotFound: '未找到输入框',
        extensionReload: '扩展已更新，请刷新页面',
        loadError: '无法加载Prompts',
        contextMenuSaveSuccess: '已添加到 Prompt Ark ✓',
        contextMenuConvertStart: '正在转化为 Prompt...',
        contextMenuConvertSuccess: '成功保存智能 Prompt',
        contextMenuConvertError: '智能转化失败，已保存原文',
        noPageText: '未找到页面可读取的文本内容',
        smartConvertNoProvider: '智能转换需要配置 AI 服务商，请在 Prompt Ark 设置中配置',
        selectionToolbarAdd: '添加到 Prompt Ark',
        selectionToolbarConvert: '智能转化为 Prompt',
        qaExpandLabel: '展开',
        qaExpandPrompt: '请展开以下内容',
        qaExplainLabel: '解释',
        qaExplainPrompt: '请解释以下内容',
        qaRewriteLabel: '改写',
        qaRewritePrompt: '请改写以下内容',
        qaSummarizeLabel: '总结',
        qaSummarizePrompt: '请总结以下内容',
        qaTranslateLabel: '翻译',
        qaTranslatePrompt: '请翻译以下内容',
      },
      en: {
        insertSuccess: 'Prompt inserted',
        inputNotFound: 'Input box not found',
        extensionReload: 'Extension updated, please refresh page',
        loadError: 'Failed to load Prompts',
        contextMenuSaveSuccess: 'Added to Prompt Ark ✓',
        contextMenuConvertStart: 'Converting to prompt...',
        contextMenuConvertSuccess: 'Smart prompt saved!',
        contextMenuConvertError: 'Smart Convert failed, saved as raw text',
        noPageText: 'No readable text found on page',
        smartConvertNoProvider: 'Smart Convert requires an AI provider. Configure one in Prompt Ark settings.',
        selectionToolbarAdd: 'Add to Prompt Ark',
        selectionToolbarConvert: 'Smart Convert',
        qaExpandLabel: 'Expand',
        qaExpandPrompt: 'Please expand on the following',
        qaExplainLabel: 'Explain',
        qaExplainPrompt: 'Please explain the following',
        qaRewriteLabel: 'Rewrite',
        qaRewritePrompt: 'Please rewrite the following',
        qaSummarizeLabel: 'Summarize',
        qaSummarizePrompt: 'Please summarize the following',
        qaTranslateLabel: 'Translate',
        qaTranslatePrompt: 'Please translate the following',
      }
    };

    try {
      chrome.storage.local.get('language', ({ language }) => {
        if (chrome.runtime.lastError) return;
        const locale = language || (chrome.i18n.getUILanguage().startsWith('zh') ? 'zh_CN' : 'en');
        this.i18nDict = CONTENT_TRANSLATIONS[locale] || CONTENT_TRANSLATIONS['en'];
      });
    } catch (e) { /* context invalidated */ }

    // Also listen for language changes in real-time
    try {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'sync' && changes.language) {
          const locale = changes.language.newValue || 'en';
          this.i18nDict = CONTENT_TRANSLATIONS[locale] || CONTENT_TRANSLATIONS['en'];
        }
      });
    } catch (e) { /* context invalidated */ }
  }

  // --- Slash Commands ---

  initSlashCommands() {
    // Use capture phase to detect slash input across all platforms
    document.addEventListener('input', (e) => this.handleSlashInput(e), true);
    document.addEventListener('keydown', (e) => this.handleSlashKeydown(e), true);
  }

  getInputText(el) {
    if (!el) return '';
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') return el.value;
    return el.textContent || el.innerText || '';
  }

  async handleSlashInput(e) {
    const el = e.target;
    if (!el) return;
    const tag = el.tagName?.toLowerCase();
    const isTextInput = tag === 'input' && (el.type === 'text' || el.type === 'search');
    if (tag !== 'textarea' && !isTextInput && !(tag === 'div' && el.isContentEditable)) return;

    const text = this.getInputText(el);
    // Trigger on single slash command token at the end (e.g. "/" or "hello /sum")
    const match = text.match(/(^|\s)\/([^\s\/]*)$/);

    if (!match) {
      this.hideSlashDropdown();
      return;
    }

    const query = (match[2] || '').toLowerCase();

    // Fetch shortcuts if cache is empty
    if (this.slashShortcuts.length === 0) {
      try {
        const resp = await chrome.runtime.sendMessage({ type: 'GET_SHORTCUTS' });
        if (resp.success) this.slashShortcuts = resp.shortcuts;
      } catch (e) { return; }
    }

    const filtered = this.slashShortcuts.filter(s => {
      const normalizedShortcut = String(s.shortcut || '').replace(/^\/+/, '').toLowerCase();
      return normalizedShortcut.includes(query);
    });

    if (filtered.length === 0) {
      this.hideSlashDropdown();
      return;
    }

    this.showSlashDropdown(el, filtered, query);
  }

  showSlashDropdown(inputEl, items, query) {
    this.hideSlashDropdown();

    const dropdown = document.createElement('div');
    dropdown.className = 'apm-slash-dropdown';
    dropdown.innerHTML = items.map((item, i) => `
      <div class="apm-slash-item ${i === 0 ? 'active' : ''}" data-index="${i}">
        <span class="apm-slash-cmd">/${this.escapeHtml(item.shortcut)}</span>
        <span class="apm-slash-title">${this.escapeHtml(item.title)}</span>
      </div>
    `).join('');

    // Position near the input
    const rect = inputEl.getBoundingClientRect();
    dropdown.style.position = 'fixed';
    dropdown.style.bottom = (window.innerHeight - rect.top + 4) + 'px';
    dropdown.style.left = rect.left + 'px';
    dropdown.style.width = Math.min(rect.width, 360) + 'px';

    document.body.appendChild(dropdown);
    this.slashDropdown = dropdown;
    this.slashActiveIndex = 0;
    this._slashItems = items;
    this._slashInputEl = inputEl;
    this._slashQuery = query;

    // Click handler
    dropdown.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const item = e.target.closest('.apm-slash-item');
      if (item) {
        this.selectSlashItem(parseInt(item.dataset.index));
      }
    });
  }

  hideSlashDropdown() {
    if (this.slashDropdown) {
      this.slashDropdown.remove();
      this.slashDropdown = null;
    }
    this.slashActiveIndex = -1;
    this._slashItems = null;
    this._slashInputEl = null;
  }

  handleSlashKeydown(e) {
    if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const target = e.target;
      setTimeout(() => {
        this.handleSlashInput({ target }).catch(() => { });
      }, 0);
    }

    if (!this.slashDropdown || !this._slashItems) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      this.slashActiveIndex = (this.slashActiveIndex + 1) % this._slashItems.length;
      this.updateSlashHighlight();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      this.slashActiveIndex = (this.slashActiveIndex - 1 + this._slashItems.length) % this._slashItems.length;
      this.updateSlashHighlight();
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (this.slashActiveIndex >= 0) {
        e.preventDefault();
        e.stopPropagation();
        this.selectSlashItem(this.slashActiveIndex);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      this.hideSlashDropdown();
    }
  }

  updateSlashHighlight() {
    if (!this.slashDropdown) return;
    this.slashDropdown.querySelectorAll('.apm-slash-item').forEach((el, i) => {
      el.classList.toggle('active', i === this.slashActiveIndex);
    });
  }

  async selectSlashItem(index) {
    const item = this._slashItems?.[index];
    const inputEl = this._slashInputEl;
    if (!item || !inputEl) return;

    // Replace the /command text with the prompt content
    const text = this.getInputText(inputEl);
    const replaced = text.replace(/(^|\s)\/([^\s\/]*)$/, '$1');

    // 1. Compose with Persona/Style (Global & Local)
    const composeResp = await chrome.runtime.sendMessage({ type: 'COMPOSE_PROMPT', prompt: item });
    const composedRaw = composeResp?.success ? composeResp.composed : item.content;

    // 2. Context Grabber: auto-resolve magic variables FIRST
    const contextResolved = await this.resolveContextVariables(composedRaw);
    const finalContent = (replaced ? replaced + '\n' : '') + contextResolved;

    this.hideSlashDropdown();
    // Reset the shortcut cache so it's fresh next time
    this.slashShortcuts = [];

    // Track usage as soon as a slash command is selected.
    chrome.runtime.sendMessage({ type: 'TRACK_USAGE', id: item.id }).catch(() => { });

    // 3. Check for remaining user-defined variables
    const vars = this.extractVariables(finalContent);
    if (vars.length > 0) {
      // Set callback to inject into the original input
      this.onSelectCallback = async (content) => {
        await this.injectIntoElement(inputEl, content, { replaceAll: true });
      };

      this.renderPromptPicker();
      this.pickerVisible = true;
      // Pass finalContent as the composed text to be variable-substituted
      this.showVariableForm({ title: item.title, content: finalContent }, vars);
    } else {
      await this.injectIntoElement(inputEl, finalContent, { replaceAll: true });
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new AIPromptManager());
} else {
  new AIPromptManager();
}
