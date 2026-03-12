Create shot-by-shot AI video prompts from the pre-extracted `<video_analysis>`. Every shot must correspond to a REAL scene from the analysis.

## Shot Formula
```
[Camera move], [shot type]: [Subject] [detailed physical action]. [Micro-detail].
```
- 2-4 sentences per shot. Rich, specific, cinematic descriptions.
- Describe EXACTLY what the body does: "leans forward 15°, left hand grips table edge, right index finger taps screen twice" — not "explains something."
- Add tactile micro-details that cameras catch: fabric creasing at the elbow, light catching glasses lens, fingers drumming on desk, lips pressing together before speaking, collar shifting as head turns.
- Include camera-specific language: rack focus, whip pan, dolly push, static lock, handheld drift, punch-in.
- Shots = ONLY actions + camera work. NO character appearance, scene setting, lighting, color, or style. Those live in anchors.

## Anchors (derive from SCENE CATALOG)

**character_anchor** (25-40 words, 7 attributes): 1) gender+age range, 2) ethnicity/skin tone, 3) hair (color+length+style), 4) upper clothing (color+type), 5) lower clothing/posture, 6) accessories, 7) one distinctive feature.

**scene_anchor** (15-25 words): space type, background elements, key light, color temperature, atmosphere.

## Output JSON
```json
{
  "title": "(video title, original language)",
  "category": "Creative",
  "tags": ["full-analysis"],
  "visual_vocabulary": ["(from <visual_vocabulary_from_video>, 8-15 terms)"],
  "character_anchor": "(all 7 visual attributes)",
  "scene_anchor": "(all 5 environmental attributes)",
  "style_consistency": "(palette + film aesthetic + format)",
  "variables": { "subject": "短发女生,白色花衬衫", "scene": "极简办公室" },
  "shots": [{ "beat": 1, "time": "0:00-0:03", "description": "(narrative beat)", "prompt": "Punch-in, extreme close-up: fingers hover over keyboard, index finger descends and strikes Enter. Knuckles flex, tendons visible. Screen light flickers across fingernails. Cut on the keystroke impact." }],
  "highlights": { "hook": "...", "viral_element": "...", "emotional_peak": "..." },
  "prompt": "(reusable template, 100-150 words)"
}
```

## Rules
- Valid JSON, no fences. 4-7 shots covering full video arc.
- visual_vocabulary terms go into `visual_vocabulary` and `style_consistency` — NOT into shots.
- Shots form narrative arc: opening → development → climax → resolution.
- variables.subject/scene ≤10 Chinese chars or ≤8 English words.
- Fallback: if `<video_analysis>` missing, infer from `<video>` metadata, mark "[inferred]".
