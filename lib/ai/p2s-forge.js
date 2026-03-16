// lib/ai/p2s-forge.js — Prompt-to-Skill Generation + OpenClaw Push (separated)
import { fetchWithTimeout, getActiveProvider, safeParseJSON } from './provider.js';
import { callGeminiWeb } from '../gemini-web.js';
import { LocalStorage } from '../storage.js';

/**
 * Generate a Skill JSON structure from a Prompt via LLM.
 * Returns the parsed skill payload (not pushed anywhere).
 */
export async function generateSkillWithAI(promptData) {
    const provider = await getActiveProvider();
    if (!provider) throw new Error('No AI provider configured');

    const systemPrompt = `You are the Prompt-to-Skill (P2S) Forge, an expert at transforming static prompts into autonomous agentic Skills.
Your goal is to output a single JSON object containing the files needed for a .agent/skills/<skill-name> directory.

INPUT PROMPT DATA:
Title: ${promptData.title}
Category: ${promptData.category}
Content:
\`\`\`
${promptData.content}
\`\`\`

TASK:
1. Infer the dynamic context needed for this prompt to run.
2. Infer the MCP tools needed to gather this context.
3. Generate a SKILL.md containing the rules for gathering context, executing the core logic from references, and verifying the output.
   - DO NOT copy the prompt content into SKILL.md. Tell the agent to read from \`references/\`.
   - Ensure the SKILL.md includes a frontmatter with \`name\` and \`description\`.
4. Output EXACTLY a JSON object with this shape:
{
  "skill_name": "kebab-case-name",
  "description": "Short description of the skill to ensure it triggers correctly.",
  "files": {
    "SKILL.md": "---\\nname: kebab-case-name\\ndescription: ...\\n---\\n\\n# Skill Title\\n\\n## 1. Context Gathering\\n...\\n\\n## 2. Core Execution\\n...\\n\\n## 3. Autonomous Verification\\n...\\n"
  }
}

Do not include markdown code fences like \`\`\`json. Output ONLY valid JSON.`;

    let generatedJson;

    if (provider.type === 'gemini') {
        const model = provider.model || 'gemini-2.0-flash';
        const resp = await fetchWithTimeout(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-goog-api-key': provider.apiKey },
                body: JSON.stringify({
                    systemInstruction: { parts: [{ text: "You only output JSON." }] },
                    contents: [{ parts: [{ text: systemPrompt }] }],
                    generationConfig: { responseMimeType: "application/json" }
                }),
            }
        );
        if (!resp.ok) {
            const errText = await resp.text();
            throw new Error(`Gemini API ${resp.status}: ${errText}`);
        }
        const data = await resp.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('Gemini returned empty response');
        generatedJson = text;

    } else if (provider.type === 'openai') {
        const resp = await fetchWithTimeout(`${provider.apiUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${provider.apiKey}` },
            body: JSON.stringify({
                model: provider.model || 'gpt-4o-mini',
                response_format: { type: "json_object" },
                messages: [
                    { role: 'system', content: "You only output JSON." },
                    { role: 'user', content: systemPrompt },
                ],
            }),
        });
        if (!resp.ok) {
            const errText = await resp.text();
            throw new Error(`OpenAI API ${resp.status}: ${errText}`);
        }
        const data = await resp.json();
        const text = data.choices?.[0]?.message?.content;
        if (!text) throw new Error('OpenAI returned empty response');
        generatedJson = text;

    } else if (provider.type === 'gemini-web') {
        let text = await callGeminiWeb(systemPrompt);
        // Sanitize: strip image URLs that Gemini Web sometimes generates
        text = text.replace(/https?:\/\/[^\s]*googleusercontent\.com\/image_generation_content[^\s]*/g, '').trim();
        // Strip markdown fences: ```json ... ``` or ``` ... ```
        text = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/, '').trim();
        generatedJson = text;
    } else {
        throw new Error('Unsupported AI provider type for P2S generation');
    }

    // Robust JSON extraction: find the outermost { ... } block
    let payload;
    try {
        payload = safeParseJSON(generatedJson);
    } catch (e1) {
        // Fallback: extract JSON object from surrounding text
        const jsonMatch = generatedJson.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                payload = safeParseJSON(jsonMatch[0]);
            } catch (e2) {
                throw new Error('AI output parsing failed (extracted block also invalid). Raw start: ' + generatedJson.substring(0, 200));
            }
        } else {
            throw new Error('AI output contains no JSON object. Raw start: ' + generatedJson.substring(0, 200));
        }
    }

    if (!payload.skill_name || !payload.files || !payload.files['SKILL.md']) {
        throw new Error('AI generated JSON missing required Skill fields');
    }

    payload.source_prompt_id = promptData.id;
    return payload;
}

/**
 * Push a skill payload to the OpenClaw local endpoint.
 */
export async function pushSkillToOpenClaw(skillPayload) {
    const openclawConfig = await LocalStorage.get('openclaw') || { endpoint: '', apiKey: '' };
    if (!openclawConfig.endpoint) {
        throw new Error('OpenClaw Endpoint is not configured in Settings');
    }

    const pushUrl = openclawConfig.endpoint.replace(/\/$/, '');
    const pushResp = await fetchWithTimeout(pushUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(openclawConfig.apiKey ? { 'Authorization': `Bearer ${openclawConfig.apiKey}` } : {})
        },
        body: JSON.stringify(skillPayload)
    }, 10000);

    if (!pushResp.ok) {
        let errDetails = '';
        try { errDetails = await pushResp.text(); } catch (e) { }
        throw new Error(`OpenClaw [${pushResp.status}] ${errDetails.substring(0, 100)}`);
    }

    return true;
}
