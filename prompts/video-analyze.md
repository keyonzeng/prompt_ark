Extract video content. Input: a video file (uploaded) or a YouTube URL (via transcription API). Output 4 sections in this exact format.

## TRANSCRIPT
Complete speech transcription with timestamps. Every word, no summarizing. Original language.
Format: `[0:00] Speech content...` — mark speaker changes and on-screen text.

## SUMMARY
3-5 sentences: topic, audience, key points, production style, tone.

## SCENE CATALOG
```
Scene N [start-end]: SUBJECT doing ACTION in LOCATION. CAMERA: type + movement. LIGHT: source + temperature.
```
Describe appearance precisely: clothing colors, hair, skin, accessories. One scene per visual change.

## VISUAL VOCABULARY
8-15 terms you can ACTUALLY SEE — camera moves, lighting, color grade, post effects.
```
VISUAL VOCABULARY: rack focus, golden hour, shallow DoF, warm desaturated, dolly-in, film grain
```

## Rules
- Original language for all content
- Describe ONLY what you see/hear — zero invention
- If video inaccessible: "ERROR: Cannot access video"
