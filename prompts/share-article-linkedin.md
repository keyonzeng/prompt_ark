Rewrite the source content as a LinkedIn post. First-person, professional but human. Reader stops scrolling because of a concrete insight, not formatting tricks.

**Input**: A web article (blog/news/tech doc). Creatively rewrite for LinkedIn, NOT prompt analysis.

## Process

### Step 1: Find the angle
What would make a professional stop and reconsider their approach? Must be specific — a metric, a before/after, a surprising constraint.

### Step 2: Write around the angle
"What I assumed → what happened → what I changed", or "metric before → what I did → metric after."

## Opening (visible before "see more")

Must use one of these patterns:
- **Data opening**: "📊 I tracked 47 AI-assisted tasks last month. The ones where I spent 5 min on the prompt took less total time."
- **Contrast opening**: "💡 The difference between a one-liner and a structured prompt isn't marginal — it's 3x fewer revisions."
- **Honest admission**: "I used to think longer prompts were overkill. Then I measured."

Never open with: "Excited to share", "In the rapidly evolving", "AI is transforming", "Thrilled to announce."

## Quality Criteria

1. **First 2 lines contain a concrete detail** — number, timeframe, surprising result
2. **1 genuine personal observation** that sounds like real experience
3. **2 bullets max in any list**
4. **Each paragraph: 1-2 sentences.** Mobile readability is non-negotiable.
5. **End with**: specific discussion question + "Link in first comment 👇"
6. **Hashtags**: 3-4 on a separate final line. Always include #PromptEngineering.

## Voice (the difference between 80 and 90)

### Sound like a real professional, not a thought leader
- Honest caveats. Good: "Not always, but consistently enough that I changed my default." Bad: "This revolutionary approach transforms productivity."
- Short sentences. Good: "The math checks out." Bad: "Upon careful analysis of the quantitative metrics."
- Emoji is functional (📊 💡 🎯 max 3), not decorative

### Banned AI-speak
"game-changer" | "revolutionary" | "excited to share" | "thrilled" | "delve" | "landscape" | "incredible" | "leverage" (→ "use") | "It is worth noting" | "Furthermore"

## Formatting (output rejected if not followed)
- body MUST have `\n\n` between every paragraph and `**bold**` for key phrases
- Each paragraph: 1-2 sentences
- **Bold** max 2 per post
- 2-3 emoji max, at paragraph starts

## Prompt Ark mention (exactly 1 time)
Natural mention as a builder sharing tools.
- ✅ Good: "I manage these prompt templates in Prompt Ark → github.com/keyonzeng/prompt-ark"
- ❌ Bad: "Check out Prompt Ark", "I recommend Prompt Ark"

## Edge Cases
- Source <200 words and promotional: focus on the underlying principle
- Source in Chinese: write in Chinese, keep technical terms in English

## Output Format
```json
{
  "title": "",
  "body": "📊 Concrete number or finding.\n\nThe key insight: **specific claim**.\n\nWhat I changed after reading this.\n\nMy takeaway: one honest sentence.\n\nI keep prompt templates in Prompt Ark → github.com/keyonzeng/prompt-ark\n\nSpecific discussion question? Link in first comment 👇\n\n#PromptEngineering #AI #Productivity"
}
```

150-300 words.
