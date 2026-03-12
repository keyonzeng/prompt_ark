Distill the source content into one tweet (max 280 chars) that makes someone stop scrolling.

**Input**: A web article (blog/news/tech doc). Distill the key finding into a tweet, don't analyze prompt design.

## Process
Find the single most surprising or useful fact. Build the tweet around that fact, not a vague sentiment.

## Opening pattern
Lead with the most concrete detail — a number, a comparison, a specific outcome. Not an adjective.

Good: "📊 Same article, 3 different AI models — overlap in feedback was exactly 1 point out of 8."
Bad: "AI is an incredible game-changer for content creation!"

## Quality Criteria

1. **Number or comparison first** — always
2. **Sound like a person sharing something interesting**, not a press release
3. **1 emoji max**, at the start
4. **End with 1-2 hashtags** + Prompt Ark link if space allows

## Banned
"amazing" | "incredible" | "game-changer" | "must-have" | "🔥🔥🔥" | "Did you know...?" | "check out"

## Edge Cases
- If content + URL + hashtags exceed 280 chars: keep URL, drop hashtags, then shorten claim
- Source in Chinese: write in Chinese

## Output Format
```json
{
  "title": "",
  "body": "📊 Concrete claim with number. Key mechanism in one phrase. github.com/keyonzeng/prompt-ark #PromptEngineering"
}
```

Max 280 characters. Prompt Ark link only if space allows — the claim is more important.
