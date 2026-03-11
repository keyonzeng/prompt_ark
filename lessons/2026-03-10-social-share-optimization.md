# Lessons Learned: Social Share Prompt Optimization (2026-03-10)

## Session Summary
Optimized all 6 social share meta prompts (Twitter/Reddit/Zhihu/WeChat/Xiaohongshu/LinkedIn), added LinkedIn as new platform, updated WeChat to auto-inject, implemented source context storage for Smart Convert.

## Lesson 1: Meta Prompt 的详细程度需要适度
**问题**: 第一版优化把知乎 prompt 从 18 行扩展到 50 行，加了大量细节（读者心理画像、4 段硬结构、排版规范等）。用户认为过于冗长，手动砍回简洁版。

**根因**: 把"研究结论"和"给 LLM 的指令"混淆了。研究显示知乎需要 1600-2000 字深度文章，但 meta prompt 本身不需要把所有研究细节都塞进去 — LLM 已经知道知乎的风格。

**原则**: 
- Meta prompt 应该声明式地描述"要什么"，而非过程式地教 LLM "怎么写"
- 研究结论用于确定**关键约束**（字数、结构、禁忌），不要变成写作教程
- 15-25 行是 share prompt 的甜区，超过就是噪音

## Lesson 2: 先推后拉 — 先提交再优化
**问题**: 用户误操作 reject 掉了所有改动，需要恢复。

**教训**: Git 是救命稻草。因为所有改动在 reject 前已经 commit + push（`4d347d2`），一条 `git checkout HEAD -- <files>` 就全部恢复了。如果没有先 push，这些改动就可能丢失。

**原则**: 完成一组相关改动后立即 commit + push，不要等"完美"了再提交。

## Lesson 3: 不要假设用户需要什么
**问题**: 用户说"慢"时，我直接跳过 LLM 调用用模板替代。用户反驳：LLM 优化是必须的，问题是 prompt 质量不够，不是要跳过它。

**根因**: 把"性能优化"当作唯一解法，没有考虑用户的真实意图是"质量优化"。

**原则**: 
- 先确认用户的优化方向（速度 vs 质量 vs 两者）
- 不要自作主张砍功能来解决性能问题
- 性能优化应该通过架构改进（streaming、并行、缓存），而非降级功能

## Lesson 4: 多平台分享系统的架构模式
本次实现揭示了一个清晰的分层模式：

| 层 | 文件 | 职责 |
|---|-------|------|
| Meta Prompt | `prompts/share-{platform}.md` | 平台特定的内容生成指令 |
| Schema | `lib/ai/share.js` | 平台列表 + 编辑器选择器 + LLM 调用 |
| Handler | `lib/popup/share-manager.js` | 平台路由 + 发布策略（URL/clipboard/auto-inject） |
| UI | `popup.html` | 按钮定义 |
| i18n | `locales.js` | 双语标签 |

新增平台的清单：
1. 写 `prompts/share-{name}.md`
2. 加入 `SHARE_PLATFORM_NAMES`
3. 如需 auto-inject，加入 `SOCIAL_EDITORS`
4. 加入 `prompt-loader.js` 预加载列表
5. 加入 `share-manager.js` handler + fallback
6. 加入 `popup.html` 按钮
7. 加入 `locales.js` 双语

## Lesson 5: Auto-inject 平台 vs URL 平台的边界
- **URL 平台**（Twitter/Reddit）: `window.open` + URL 参数预填
- **Clipboard 平台**（LinkedIn/WeChat via non-inject）: 复制到剪贴板 + 打开页面
- **Auto-inject 平台**（知乎/小红书/微信公众号）: `chrome.scripting.executeScript` + MAIN world 注入

选择哪种取决于：平台是否支持 URL 参数预填 → 是否已登录可注入 → 最后 fallback 到剪贴板。
