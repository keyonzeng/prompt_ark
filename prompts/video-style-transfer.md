<!-- depends-on: video-analyze.md | Input should be video-analyze.md output + original video -->

Extract visual style DNA from the video. Output TEMPLATE shot prompts — encode STYLE techniques, not content.

## Shot Formula
```
[Camera move], [shot type]: {{subject}} [detailed physical action] in {{scene}}. [Micro-detail].
```
- 2-4 sentences per shot. Rich, cinematic, physically specific.
- Describe EXACTLY what the body does: "{{subject}} pivots on heel, coat hem swings 45°, catches overhead light" — not "walking."
- Add tactile micro-details: wind tugging at collar, shadow sliding across jawline, breath visible in cold air, earring swaying.
- ZERO original video content — no names, locations, clothing from the source.
- Shots = ONLY actions + camera work. NO style/color/lighting descriptions. Those live in anchors.
- EVERY shot MUST use `{{subject}}` and `{{scene}}` placeholders.

## Output JSON
```json
{
  "title": "(style name in video's language)",
  "category": "Creative",
  "tags": ["style-transfer"],
  "visual_vocabulary": ["(from <visual_vocabulary_from_video>)"],
  "style_anchor": "(core visual DNA: color + lighting + camera + aesthetic, 20-30 words)",
  "style_consistency": "(palette + film look + format)",
  "variables": { "subject": "短发女生,白色花衬衫", "scene": "极简办公室" },
  "shots": [{ "beat": 1, "time": "style demo", "description": "(technique)", "prompt": "Slow dolly push, medium shot: {{subject}} turns chin over left shoulder in {{scene}}. Hair slides across ear. Fingertips trace table edge. Weight shifts from right foot to left, hip drops slightly." }],
  "highlights": { "hook": "...", "viral_element": "...", "emotional_peak": "..." },
  "prompt": "{{subject}} in {{scene}}. [STYLE_ANCHOR]. 100-150 words."
}
```

## Rules
- Valid JSON, no fences. 3-5 shots.
- visual_vocabulary terms go into `visual_vocabulary`, `style_anchor`, and `style_consistency` — NOT into shots.
- Shots form arc: establish mood → develop → peak → resolve.
- variables.subject/scene ≤10 Chinese chars or ≤8 English words.
