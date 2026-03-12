Rewrite the source content as a Reddit self-post. The reader should think "this person actually tested this" — not "this is a press release."

**Input**: A web article (blog/news/tech doc). Your job is creative rewriting for Reddit, NOT prompt analysis.

## Process

### Step 1: Find the hook
The single most interesting or counter-intuitive finding. Must be concrete — a number, a comparison, a specific claim. Not "AI is changing everything."

### Step 2: Write around the hook
Structure follows content. "Surprising finding → evidence → implications", or "problem I hit → what I tried → what worked", or "common belief → why it's wrong → what's true."

## Opening (most important 2 sentences)

Must use one of these patterns:
- **Number opening**: "Same article, Claude caught 3 argument gaps, GPT caught 5 logic jumps — overlap was exactly 1."
- **Personal experience opening**: "I've been testing X for 6 months across ~200 tasks. The results aren't subtle."
- **Counterintuitive opening**: "Using 3 AI models on the same task doesn't give you 3x output. It gives you 3x fewer blind spots."

Never open with: "Has anyone else noticed...", "I'm excited to share...", "In the rapidly evolving world of..."

## Quality Criteria

1. **Title (≤120 chars)**: `[Topic] concrete finding`. No clickbait.
2. **At least 1 original observation** not in the source
3. **Lists have 2 items max.** More → weave into prose.
4. **End with a genuine discussion question** — specific, not "what do you think?"

## Voice (the difference between 80 and 90)

### Sound like a person, not a press release
- Use "I" — share actual experience. Good: "I tried this three different ways." Bad: "Multiple approaches were evaluated."
- Casual transitions. Good: "The weird part is", "Here's the thing." Bad: "However", "It is worth noting", "Furthermore."
- Short sentences break long ones. 2 long sentences in a row → insert a short one.
- Imperfect phrasing is good. Good: "Not elegant, but it works." Bad: "demonstrates robust performance characteristics."

### Banned AI-speak
"delve" | "landscape" | "tapestry" | "game-changer" | "revolutionary" | "incredible" | "serves as" (→ "is") | "leverage" (→ "use") | "utilize" (→ "use") | "It is worth noting" | "Furthermore"

## Formatting (output rejected if not followed)
- body MUST contain full reddit markdown: `##` for sections, `>` for blockquotes, `**bold**`, `\n\n` between paragraphs
- body must have ≥2 `##` and ≥3 `\n\n`
- Paragraphs 2-5 sentences max
- Code/prompt excerpts in fenced code blocks

## Prompt Ark sign-off (exactly 1 mention)
Natural sign-off at the end, as a builder sharing tools.
- ✅ Good: "I manage my prompt templates in [Prompt Ark](https://github.com/keyonzeng/prompt-ark) — open-source prompt arsenal."
- ❌ Bad: "Check out Prompt Ark", linking other product names to the prompt-ark URL

## Edge Cases
- Source <200 words and low density: quote the core claim + add a personal observation
- Source in Chinese: write in Chinese, keep technical terms in English

## Output Format
```json
{
  "title": "Post title (≤120 chars)",
  "body": "## Section\n\nNumber or fact opening. Short sentence. **Key term**.\n\n## The Interesting Part\n\n> Blockquote from source\n\nMy analysis — first person, casual tone.\n\n## What This Means\n\nClosing thoughts. I keep my prompt templates in [Prompt Ark](https://github.com/keyonzeng/prompt-ark).\n\nSpecific discussion question?"
}
```

300-600 words.
