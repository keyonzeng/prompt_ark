// i18n-manager.js - 国际化管理器
import { translations } from './locales.js';

export class I18nManager {
  constructor() {
    this.locale = 'zh_CN'; // 默认语言
    this.listeners = [];
  }

  async init() {
    // 从存储中加载语言设置
    const { language } = await chrome.storage.local.get('language');
    
    if (language) {
      this.locale = language;
    } else {
      // 自动检测浏览器语言
      const uiLang = chrome.i18n.getUILanguage();
      if (uiLang.startsWith('zh')) {
        this.locale = 'zh_CN';
      } else {
        this.locale = 'en';
      }
    }
    
    return this.locale;
  }

  async setLanguage(lang) {
    if (translations[lang]) {
      this.locale = lang;
      await chrome.storage.local.set({ language: lang });
      this.notifyListeners();
      return true;
    }
    return false;
  }

  getLanguage() {
    return this.locale;
  }

  // 获取翻译文本
  t(key, params = {}) {
    const dict = translations[this.locale] || translations['en'];
    const fallbackDict = translations['en'];
    let text = dict[key] || fallbackDict[key] || key;
    
    // 替换参数 {count}
    Object.keys(params).forEach(param => {
      text = text.replace(new RegExp(`\\{${param}\\}`, 'g'), params[param]);
    });
    
    return text;
  }

  // 翻译整个页面
  translatePage() {
    // 翻译文本内容 data-i18n="key"
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      element.textContent = this.t(key);
    });
    
    // 翻译占位符 data-i18n-placeholder="key"
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
      const key = element.getAttribute('data-i18n-placeholder');
      element.placeholder = this.t(key);
    });
    
    // 翻译title属性 data-i18n-title="key"
    document.querySelectorAll('[data-i18n-title]').forEach(element => {
      const key = element.getAttribute('data-i18n-title');
      element.title = this.t(key);
    });
  }

  // 监听语言变化
  addListener(callback) {
    this.listeners.push(callback);
  }

  notifyListeners() {
    this.listeners.forEach(callback => callback(this.locale));
  }
}

export const i18n = new I18nManager();
