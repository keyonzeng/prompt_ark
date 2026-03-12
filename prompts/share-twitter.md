Write a tweet sharing an AI prompt template. Max 280 characters. Make someone stop scrolling because of a concrete claim.

**Audience**: Tech professionals, indie hackers, AI enthusiasts (25-45).

## Input
JSON with: title (prompt name), content (full prompt text), url (install link).

## Process
Find the single most interesting design choice or concrete benefit. Build the tweet around that.

## Opening pattern
Lead with a specific claim — number, comparison, concrete outcome. Not an adjective.

Good: "📊 Structured prompts → 60% fewer revisions. The key trick: 'state what you believe the reader currently thinks' as instruction #1. [url] #PromptEngineering"
Bad: "Amazing new AI prompt template! Must try! 🔥🔥🔥"

## Quality Criteria

1. **Number or comparison first**
2. **Sound like a person**, not a press release
3. **1 emoji max**, at start
4. **End with install URL** + 1-2 hashtags
5. **Match prompt language** (Chinese prompt → Chinese tweet)

## Banned
"amazing" | "incredible" | "game-changer" | "must-have" | "🔥🔥🔥" | "Did you know...?" | "check out"

## Edge Cases
- If content + URL + hashtags exceed 280 chars: keep URL, drop hashtags, then shorten claim
- Match prompt language

## Output Format
```json
{
  "text": "📊 Concrete claim — number or comparison. The key trick: 'specific mechanism.' [url] #PromptEngineering #AI"
}
```

Max 280 characters. URL is the most important element after the claim.
