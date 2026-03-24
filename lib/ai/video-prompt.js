// lib/ai/video-prompt.js — Multi-platform video → Prompt generation (Phase 1 + 2)
import { fetchWithTimeout, getActiveProvider, keepAlive, safeParseJSON } from './provider.js';
import { callGeminiWeb } from '../gemini-web.js';
import { loadPrompt } from '../prompt-loader.js';

// Parse Phase 1 analysis output to extract transcript, summary, and full text
// Tolerant of heading format variations (##, ###, **, etc.)
export function parseVideoAnalysis(analysis) {
    const headerPattern = (name) => new RegExp(`(?:#{1,4}|\\*{2})\\s*${name}\\s*(?:\\*{2})?\\s*\\n([\\s\\S]*?)(?=\\n(?:#{1,4}|\\*{2})\\s*(?:SUMMARY|SCENE|TRANSCRIPT|VISUAL|CRITICAL)|$)`, 'i');
    const transcriptMatch = analysis.match(headerPattern('TRANSCRIPT'));
    const summaryMatch = analysis.match(headerPattern('SUMMARY'));

    // Extract visual vocabulary from Phase 1 (where Gemini actually watches the video)
    const vocabMatch = analysis.match(/VISUAL VOCABULARY:\s*(.+)/i);
    const visualVocabulary = vocabMatch
        ? vocabMatch[1].split(',').map(t => t.trim()).filter(t => t.length > 0)
        : [];

    // Extract summary and clean potential VISUAL VOCABULARY contamination (inline or multi-line blocks)
    let summary = summaryMatch ? summaryMatch[1].trim() : '';
    summary = summary.replace(/^\s*VISUAL VOCABULARY:[^\n]*(?:\n(?!\s*#)[^\n]*)*/gm, '').trim();

    return {
        transcript: transcriptMatch ? transcriptMatch[1].trim() : '',
        summary,
        visualVocabulary,
        fullText: analysis.trim(),
    };
}

// Parse video URL and detect platform + orientation
export function parseVideoUrl(url) {
    try {
        const u = new URL(url);
        const host = u.hostname.replace(/^www\./, '');

        if ((host === 'youtube.com') && u.pathname.startsWith('/shorts/')) {
            const id = u.pathname.split('/shorts/')[1]?.split(/[/?#]/)[0];
            return id ? { platform: 'youtube-shorts', videoUrl: `https://www.youtube.com/watch?v=${id}`, isVertical: true } : null;
        }
        if ((host === 'youtube.com') && u.searchParams.has('v')) {
            return { platform: 'youtube', videoUrl: url, isVertical: false };
        }
        if (host === 'youtu.be' && u.pathname.length > 1) {
            return { platform: 'youtube', videoUrl: url, isVertical: false };
        }
        if (host === 'tiktok.com' || host === 'vm.tiktok.com' || host.endsWith('.tiktok.com')) {
            return { platform: 'tiktok', videoUrl: url, isVertical: true };
        }
        if (host === 'douyin.com' || host === 'v.douyin.com' || host.endsWith('.douyin.com')) {
            return { platform: 'douyin', videoUrl: url, isVertical: true };
        }
        if (host === 'kuaishou.com' || host === 'v.kuaishou.com' || host.endsWith('.kuaishou.com')) {
            return { platform: 'kuaishou', videoUrl: url, isVertical: true };
        }
        return null;
    } catch {
        return null;
    }
}

// Fetch metadata via YouTube oEmbed (free, no API key)
async function fetchYouTubeMetadata(videoUrl) {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;
    const resp = await fetchWithTimeout(oembedUrl, {}, 10000);
    if (!resp.ok) throw new Error(`Could not fetch video metadata (HTTP ${resp.status}). The video may be private or unavailable.`);
    const data = await resp.json();
    return { title: data.title || '', author: data.author_name || '', thumbnailUrl: data.thumbnail_url || '' };
}

// Fetch metadata via TikTok oEmbed (free, no API key)
async function fetchTikTokMetadata(videoUrl) {
    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl)}`;
    const resp = await fetchWithTimeout(oembedUrl, {}, 10000);
    if (!resp.ok) throw new Error(`Could not fetch TikTok metadata (HTTP ${resp.status}).`);
    const data = await resp.json();
    return { title: data.title || '', author: data.author_name || '', thumbnailUrl: data.thumbnail_url || '' };
}

// Unified metadata dispatcher
export async function fetchVideoMetadata(platform, videoUrl) {
    switch (platform) {
        case 'youtube':
        case 'youtube-shorts':
            return fetchYouTubeMetadata(videoUrl);
        case 'tiktok':
            return fetchTikTokMetadata(videoUrl);
        case 'douyin':
        case 'kuaishou':
            return { title: '(metadata unavailable — prompt will be inferred from URL)', author: '', thumbnailUrl: '' };
        default:
            throw new Error(`Unsupported platform: ${platform}`);
    }
}

// Build the user content string from metadata
function buildVideoUserContent(videoUrl, metadata, platform, isVertical) {
    return JSON.stringify({
        url: videoUrl,
        platform,
        is_vertical: isVertical,
        title: metadata.title,
        author: metadata.author,
        description: metadata.description || '(not available)',
    }, null, 2);
}

// Unified AI dispatch for video prompt generation (all platforms, all providers)
export async function generateVideoPromptWithAI(videoUrl, mode = 'both', targetLang = '') {
    const stopKeepAlive = keepAlive();
    try {
        const parsed = parseVideoUrl(videoUrl);
        if (!parsed) {
            throw new Error('Unsupported URL. Supported: YouTube, YouTube Shorts, TikTok, 抖音, 快手');
        }

        const metadata = await fetchVideoMetadata(parsed.platform, parsed.videoUrl);
        const promptMap = { style: 'video-style-transfer', content: 'video-content-inspire', both: 'youtube-video-prompt' };
        const phase2PromptName = promptMap[mode] || 'youtube-video-prompt';
        let systemPrompt = await loadPrompt(phase2PromptName);
        console.log('[Video Prompt] Mode:', mode, '→ Phase 2 prompt:', phase2PromptName);

        if (parsed.isVertical) {
            systemPrompt += `\n\n## VERTICAL SHORT-FORM MODE (9:16) — ACTIVE\n\nThis video is from ${parsed.platform} (vertical 9:16 format). Apply these overrides:\n- Include "9:16 vertical portrait format, portrait orientation, mobile-optimized" in style_consistency — NOT in shot prompts\n- Generate 3-5 shots (shorter content)\n- Prefer close-ups and medium shots over wide shots — subject fills the vertical frame\n- First shot MUST be an attention hook (≤3 seconds)\n- Use tighter framing and more dynamic, fast-paced camera moves\n- Shots contain ONLY actions/behaviors — no format or style terms`;
        }

        if (targetLang) {
            systemPrompt += `\n\n## OUTPUT LANGUAGE\nAll output text (title, prompt, shots, anchors, descriptions, highlights) MUST be in ${targetLang}. Variables (subject/scene) also in ${targetLang}.`;
        }

        const userContent = buildVideoUserContent(parsed.videoUrl, metadata, parsed.platform, parsed.isVertical);
        const wrappedContent = `<video>\n${userContent}\n</video>`;

        const provider = await getActiveProvider();
        if (!provider) throw new Error('No active AI provider configured. Please check your settings.');

        // Base schema properties shared by all modes
        const baseProps = {
            prompt: { type: 'string', maxLength: 500 },
            title: { type: 'string', maxLength: 100 },
            category: { type: 'string', maxLength: 30 },
            tags: { type: 'array', items: { type: 'string', maxLength: 30 } },
            visual_vocabulary: { type: 'array', items: { type: 'string', maxLength: 40 } },
            shots: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        beat: { type: 'number' },
                        time: { type: 'string', maxLength: 20 },
                        description: { type: 'string', maxLength: 150 },
                        prompt: { type: 'string', maxLength: 500 },
                    },
                    required: ['beat', 'prompt'],
                },
            },
            highlights: {
                type: 'object',
                properties: {
                    hook: { type: 'string', maxLength: 200 },
                    viral_element: { type: 'string', maxLength: 200 },
                    emotional_peak: { type: 'string', maxLength: 200 },
                },
            },
        };

        const variablesSchema = {
            type: 'object',
            properties: {
                subject: { type: 'string', maxLength: 30 },
                scene: { type: 'string', maxLength: 30 },
            },
        };

        const modeExtensions = {
            style: {
                props: {
                    style_anchor: { type: 'string', maxLength: 200 },
                    style_consistency: { type: 'string', maxLength: 200 },
                    variables: variablesSchema,
                },
                required: ['prompt', 'title', 'shots', 'variables', 'visual_vocabulary', 'style_anchor'],
            },
            content: {
                props: {
                    character_anchor: { type: 'string', maxLength: 200 },
                    scene_anchor: { type: 'string', maxLength: 150 },
                    style_consistency: { type: 'string', maxLength: 200 },
                    variables: variablesSchema,
                },
                required: ['prompt', 'title', 'shots', 'variables', 'visual_vocabulary'],
            },
            both: {
                props: {
                    character_anchor: { type: 'string', maxLength: 200 },
                    scene_anchor: { type: 'string', maxLength: 150 },
                    style_anchor: { type: 'string', maxLength: 200 },
                    style_consistency: { type: 'string', maxLength: 200 },
                    variables: variablesSchema,
                },
                required: ['prompt', 'title', 'shots', 'variables', 'visual_vocabulary'],
            },
        };

        const ext = modeExtensions[mode] || modeExtensions.both;
        const outputSchema = {
            type: 'object',
            properties: { ...baseProps, ...ext.props },
            required: ext.required,
        };

        if (provider.type === 'gemini') {
            const model = provider.model || 'gemini-2.0-flash';
            const isYouTubePlatform = parsed.platform === 'youtube' || parsed.platform === 'youtube-shorts';

            let phase2Content = wrappedContent;
            let videoTranscript = '';
            let videoSummary = '';
            let phase1Vocabulary = [];

            if (isYouTubePlatform) {
                chrome.runtime.sendMessage({ type: 'VIDEO_PROMPT_PROGRESS', step: 1, message: '🎬 Phase 1/2: Gemini 正在分析视频内容...' }).catch(() => { });
                console.log('[Video Prompt] Phase 1: Analyzing video via Gemini native YouTube integration...', parsed.videoUrl);
                const analyzePrompt = await loadPrompt('video-analyze');

                const phase1Resp = await fetchWithTimeout(
                    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': provider.apiKey },
                        body: JSON.stringify({
                            systemInstruction: { parts: [{ text: analyzePrompt }] },
                            contents: [{
                                parts: [
                                    { file_data: { file_uri: parsed.videoUrl } },
                                    { text: 'Analyze this video and extract its content following the instructions.' },
                                ]
                            }],
                            generationConfig: { responseModalities: ['TEXT'] },
                        }),
                    },
                    60000
                );

                if (phase1Resp.ok) {
                    const phase1Data = await phase1Resp.json();
                    const analysis = phase1Data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    console.log('[Video Prompt] Phase 1 complete:', analysis.length, 'chars');

                    const extracted = parseVideoAnalysis(analysis);
                    videoTranscript = extracted.transcript;
                    videoSummary = extracted.summary || extracted.fullText.slice(0, 1500);
                    phase1Vocabulary = extracted.visualVocabulary;

                    const vocabTag = phase1Vocabulary.length > 0
                        ? `\n\n<visual_vocabulary_from_video>\n${phase1Vocabulary.join(', ')}\n</visual_vocabulary_from_video>`
                        : '';
                    phase2Content = `<video>\n${buildVideoUserContent(parsed.videoUrl, metadata, parsed.platform, parsed.isVertical)}\n</video>\n\n<video_analysis>\n${analysis}\n</video_analysis>${vocabTag}`;
                } else {
                    console.warn('[Video Prompt] Phase 1 failed:', phase1Resp.status, '— falling back to metadata');
                }
            }

            // Phase 2: Generate shot prompts from the extracted content
            chrome.runtime.sendMessage({ type: 'VIDEO_PROMPT_PROGRESS', step: 2, message: '🎯 Phase 2/2: 正在基于真实内容生成分镜 Prompt...' }).catch(() => { });

            const phase2Body = JSON.stringify({
                systemInstruction: { parts: [{ text: systemPrompt }] },
                contents: [{ parts: [{ text: phase2Content }] }],
                generationConfig: {
                    responseMimeType: 'application/json',
                    responseSchema: outputSchema,
                    maxOutputTokens: 8192,
                },
            });
            console.log('[Video Prompt] Phase 2 DEBUG:', {
                model,
                systemPromptLength: systemPrompt.length,
                phase2ContentLength: phase2Content.length,
                bodySize: phase2Body.length,
                schemaKeys: Object.keys(outputSchema.properties),
                required: outputSchema.required,
            });

            let phase2Resp;
            try {
                console.log('[Video Prompt] Phase 2: Sending fetch to Gemini...');
                phase2Resp = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': provider.apiKey },
                        body: phase2Body,
                    }
                );
                console.log('[Video Prompt] Phase 2: Fetch completed, status:', phase2Resp.status);
            } catch (fetchErr) {
                console.error('[Video Prompt] Phase 2 FETCH FAILED:', fetchErr.name, fetchErr.message, fetchErr.stack);
                throw new Error(`Phase 2 fetch failed: ${fetchErr.name}: ${fetchErr.message}`);
            }
            if (!phase2Resp.ok) {
                const errText = await phase2Resp.text();
                console.error('[Video Prompt] Phase 2 API error:', phase2Resp.status, errText.slice(0, 500));
                throw new Error(`Gemini API ${phase2Resp.status}: ${errText}`);
            }
            const data = await phase2Resp.json();
            const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
            let result = null;
            if (raw) {
                try {
                    result = JSON.parse(raw);
                } catch (parseErr) {
                    console.warn('[Video Prompt] JSON truncated, attempting repair...', parseErr.message);
                    let repaired = raw;
                    const lastBrace = repaired.lastIndexOf('}');
                    const lastBracket = repaired.lastIndexOf(']');
                    const cutPoint = Math.max(lastBrace, lastBracket);
                    if (cutPoint > 0) {
                        repaired = repaired.slice(0, cutPoint + 1);
                        let braces = 0, brackets = 0;
                        for (const ch of repaired) {
                            if (ch === '{') braces++; else if (ch === '}') braces--;
                            if (ch === '[') brackets++; else if (ch === ']') brackets--;
                        }
                        repaired += ']'.repeat(Math.max(0, brackets)) + '}'.repeat(Math.max(0, braces));
                        try { result = JSON.parse(repaired); } catch { /* give up */ }
                    }
                    if (!result) throw new Error('Gemini returned truncated JSON that could not be repaired');
                }
            }

            if (result && videoTranscript) result.video_transcript = videoTranscript;
            if (result && videoSummary) result.video_summary = videoSummary;
            if (result && phase1Vocabulary.length > 0) result.visual_vocabulary = phase1Vocabulary;
            if (result) result._mode = mode;
            // Defense: truncate degenerate variables
            if (result?.variables) {
                for (const k of Object.keys(result.variables)) {
                    if (typeof result.variables[k] === 'string' && result.variables[k].length > 50) {
                        result.variables[k] = result.variables[k].slice(0, 50);
                    }
                }
            }
            // Defense: truncate degenerate shot prompts
            if (result?.shots) {
                for (const shot of result.shots) {
                    if (typeof shot.prompt === 'string' && shot.prompt.length > 500) {
                        shot.prompt = shot.prompt.slice(0, 500);
                    }
                }
            }

            return result;
        }

        if (provider.type === 'openai') {
            const resp = await fetchWithTimeout(`${provider.apiUrl}/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${provider.apiKey}` },
                body: JSON.stringify({
                    model: provider.model || 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: wrappedContent },
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
            const isYouTubePlatform = parsed.platform === 'youtube' || parsed.platform === 'youtube-shorts';

            let phase2Content = wrappedContent;
            let videoTranscript = '';
            let videoSummary = '';

            if (isYouTubePlatform) {
                try {
                    chrome.runtime.sendMessage({ type: 'VIDEO_PROMPT_PROGRESS', step: 1, message: '🎬 Phase 1/2: Gemini 正在观看视频并提取内容...' }).catch(() => { });
                    console.log('[Video Prompt] Phase 1: Analyzing video via Gemini Web...');
                    const analyzePrompt = await loadPrompt('video-analyze');
                    const step1Prompt = `${analyzePrompt}\n\nVideo URL: ${parsed.videoUrl}`;
                    const analysis = await callGeminiWeb(step1Prompt);
                    console.log('[Video Prompt] Phase 1 complete:', analysis.length, 'chars');

                    const extracted = parseVideoAnalysis(analysis);
                    videoTranscript = extracted.transcript;
                    videoSummary = extracted.summary || extracted.fullText.slice(0, 1500);

                    phase2Content = `<video>\n${buildVideoUserContent(parsed.videoUrl, metadata, parsed.platform, parsed.isVertical)}\n</video>\n\n<video_analysis>\n${analysis.trim()}\n</video_analysis>`;
                } catch (e) {
                    console.warn('[Video Prompt] Phase 1 failed, falling back to metadata-only:', e.message);
                }
            }

            chrome.runtime.sendMessage({ type: 'VIDEO_PROMPT_PROGRESS', step: 2, message: '🎯 Phase 2/2: 正在基于真实内容生成分镜 Prompt...' }).catch(() => { });
            console.log('[Video Prompt] Phase 2: Generating shot prompts...');
            const webPrompt = `${systemPrompt}

Output valid JSON only, no markdown fences.

${phase2Content}`;
            let result = await callGeminiWeb(webPrompt);
            console.log('[Video Prompt] Phase 2 complete:', result.length, 'chars');
            result = result.replace(/https?:\/\/[^\s]*googleusercontent\.com\/image_generation_content[^\s]*/g, '').trim();
            result = result.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
            const jsonStart = result.indexOf('{');
            const jsonEnd = result.lastIndexOf('}');
            if (jsonStart === -1 || jsonEnd === -1) throw new Error('Could not parse JSON from Gemini Web response');
            const parsed2 = safeParseJSON(result.slice(jsonStart, jsonEnd + 1));

            if (videoTranscript) parsed2.video_transcript = videoTranscript;
            if (videoSummary) parsed2.video_summary = videoSummary;

            return parsed2;
        }

        throw new Error('Unsupported AI provider type');
    } finally {
        stopKeepAlive();
    }
}
