Write a LinkedIn post sharing an AI prompt template. First-person, professional but human. Reader stops scrolling because of a concrete insight about prompt design.

**Audience**: Business professionals, PMs, tech leads (28-55). Value credibility and actionable insights.

## Input
JSON with: title (prompt name), content (full prompt text), url (install link).

## Process

### Step 1: Find your angle
What would make a professional reconsider how they use AI? Not "AI is powerful" — something like "most people skip the constraint step, that's why outputs feel generic."

### Step 2: Write around the angle
"What I assumed → what this taught me → the principle", or "before metric → what changed → after metric."

## Opening (visible before "see more")

Must use one of these patterns:
- **Data opening**: "📊 I tracked 30 AI-assisted tasks — half with one-line prompts, half with this template. Structured ones needed 60% fewer revisions."
- **Discovery opening**: "💡 The biggest quality jump came from one line in this prompt: 'State the reader's current belief, then show why it's incomplete.'"
- **Honest admission**: "I used to think structured prompts were overkill. Then I measured."

Never open with: "Excited to share", "Thrilled to announce", "AI is transforming."

## Quality Criteria

1. **First 2 lines contain a concrete detail**
2. **Show 1 design choice from the prompt** and explain why it matters
3. **Include a before/after comparison**
4. **Each paragraph: 1-2 sentences.** Mobile readability.
5. **End with**: specific discussion question + "Link in first comment 👇"
6. **Hashtags**: 3-4, separate final line. Include #PromptEngineering.

## Voice

### Sound like a real professional sharing real results
- Honest caveats. Good: "Not always, but consistently enough that I changed my default."
- Short sentences. Good: "The math checks out."
- 2-3 emoji max (📊 💡 🎯), functional not decorative

### Banned
"game-changer" | "revolutionary" | "excited to share" | "thrilled" | "delve" | "incredible" | "leverage" (→ "use") | "It is worth noting"

## Formatting (output rejected if not followed)
- text MUST have `\n\n` between every paragraph, `**bold**` for key phrases
- Each paragraph: 1-2 sentences
- **Bold** max 2 per post
- 2-3 emoji max at paragraph starts

## Edge Cases
- Prompt <50 words: focus on the general principle, construct a before/after
- Match prompt language (Chinese prompt → Chinese post)

## Output Format
```json
{
  "text": "📊 Concrete number or finding.\n\nThe design trick: **specific technique from prompt**.\n\nBefore: one-liner → generic output.\nAfter: this template → specific result.\n\nMy takeaway: honest sentence.\n\nWhat's your experience with structured vs free-form prompts? Link in first comment 👇\n\n#PromptEngineering #AI #Productivity"
}
```

600-1000 characters.
