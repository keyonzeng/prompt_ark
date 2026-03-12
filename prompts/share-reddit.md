Write a Reddit self-post sharing an AI prompt template. Reader should think "this is genuinely useful" — not feel like they're reading a product pitch.

**Audience**: Reddit power users (20-40), technically literate, anti-marketing. Upvote detailed breakdowns and "I built this" transparency.

## Input
JSON with: title (prompt name), content (full prompt text), url (install link).

## Process

### Step 1: Analyze the prompt
- What specific problem does it solve?
- What's the cleverest design choice?
- What happens if you just ask the AI the same question in one line?

### Step 2: Write around the analysis
"Common mistake → how this fixes it → principle behind it", or "before/after comparison → why the difference exists." Not a fixed template.

## Opening (most important 2 sentences)

Must use one of these patterns:
- **Personal experience**: "I've been testing structured vs unstructured prompts for code review. One-liner gives you a generic checklist. This one forces the AI to identify the code's intent first — which means it catches logic bugs, not style issues."
- **Comparison**: "One-line prompt: 'review this code' → generic checklist. This prompt: 'state what this code attempts, then evaluate against that intent' → found a race condition I'd missed."

Never open with: "Has anyone else...", "I'm excited to share...", "Check out this tool."

## Quality Criteria

1. **Title (≤120 chars)**: `[Category] concrete benefit`. No clickbait.
2. **Show the prompt** — blockquote 2-3 interesting lines, follow each with 1-2 sentences explaining the design
3. **Include a before/after**: one-line prompt vs this template → concrete difference
4. **End with install link** ("Full prompt: [url]") + genuine discussion question with teeth
5. **Lists max 2 items.** More → weave into prose.

## Voice

### Sound like a person, not a press release
- Use "I". Good: "I tried this three ways." Bad: "Multiple approaches were evaluated."
- Casual transitions. Good: "Here's the thing", "The weird part is." Bad: "However", "Furthermore."
- Imperfect phrasing. Good: "Not elegant, but it works." Bad: "demonstrates robust performance."

### Banned
"amazing" | "incredible" | "game-changer" | "check out my tool" | "delve" | "landscape" | "leverage" (→ "use") | "utilize" (→ "use") | "It is worth noting"

## Formatting (output rejected if not followed)
- body MUST contain full reddit markdown: `##`, `>`, `**bold**`, `\n\n`
- body must have ≥2 `##` and ≥3 `\n\n`
- Paragraphs 2-5 sentences max
- Prompt excerpts in `>` blockquotes or fenced code blocks

## Edge Cases
- Prompt <50 words or simple: focus on "structured vs unstructured" comparison
- Match prompt language (Chinese prompt → write in Chinese)

## Output Format
```json
{
  "title": "[Category] Concrete benefit (≤120 chars)",
  "body": "## The Problem\n\nSpecific issue. **Key term**.\n\n## How This Prompt Solves It\n\n> Quoted prompt excerpt\n\nWhy this works — 1-2 sentences.\n\n## Before vs After\n\nOne-line vs structured.\n\nFull prompt: [url]\n\nDiscussion question with teeth?"
}
```

300-500 words.
