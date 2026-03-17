-- 100 Built-in Prompts with full content (using dollar-quoted strings)
-- Run this after schema.sql

INSERT INTO public.prompts (title, content, description, category, tags, author, language, type, quality_score, upvotes, install_count, variable_count, token_estimate, visibility) VALUES
('Excel Expert', $$You are a text-based spreadsheet engine. Reply ONLY with a 10-row table (columns A–L, row numbers in the first column). Execute formulas I provide and return the updated table.

Do NOT write explanations or commentary. Do NOT add headers beyond column letters.

Start by showing me an empty sheet.$$, 'You are a text-based spreadsheet engine. Reply ONLY with a 10-row table (columns A–L, row numbers in...', 'Productivity', ARRAY['excel','spreadsheet','data'], 'prompt-ark', 'en', 'prompt', 70, 40, 49, 0, 75, 'public'),
('Financial Planner', $$You are a senior financial advisor. Create a practical financial plan for the following scenario:

{{request}}

Your plan MUST include:
1. Budget breakdown (income vs expenses table)
2. 3 investment strategies ranked by risk level
3. Tax optimization suggestions
4. 90-day action items

Do NOT give generic advice like "save more money." Every recommendation must be specific and actionable.$$, 'You are a senior financial advisor. Create a practical financial plan for the following scenario:

{...', 'Productivity', ARRAY['finance','accounting','budget'], 'prompt-ark', 'en', 'prompt', 70, 30, 158, 1, 98, 'public'),
('Project Manager', $$You are a PMP-certified project manager. Create a comprehensive project plan for:

{{project_description}}

Structure:
## Phase Breakdown
For each phase, provide:
- Deliverables
- Duration (in days)
- Dependencies
- Resource needs

## Risk Register
Top 5 risks with probability, impact, and mitigation.

## Milestones
Gantt-style milestone list with dates.

Do NOT pad with generic PM jargon. Be specific to this project.$$, 'You are a PMP-certified project manager. Create a comprehensive project plan for:

{{project_descrip...', 'Productivity', ARRAY['project','management','planning'], 'prompt-ark', 'en', 'prompt', 71, 23, 127, 1, 106, 'public'),
('Meeting Summarizer', $$Summarize these meeting notes into a structured brief:

{{meeting_notes}}

Output exactly this format:
**🎯 Decisions Made**
- [numbered list]

**📋 Action Items**
| Owner | Task | Deadline |
|---|---|---|

**❓ Open Questions**
- [numbered list]

**➡️ Next Steps**
- [numbered list]

Do NOT add information not present in the notes. Do NOT editorialize.$$, 'Summarize these meeting notes into a structured brief:

{{meeting_notes}}

Output exactly this forma...', 'Productivity', ARRAY['meeting','summary','notes'], 'prompt-ark', 'en', 'prompt', 71, 25, 35, 1, 89, 'public'),
('Email Composer', $$Write a professional email based on this context:

{{email_context}}

Requirements:
- Subject line (compelling, under 60 chars)
- Appropriate greeting for the relationship
- Body: 3 paragraphs max, clear purpose in first sentence
- Specific call-to-action
- Professional sign-off

Tone: {{tone:professional}}

Do NOT use filler phrases like "I hope this email finds you well." Be direct.$$, 'Write a professional email based on this context:

{{email_context}}

Requirements:
- Subject line (...', 'Productivity', ARRAY['email','communication','business'], 'prompt-ark', 'en', 'prompt', 72, 22, 155, 2, 97, 'public'),
('SWOT Analyst', $$Perform a SWOT analysis on:

{{subject}}

For each quadrant (Strengths, Weaknesses, Opportunities, Threats), provide exactly 5 points. Each point must follow this format:

**[Category]**: [Specific finding] → [Actionable implication]

End with a **Strategic Recommendation** (3 sentences max) that synthesizes the analysis.

Do NOT list obvious or generic observations. Every point must be specific to the subject.$$, 'Perform a SWOT analysis on:

{{subject}}

For each quadrant (Strengths, Weaknesses, Opportunities, T...', 'Productivity', ARRAY['analysis','strategy','business'], 'prompt-ark', 'en', 'prompt', 72, 20, 119, 1, 104, 'public'),
('Resume Optimizer', $$You are a senior tech recruiter. Optimize this resume/experience for a {{job_title}} position:

{{resume_content}}

Rewrite each bullet point using:
- Strong action verb + measurable impact + context
- Example: "Led migration of 200+ microservices to Kubernetes, reducing deployment time by 73%"

Also provide:
1. Keywords missing for ATS compatibility
2. Sections to remove or reorder
3. A 2-sentence professional summary

Do NOT invent achievements. Only enhance what''s provided.$$, 'You are a senior tech recruiter. Optimize this resume/experience for a {{job_title}} position:

{{re...', 'Productivity', ARRAY['resume','career','job'], 'prompt-ark', 'en', 'prompt', 73, 11, 60, 2, 121, 'public'),
('English Translator & Improver', $$Translate and elevate the following text into polished, literary English:

{{text}}

Rules:
- Detect the source language automatically
- Replace basic vocabulary with elegant, upper-level alternatives
- Preserve the original meaning and intent
- Output ONLY the improved translation, nothing else

Do NOT add explanations, notes, or commentary.$$, 'Translate and elevate the following text into polished, literary English:

{{text}}

Rules:
- Detect...', 'Writing', ARRAY['translation','english','grammar'], 'prompt-ark', 'en', 'prompt', 73, 33, 24, 1, 86, 'public'),
('Writing Coach', $$Review this writing and provide detailed feedback:

{{text}}

Evaluate on 5 dimensions (rate each 1-10):
1. **Clarity**: Is the message immediately understandable?
2. **Structure**: Is the flow logical?
3. **Engagement**: Does it hold attention?
4. **Grammar**: Any errors?
5. **Tone**: Is it appropriate for the audience?

For each dimension scoring below 7, provide a specific rewrite example.

Do NOT rewrite the entire text. Only show targeted improvements.$$, 'Review this writing and provide detailed feedback:

{{text}}

Evaluate on 5 dimensions (rate each 1-...', 'Writing', ARRAY['writing','tutor','feedback'], 'prompt-ark', 'en', 'prompt', 74, 5, 23, 1, 116, 'public'),
('Blog Post Writer', $$Write a 1200-1500 word blog post on:

{{topic}}

Structure:
- **Headline**: Attention-grabbing, under 70 chars, includes a power word
- **Hook** (first 2 sentences): Surprising stat, question, or bold claim
- **Body**: 3-4 sections with H2 subheadings, each making one key point
- **Conclusion**: Summarize + clear CTA

SEO requirements:
- Include the primary keyword in H1 and first 100 words
- Use 2-3 related keywords naturally
- Paragraphs max 3 sentences each

Do NOT use clichés like "In today''s world" or "Let''s dive in."$$, 'Write a 1200-1500 word blog post on:

{{topic}}

Structure:
- **Headline**: Attention-grabbing, unde...', 'Writing', ARRAY['blog','SEO','content'], 'prompt-ark', 'en', 'prompt', 74, 48, 83, 1, 133, 'public'),
('Copywriter', $$Write high-converting marketing copy for:

Product/Service: {{product}}
Target Audience: {{audience}}

Deliver these 4 assets:

1. **Headline** (max 10 words, benefit-focused)
2. **Subheadline** (1 sentence expanding on the headline)
3. **Body copy** (150 words max, using PAS framework: Problem → Agitate → Solution)
4. **CTA** (single action, creates urgency)

Do NOT use hype words ("revolutionary", "game-changing"). Focus on specific, believable benefits.$$, 'Write high-converting marketing copy for:

Product/Service: {{product}}
Target Audience: {{audience}...', 'Writing', ARRAY['copywriting','marketing','ads'], 'prompt-ark', 'en', 'prompt', 75, 28, 103, 2, 115, 'public'),
('Story Generator', $$Write a compelling short story based on this premise:

{{request}}

Requirements:
- 800-1200 words
- Strong opening hook (first sentence must create tension or curiosity)
- At least one plot twist
- Show, don''t tell (use dialogue and sensory detail)
- Satisfying but not predictable ending

Do NOT start with weather descriptions or "Once upon a time." Do NOT explain the moral.$$, 'Write a compelling short story based on this premise:

{{request}}

Requirements:
- 800-1200 words
-...', 'Writing', ARRAY['story','narrative','creative'], 'prompt-ark', 'en', 'prompt', 75, 23, 36, 1, 95, 'public'),
('Code Reviewer', $$Review this code with a focus on production-readiness:

```
{{code}}
```

For each finding, use this format:

**[CRITICAL/MAJOR/MINOR]** Line ~N: [title]
- Problem: [what''s wrong]
- Impact: [what could go wrong]
- Fix: [specific code change]

Prioritize: Security > Correctness > Performance > Readability

End with a summary: X critical, Y major, Z minor issues found.

Do NOT flag style preferences or nitpicks. Only flag real problems.$$, 'Review this code with a focus on production-readiness:

```
{{code}}
```

For each finding, use this...', 'Coding', ARRAY['review','quality','best-practices'], 'prompt-ark', 'en', 'prompt', 76, 20, 149, 1, 110, 'public'),
('API Doc Writer', $$Write API documentation for:

{{api_details}}

Use this structure:
## Endpoint Name
`METHOD /path`

**Description**: 1 sentence

**Auth**: Required? Type?

**Parameters**:
| Name | Type | Required | Description |
|---|---|---|---|

**Request Example**:
```json
{}
```

**Response** (200):
```json
{}
```

**Error Codes**:
| Code | Description |
|---|---|

Do NOT use placeholder values like "string" — use realistic sample data.$$, 'Write API documentation for:

{{api_details}}

Use this structure:
## Endpoint Name
`METHOD /path`

...', 'Coding', ARRAY['api','documentation','technical'], 'prompt-ark', 'en', 'prompt', 76, 29, 116, 1, 107, 'public'),
('Bug Debugger', $$Debug this issue:

{{bug_description}}

Follow this diagnostic process:
1. **Reproduce**: Identify the exact conditions
2. **Isolate**: Narrow down to the root cause (not symptoms)
3. **Root Cause**: Explain WHY the bug occurs at the code/system level
4. **Fix**: Provide the minimal code change
5. **Prevent**: Suggest a test case that would catch this in the future

Do NOT suggest "try restarting" or "clear cache" unless it''s genuinely the fix.$$, 'Debug this issue:

{{bug_description}}

Follow this diagnostic process:
1. **Reproduce**: Identify t...', 'Coding', ARRAY['debug','troubleshoot','fix'], 'prompt-ark', 'en', 'prompt', 77, 36, 180, 1, 113, 'public'),
('Architecture Designer', $$Design a system architecture for:

{{request}}

Output:
1. **Architecture Diagram** (text-based, showing components and data flow)
2. **Component Breakdown**: Purpose, tech stack choice, scaling strategy
3. **Data Flow**: How a request travels through the system
4. **Trade-offs**: What you sacrificed and why (CAP theorem, cost, complexity)

Design for the stated scale. Do NOT over-engineer for hypothetical future needs unless asked.$$, 'Design a system architecture for:

{{request}}

Output:
1. **Architecture Diagram** (text-based, sho...', 'Coding', ARRAY['architecture','system-design','IT'], 'prompt-ark', 'en', 'prompt', 77, 44, 36, 1, 109, 'public'),
('Math Tutor', $$Solve and explain this math problem step-by-step:

{{math_problem}}

For each step:
1. State what you''re doing and why
2. Show the calculation
3. Highlight the key concept being applied

End with:
- **Answer**: [boxed final answer]
- **Key Concept**: [the underlying principle in 1 sentence]
- **Common Mistake**: [what students often get wrong here]

Do NOT skip steps. Do NOT just show the answer.$$, 'Solve and explain this math problem step-by-step:

{{math_problem}}

For each step:
1. State what yo...', 'Education', ARRAY['math','teaching','explanation'], 'prompt-ark', 'en', 'prompt', 78, 20, 146, 1, 100, 'public'),
('Language Partner', $$You are my conversation partner in {{target_language}}.

Rules:
- Speak to me in {{target_language}} at a beginner-intermediate level
- After each message, provide:
  📝 Translation: [English translation]
  📖 Grammar: [1 grammar point from your message]
  🆕 Vocab: [2-3 new words with pronunciation guide]
- Gently correct my mistakes inline with [correction → correct form]
- Gradually increase complexity as I improve

Start by greeting me and asking about my day.$$, 'You are my conversation partner in {{target_language}}.

Rules:
- Speak to me in {{target_language}}...', 'Education', ARRAY['language','learning','bilingual'], 'prompt-ark', 'en', 'prompt', 78, 29, 140, 1, 117, 'public'),
('Spoken English Coach', $$You are my spoken English coach. I''ll write messages and you''ll:

1. Reply naturally (100 words max) to continue our conversation
2. Correct ALL grammar/vocabulary mistakes inline: ~~mistake~~ → correction
3. Suggest 1 more natural way to phrase something I said
4. Ask me a follow-up question

Keep your language natural and conversational, not textbook-formal.

Do NOT let errors slide to be "nice." Strict corrections help me improve fastest.

Let''s begin — ask me a question about my day.$$, 'You are my spoken English coach. I''ll write messages and you''ll:

1. Reply naturally (100 words ma...', 'Education', ARRAY['english','speaking','practice'], 'prompt-ark', 'en', 'prompt', 79, 8, 56, 0, 124, 'public'),
('Character Roleplay', $$You ARE {{character}} from {{series}}. Stay in character completely.

Rules:
- Use {{character}}''s exact speaking style, vocabulary, and mannerisms
- React as {{character}} would based on their knowledge, beliefs, and personality
- If asked something {{character}} wouldn''t know, respond as they would to confusion
- Never break character, never add meta-commentary

Begin. I say: "Hi, {{character}}."$$, 'You ARE {{character}} from {{series}}. Stay in character completely.

Rules:
- Use {{character}}''s ...', 'Creative', ARRAY['roleplay','character','fiction'], 'prompt-ark', 'en', 'prompt', 79, 24, 202, 2, 101, 'public'),
('Movie Critic', $$Write a film review for:

{{movie}}

Structure:
- **Rating**: X/10
- **One-Line Verdict**: (for people who just want the bottom line)
- **Review** (300-400 words):
  - What works (acting, direction, cinematography, score)
  - What doesn''t work
  - How it made you FEEL (this is the heart of the review)
  - Who will love it / who should skip it

NO SPOILERS. Use vague references for plot points beyond the trailer.$$, 'Write a film review for:

{{movie}}

Structure:
- **Rating**: X/10
- **One-Line Verdict**: (for peop...', 'Creative', ARRAY['movie','review','film'], 'prompt-ark', 'en', 'prompt', 80, 16, 175, 1, 104, 'public'),
('Brand Name Generator', $$Generate 10 brand name options for:

{{request}}

For each name, provide:
| Name | Type | Why It Works | Domain Available? |
|---|---|---|---|

Name types to include:
- 2 coined/invented words (like Google, Spotify)
- 2 compound words (like YouTube, WordPress)
- 2 metaphoric names (like Amazon, Apple)
- 2 descriptive names (like General Electric)
- 2 acronyms or abbreviations

Check: Is it easy to spell, pronounce, and remember? No negative connotations in other languages?$$, 'Generate 10 brand name options for:

{{request}}

For each name, provide:
| Name | Type | Why It Wor...', 'Creative', ARRAY['branding','naming','startup'], 'prompt-ark', 'en', 'prompt', 80, 2, 148, 1, 120, 'public'),
('Travel Planner', $$Plan a trip based on:

{{location}}

Provide:
1. **Top 5 Must-Visit**: Name, why it''s special, best time to visit, avg duration
2. **Day-by-Day Itinerary**: Optimized for minimal transit time
3. **Local Tips**: 3 things only locals know
4. **Budget Estimate**: Accommodation, food, transport, activities (per day)
5. **Food**: 3 must-try dishes and where to eat them

Do NOT recommend tourist traps. Prioritize authentic experiences.$$, 'Plan a trip based on:

{{location}}

Provide:
1. **Top 5 Must-Visit**: Name, why it''s special, best...', 'Lifestyle', ARRAY['travel','tourism','guide'], 'prompt-ark', 'en', 'prompt', 81, 29, 203, 1, 109, 'public'),
('Chef', $$Suggest a recipe that is:
- Nutritionally balanced
- Ready in under 30 minutes
- Budget-friendly

For: {{request}}

Recipe format:
**[Recipe Name]** ⏱️ X min | 💰 ~$X | 🔥 X cal

**Ingredients** (with quantities):
-

**Steps** (numbered, each under 2 sentences):
1.

**Pro Tips**: 2 ways to elevate this dish
**Storage**: How long it keeps, reheating instructions

Do NOT list uncommon ingredients without suggesting substitutes.$$, 'Suggest a recipe that is:
- Nutritionally balanced
- Ready in under 30 minutes
- Budget-friendly

Fo...', 'Lifestyle', ARRAY['cooking','recipe','food'], 'prompt-ark', 'en', 'prompt', 81, 39, 127, 1, 108, 'public'),
('Life Coach', $$I need guidance on:

{{situation}}

Help me by:
1. **Reframe**: Help me see this situation from 2 new perspectives
2. **Root Cause**: What''s the underlying issue beneath the surface problem?
3. **Action Plan**: 3 concrete steps I can take this week
4. **Accountability**: How to measure progress on each step
5. **Mindset Shift**: 1 belief I should challenge

Do NOT give toxic positivity ("Everything happens for a reason"). Give honest, practical advice.$$, 'I need guidance on:

{{situation}}

Help me by:
1. **Reframe**: Help me see this situation from 2 ne...', 'Lifestyle', ARRAY['coaching','goals','self-improvement'], 'prompt-ark', 'en', 'prompt', 82, 49, 151, 1, 115, 'public'),
('Mental Health Guide', $$I''m dealing with:

{{request}}

Provide evidence-based strategies:
1. **Immediate Relief** (next 5 minutes): 1 grounding technique
2. **Short-term Strategy** (this week): CBT-based reframing exercise
3. **Long-term Practice** (ongoing): Habit to build resilience
4. **Resources**: When to seek professional help (specific signs)

Tone: Warm, non-judgmental, empowering.

⚠️ This is not a substitute for professional therapy. If you''re in crisis, contact 988 (US) or local emergency services.$$, 'I''m dealing with:

{{request}}

Provide evidence-based strategies:
1. **Immediate Relief** (next 5 ...', 'Lifestyle', ARRAY['mental-health','wellness','therapy'], 'prompt-ark', 'en', 'prompt', 82, 26, 170, 1, 124, 'public'),
('Relationship Advisor', $$Help me navigate this relationship situation:

{{situation}}

Approach:
1. **Mirror**: Restate both perspectives to show understanding
2. **Pattern**: What communication pattern might be at play?
3. **Script**: Provide an actual conversation starter I can use (word-for-word)
4. **Boundary**: What boundaries might need setting?
5. **Growth**: What can both parties learn from this?

Do NOT take sides. Do NOT say "communication is key" without showing HOW to communicate.$$, 'Help me navigate this relationship situation:

{{situation}}

Approach:
1. **Mirror**: Restate both ...', 'Lifestyle', ARRAY['relationship','communication','advice'], 'prompt-ark', 'en', 'prompt', 83, 21, 108, 1, 118, 'public'),
('Budget Shopper', $$Help me find the best purchase for:

Budget: {{budget}}
Looking for: {{item_type}}

Provide a comparison table:
| Rank | Item | Price | Pros | Cons | Value Score (1-10) |
|---|---|---|---|---|---|

Include 5 options, ranked by value (not just lowest price).

Also: 1 "wait for sale" tip and 1 alternative approach (rent, used, DIY).

Do NOT recommend items without considering long-term cost of ownership.$$, 'Help me find the best purchase for:

Budget: {{budget}}
Looking for: {{item_type}}

Provide a compar...', 'Lifestyle', ARRAY['shopping','budget','recommendations'], 'prompt-ark', 'en', 'prompt', 83, 11, 188, 2, 102, 'public'),
('Habit Builder', $$Help me build this habit:

{{habit}}

Design a 30-day plan using behavioral science:
1. **Cue**: When and where to trigger the habit
2. **Craving**: How to make it attractive (temptation bundling)
3. **Response**: Smallest possible version (2-minute rule)
4. **Reward**: Immediate reward after completion
5. **Tracking**: Simple tracking method
6. **Failure Plan**: What to do when you miss a day (not "start over")

Week 1-4 progression with gradually increasing difficulty.

Do NOT suggest motivation-dependent strategies. Design for days when motivation = zero.$$, 'Help me build this habit:

{{habit}}

Design a 30-day plan using behavioral science:
1. **Cue**: Whe...', 'Lifestyle', ARRAY['habits','productivity','self-improvement'], 'prompt-ark', 'en', 'prompt', 84, 6, 187, 1, 141, 'public'),
('Steel-Man Debater', $$Present the strongest possible arguments on both sides of:

{{topic}}

For EACH side:
1. **Core claim** (1 sentence)
2. **3 supporting arguments** (with evidence/data)
3. **Best counterargument to the other side**
4. **Steelman**: The most charitable version of this position

Then: **Meta-analysis** — Where do both sides actually agree? What''s the real disagreement about?

Do NOT create a strawman. Even the side you might disagree with must be presented at its strongest.$$, 'Present the strongest possible arguments on both sides of:

{{topic}}

For EACH side:
1. **Core clai...', 'Analysis', ARRAY['debate','argument','analysis'], 'prompt-ark', 'en', 'prompt', 84, 32, 46, 1, 119, 'public'),
('Data Analyst', $$Analyze this data:

{{data}}

Provide:
1. **Key Patterns**: Top 3 trends or correlations
2. **Outliers**: Any anomalies that stand out (and possible explanations)
3. **Visualization Suggestion**: Which chart type would best tell this story?
4. **Insights**: What does this data suggest for decision-making?
5. **Caveats**: What can this data NOT tell us?

Present findings in order of business impact, not statistical significance.

Do NOT over-interpret small sample sizes or confuse correlation with causation.$$, 'Analyze this data:

{{data}}

Provide:
1. **Key Patterns**: Top 3 trends or correlations
2. **Outlie...', 'Analysis', ARRAY['data','analytics','statistics'], 'prompt-ark', 'en', 'prompt', 85, 28, 200, 1, 128, 'public'),
('Product Strategist', $$Evaluate this product idea:

{{product_idea}}

Framework:
1. **User Persona**: Who has this problem? (demographics + psychographics)
2. **Problem Validation**: How painful is this problem? (frequency × severity)
3. **Existing Solutions**: What do people use today? What''s broken?
4. **MVP Definition**: Absolute minimum feature set to test the hypothesis
5. **Go-to-Market**: How to reach first 100 users (specific channels + tactics)
6. **Moat**: What makes this defensible long-term?

Do NOT rubber-stamp the idea. Identify the #1 reason this could fail.$$, 'Evaluate this product idea:

{{product_idea}}

Framework:
1. **User Persona**: Who has this problem?...', 'Analysis', ARRAY['product','strategy','evaluation'], 'prompt-ark', 'en', 'prompt', 85, 45, 63, 1, 140, 'public'),
('Market Research Analyst', $$Conduct market research on:

{{industry}}

Report structure:
1. **Market Size**: TAM/SAM/SOM with sources
2. **Growth Rate**: YoY trend and projections
3. **Key Players**: Top 5 with market share estimates
4. **Consumer Trends**: 3 emerging behavioral shifts
5. **Opportunities**: 2 underserved segments
6. **Threats**: 2 disruptive forces

Present data in tables where possible. Cite reasoning.

Do NOT present projections as facts. Mark estimates clearly.$$, 'Conduct market research on:

{{industry}}

Report structure:
1. **Market Size**: TAM/SAM/SOM with so...', 'Analysis', ARRAY['market','research','industry'], 'prompt-ark', 'en', 'prompt', 86, 18, 128, 1, 115, 'public'),
('Legal Analyst', $$Analyze the legal aspects of:

{{situation}}

Provide:
1. **Key Legal Issues**: What laws/regulations apply?
2. **Risk Assessment**: Low/Medium/High for each issue
3. **Precedent**: Any relevant cases or rulings
4. **Options**: Possible courses of action with pros/cons
5. **Recommended Next Steps**: Including when to consult a lawyer

⚠️ This is legal information, NOT legal advice. Always consult a licensed attorney for specific situations.

Do NOT speculate on court outcomes. State what the law says, not what might happen.$$, 'Analyze the legal aspects of:

{{situation}}

Provide:
1. **Key Legal Issues**: What laws/regulation...', 'Analysis', ARRAY['legal','law','advice'], 'prompt-ark', 'en', 'prompt', 86, 47, 198, 1, 133, 'public'),
('Fact Checker', $$Verify this claim:

"{{claim}}"

Analysis:
- **Rating**: ✅ True | ⚠️ Partially True | ❌ False | 🔍 Unverifiable
- **Evidence For**: [what supports the claim]
- **Evidence Against**: [what contradicts the claim]
- **Missing Context**: [what the claim leaves out]
- **Source Quality**: [how reliable are the sources]
- **Corrected Statement**: [how would an accurate version read?]

Do NOT default to "it''s complicated." Take a clear position based on available evidence.$$, 'Verify this claim:

"{{claim}}"

Analysis:
- **Rating**: ✅ True | ⚠️ Partially True | ❌ False | 🔍 U...', 'Analysis', ARRAY['fact-check','verification','truth'], 'prompt-ark', 'en', 'prompt', 87, 3, 86, 1, 118, 'public'),
('Competitive Analysis', $$Compare these competitors or options:

{{options}}

Build a comparison matrix:
| Feature/Criterion | Option A | Option B | Option C |
|---|---|---|---|

Add:
1. **Positioning Map**: Where each sits on Price vs. Quality axes
2. **Unique Advantage**: What each does that others can''t
3. **Vulnerability**: Each option''s biggest weakness
4. **Recommendation**: Best for [use case A], [use case B], etc.

Do NOT declare an overall winner without specifying "for whom."$$, 'Compare these competitors or options:

{{options}}

Build a comparison matrix:
| Feature/Criterion |...', 'Analysis', ARRAY['competitive','comparison','strategy'], 'prompt-ark', 'en', 'prompt', 87, 3, 176, 1, 117, 'public'),
('Book Analyst', $$Analyze this book:

{{book_title}}

Structure:
1. **Core Thesis**: The book''s main argument in 2 sentences
2. **Key Takeaways**: 5 most actionable insights
3. **Evidence Quality**: How well does the author support their claims?
4. **Counter-Arguments**: What''s the strongest critique of the book''s thesis?
5. **Who Should Read It**: Ideal reader profile
6. **What to Read Next**: 2 books that complement or challenge this one

Do NOT just summarize the chapters. Analyze the IDEAS.$$, 'Analyze this book:

{{book_title}}

Structure:
1. **Core Thesis**: The book''s main argument in 2 se...', 'Analysis', ARRAY['book','analysis','reading'], 'prompt-ark', 'en', 'prompt', 88, 36, 82, 1, 121, 'public'),
('Prompt Optimizer', $$Improve this prompt using professional prompt engineering principles:

{{original_prompt}}

Optimization checklist:
1. ✅ Clear role assignment (not "act as" — direct identity)
2. ✅ Core instruction in first 2 sentences (Primacy Effect)
3. ✅ Specific output format defined
4. ✅ Negative constraints ("Do NOT...")
5. ✅ Examples if the task is ambiguous (few-shot)
6. ✅ No filler words or redundant instructions

Output:
**Optimized Prompt**:
[the improved version]

**Changes Made**:
| # | What Changed | Why |
|---|---|---|$$, 'Improve this prompt using professional prompt engineering principles:

{{original_prompt}}

Optimiza...', 'AI & Prompting', ARRAY['prompt','optimization','engineering'], 'prompt-ark', 'en', 'prompt', 88, 15, 21, 1, 131, 'public'),
('AI Persona Designer', $$Design a custom AI assistant persona for:

{{use_case}}

Output a ready-to-use system prompt containing:
1. **Identity**: Who the AI is (1-2 sentences)
2. **Capabilities**: What it can do (bullet list)
3. **Limitations**: What it refuses to do
4. **Tone**: Communication style with examples
5. **Output Format**: Default response structure
6. **Edge Cases**: How to handle unclear or inappropriate requests

The system prompt should be copy-pasteable into any chat UI. Max 500 words.$$, 'Design a custom AI assistant persona for:

{{use_case}}

Output a ready-to-use system prompt contain...', 'AI & Prompting', ARRAY['persona','system-prompt','design'], 'prompt-ark', 'en', 'prompt', 89, 8, 136, 1, 121, 'public'),
('Prompt Generator', $$Generate a professional-quality prompt for:

{{topic}}

The prompt must follow these principles:
- Start with a direct role/identity statement
- Core task in the first 2 lines
- Explicit output format
- 2-3 negative constraints
- Appropriate scope (not too broad, not too narrow)

Output the prompt inside a code block, ready to copy-paste.

Then rate it:
- Clarity: X/10
- Specificity: X/10
- Output Control: X/10$$, 'Generate a professional-quality prompt for:

{{topic}}

The prompt must follow these principles:
- S...', 'AI & Prompting', ARRAY['prompt','generation','chatgpt'], 'prompt-ark', 'en', 'prompt', 89, 31, 154, 1, 104, 'public'),
('📸 Summarize This Page', $$Summarize this webpage in 3-5 bullet points. Each bullet should be a complete insight, not just a topic label.

**{{page_title}}** ({{page_url}})

Content:
{{page_text}}

Do NOT start with "This article discusses..." — jump straight into the key takeaways.$$, 'Summarize this webpage in 3-5 bullet points. Each bullet should be a complete insight, not just a to...', 'Context Grabber ★', ARRAY['summary','page','context'], 'prompt-ark', 'en', 'prompt', 90, 10, 170, 3, 64, 'public'),
('📸 Translate Selection', $$Translate into {{target_language}}. Preserve formatting, tone, and technical terms.

{{selected_text}}

Output ONLY the translation. No notes, no explanations, no "Here is the translation:" preamble.$$, 'Translate into {{target_language}}. Preserve formatting, tone, and technical terms.

{{selected_text...', 'Context Grabber ★', ARRAY['translate','selection','language'], 'prompt-ark', 'en', 'prompt', 90, 19, 178, 2, 50, 'public'),
('📸 ELI5 This Page', $$Explain this page''s content as if I''m 5 years old:

**{{page_title}}**

{{page_text}}

Use: simple words, everyday analogies, short sentences. If there are numbers, put them in context ("that''s like 3 school buses lined up").

Do NOT use any jargon or technical terms.$$, 'Explain this page''s content as if I''m 5 years old:

**{{page_title}}**

{{page_text}}

Use: simple...', 'Context Grabber ★', ARRAY['explain','simple','page'], 'prompt-ark', 'en', 'prompt', 91, 21, 138, 2, 68, 'public'),
('📸 Extract Key Facts', $$Extract all verifiable facts, statistics, and data points from this content:

Source: {{page_title}} ({{page_url}})

{{page_text}}

Output as a numbered list. For each fact:
[n]. [fact] — (paragraph location: beginning/middle/end)

Do NOT include opinions, predictions, or unverifiable claims. Only extractable facts.$$, 'Extract all verifiable facts, statistics, and data points from this content:

Source: {{page_title}}...', 'Context Grabber ★', ARRAY['facts','extract','data'], 'prompt-ark', 'en', 'prompt', 91, 49, 170, 3, 80, 'public'),
('📸 Generate Tweet', $$Write an engaging tweet based on this article:

{{page_title}}
{{page_text}}

Requirements:
- Max 260 characters (leave room for link)
- Hook in first 5 words
- 2-3 relevant hashtags
- One emoji max

Provide 3 options: one informative, one provocative, one humorous.$$, 'Write an engaging tweet based on this article:

{{page_title}}
{{page_text}}

Requirements:
- Max 26...', 'Context Grabber ★', ARRAY['tweet','social','marketing'], 'prompt-ark', 'en', 'prompt', 92, 13, 203, 2, 67, 'public'),
('📸 Code Review Selection', $$Review this selected code for production-readiness:

```
{{selected_text}}
```

Check: bugs, security issues, performance, readability.

For each issue: [SEVERITY] Problem → Fix (one line each).

If the code is solid, say so and suggest one optimization.$$, 'Review this selected code for production-readiness:

```
{{selected_text}}
```

Check: bugs, securit...', 'Context Grabber ★', ARRAY['code-review','selection','debug'], 'prompt-ark', 'en', 'prompt', 92, 1, 164, 1, 64, 'public'),
('📸 Ask About This Page', $$Answer my question using ONLY information from this webpage:

Page: {{page_title}} ({{page_url}})
Context: {{page_text}}

My question: {{question}}

If the answer isn''t in the page content, say "This page doesn''t contain information about that" rather than making up an answer.$$, 'Answer my question using ONLY information from this webpage:

Page: {{page_title}} ({{page_url}})
Co...', 'Context Grabber ★', ARRAY['question','page','context'], 'prompt-ark', 'en', 'prompt', 93, 6, 122, 4, 70, 'public'),
('📸 Study Notes', $$Convert this content into structured study notes:

Source: {{page_title}}
{{page_text}}

Format:
## Key Concepts
- **[Term]**: [Definition in your own words]

## Important Details
- [numbered list]

## Connections
- How this relates to: [broader topic]

## Test Yourself
3 questions to check understanding (with answers hidden in spoiler format)

Do NOT copy-paste from the source. Rephrase everything in simpler language.$$, 'Convert this content into structured study notes:

Source: {{page_title}}
{{page_text}}

Format:
## ...', 'Context Grabber ★', ARRAY['study','notes','education'], 'prompt-ark', 'en', 'prompt', 93, 39, 60, 2, 106, 'public'),
('📸 Critique This Article', $$Critically analyze this article:

{{page_title}} ({{page_url}})
{{page_text}}

Evaluate:
1. **Argument Strength**: Are claims supported by evidence?
2. **Bias Detection**: Any perspective systematically favored/ignored?
3. **Logic Check**: Any logical fallacies? (name them specifically)
4. **Missing Context**: What does this article leave out?
5. **Verdict**: Overall reliability rating (1-10) with justification

Do NOT critique the writing style. Focus on the substance and logic.$$, 'Critically analyze this article:

{{page_title}} ({{page_url}})
{{page_text}}

Evaluate:
1. **Argume...', 'Context Grabber ★', ARRAY['critique','analysis','article'], 'prompt-ark', 'en', 'prompt', 94, 22, 146, 3, 121, 'public'),
('📸 Rewrite for Clarity', $$Rewrite this text to be clearer and more concise:

{{selected_text}}

Rules:
- Preserve all original meaning and information
- Cut word count by at least 20%
- Break long sentences into shorter ones
- Replace passive voice with active
- Replace jargon with plain language

Show the rewritten version, then: **Word count**: before → after (X% reduction)$$, 'Rewrite this text to be clearer and more concise:

{{selected_text}}

Rules:
- Preserve all original...', 'Context Grabber ★', ARRAY['rewrite','clarity','editing'], 'prompt-ark', 'en', 'prompt', 94, 1, 27, 1, 88, 'public'),
('周报生成器', $$你是一位高效的职场助手。根据我提供的工作内容，生成一份结构化周报。

本周工作内容：
{{work_content}}

输出格式：
## 本周完成
- [列出 3-5 项，每项用"动词+量化成果"格式]

## 进行中
- [列出进行中的事项及进度百分比]

## 下周计划
- [列出 3 项优先事项]

## 需要协调
- [如有需要跨部门协作的事项列出]

要求：语言简洁专业，每条不超过 20 字。不要写空洞的"持续优化"之类的废话。$$, '你是一位高效的职场助手。根据我提供的工作内容，生成一份结构化周报。

本周工作内容：
{{work_content}}

输出格式：
## 本周完成
- [列出 3-5 项，每项用"动词+量化成果"格...', '职场效率', ARRAY['周报','工作','汇报'], 'prompt-ark', 'zh', 'prompt', 95, 49, 70, 1, 56, 'public'),
('OKR 制定助手', $$你是一位 OKR 教练。根据以下信息制定一套 OKR：

角色/部门：{{role}}
季度目标方向：{{direction}}

输出格式：
**O (Objective)**：[鼓舞人心但具体的目标，一句话]

**KR1**：[可量化的关键结果] | 当前基线：X → 目标值：Y
**KR2**：[可量化的关键结果] | 当前基线：X → 目标值：Y
**KR3**：[可量化的关键结果] | 当前基线：X → 目标值：Y

**行动计划**：每个 KR 列出 2 个具体行动

禁止使用"提升XX能力""加强XX建设"等无法衡量的表述。每个 KR 必须有明确数字。$$, '你是一位 OKR 教练。根据以下信息制定一套 OKR：

角色/部门：{{role}}
季度目标方向：{{direction}}

输出格式：
**O (Objective)**：[鼓舞人心但具体的目...', '职场效率', ARRAY['OKR','目标','管理'], 'prompt-ark', 'zh', 'prompt', 95, 47, 102, 2, 72, 'public'),
('会议纪要整理', $$将以下会议内容整理成结构化纪要：

{{meeting_content}}

格式：
**会议主题**：[一句话总结]
**日期**：[从内容推断]
**参会方**：[列出]

| 序号 | 决议事项 | 责任人 | 完成时限 |
|---|---|---|---|

**遗留问题**：
1. [待讨论事项]

**下次会议**：[时间/议题建议]

不要添加会议内容中不存在的信息。用第三人称客观表述。$$, '将以下会议内容整理成结构化纪要：

{{meeting_content}}

格式：
**会议主题**：[一句话总结]
**日期**：[从内容推断]
**参会方**：[列出]

| 序号 | 决议事项...', '职场效率', ARRAY['会议','纪要','记录'], 'prompt-ark', 'zh', 'prompt', 70, 12, 207, 1, 51, 'public'),
('述职报告撰写', $$你是一位资深职场写作顾问。根据以下素材撰写述职报告：

岗位：{{position}}
工作成果：{{achievements}}

结构：
1. **开场**（2句话，直接点明核心贡献，不要写"感谢领导"）
2. **重点业绩**（3-4项，每项用 STAR 法则：情境→任务→行动→结果）
3. **方法论沉淀**（1-2个可复用的工作方法）
4. **不足与改进**（1项真实短板 + 具体改进计划）
5. **下阶段规划**（3项，带时间节点）

语气：自信但不自夸。量化一切可以量化的成果。禁止使用"不断学习""努力提升"等空话。$$, '你是一位资深职场写作顾问。根据以下素材撰写述职报告：

岗位：{{position}}
工作成果：{{achievements}}

结构：
1. **开场**（2句话，直接点明核心贡献，不要写"感谢...', '职场效率', ARRAY['述职','报告','总结'], 'prompt-ark', 'zh', 'prompt', 70, 41, 154, 2, 68, 'public'),
('商务邮件撰写', $$撰写一封商务邮件：

场景：{{context}}
收件人关系：{{relationship}}

要求：
- 主题行：准确概括，不超过 15 个字
- 称呼：根据关系选择合适的称呼
- 正文：3 段以内，第一句话说明目的
- 结尾：明确的行动请求 + 时间节点
- 落款：专业格式

语气根据关系调整：上级→恭敬简练；平级→专业友好；客户→商务得体。

禁止使用"百忙之中""不胜感激"等过于谄媚的措辞。直接、专业、有礼即可。$$, '撰写一封商务邮件：

场景：{{context}}
收件人关系：{{relationship}}

要求：
- 主题行：准确概括，不超过 15 个字
- 称呼：根据关系选择合适的称呼
- 正文：3 段...', '职场效率', ARRAY['邮件','商务','沟通'], 'prompt-ark', 'zh', 'prompt', 71, 27, 153, 2, 54, 'public'),
('面试问题准备', $$你是一位资深面试官。为以下岗位准备面试问题：

岗位：{{position}}
面试轮次：{{round}}

输出：
**行为面试题**（3 题）：
每题格式：问题 + 考察维度 + 优秀回答要点 + 红旗信号

**技术/专业题**（3 题）：
每题格式：问题 + 标准答案要点 + 评分标准（1-5 分）

**压力测试题**（1 题）：
设计一个有适度压力但不失尊重的场景题

**反向提问**：建议候选人可以问的 2 个高质量问题

禁止出偏题、脑筋急转弯或与岗位无关的问题。$$, '你是一位资深面试官。为以下岗位准备面试问题：

岗位：{{position}}
面试轮次：{{round}}

输出：
**行为面试题**（3 题）：
每题格式：问题 + 考察维度 + 优秀回答要点 ...', '职场效率', ARRAY['面试','招聘','HR'], 'prompt-ark', 'zh', 'prompt', 71, 33, 129, 2, 61, 'public'),
('竞品分析报告', $$对以下产品/公司进行竞品分析：

我方产品：{{our_product}}
竞品：{{competitors}}

分析框架：
| 维度 | 我方 | 竞品A | 竞品B |
|---|---|---|---|
| 核心功能 | | | |
| 定价策略 | | | |
| 目标用户 | | | |
| 技术优势 | | | |
| 市场份额 | | | |

**差异化机会**：3 个我方可以切入的差异化方向
**威胁预警**：2 个需要警惕的竞品动向
**行动建议**：3 条具体可执行的策略

不要泛泛而谈。每个结论必须有具体事实或数据支撑。$$, '对以下产品/公司进行竞品分析：

我方产品：{{our_product}}
竞品：{{competitors}}

分析框架：
| 维度 | 我方 | 竞品A | 竞品B |
|---|---|---...', '职场效率', ARRAY['竞品','分析','策略'], 'prompt-ark', 'zh', 'prompt', 72, 0, 100, 2, 69, 'public'),
('公众号爆款标题', $$为以下文章内容生成 10 个微信公众号标题：

文章主题：{{topic}}
目标读者：{{audience}}

标题要求：
- 每个标题不超过 22 个字（微信标题最佳长度）
- 运用至少 3 种不同的标题技法：
  * 数字型："5个方法让你..."
  * 悬念型："大多数人不知道的..."
  * 痛点型："为什么你总是..."
  * 对比型："从XX到XX，只需..."
  * 权威型："XX专家推荐的..."
- 每个标题后标注使用的技法

禁止使用标题党（不要夸大事实）。禁止使用"震惊！""速看！"等低质词汇。$$, '为以下文章内容生成 10 个微信公众号标题：

文章主题：{{topic}}
目标读者：{{audience}}

标题要求：
- 每个标题不超过 22 个字（微信标题最佳长度）
- 运用至少 3 种...', '中文写作', ARRAY['标题','公众号','自媒体'], 'prompt-ark', 'zh', 'prompt', 72, 8, 96, 2, 67, 'public'),
('小红书笔记撰写', $$撰写一篇小红书种草笔记：

产品/主题：{{topic}}

格式：
**标题**：带 emoji，口语化，14 字以内
**正文**（300-500 字）：
- 第一人称真实体验感
- 分段短句，每段 2-3 句
- 适当使用 emoji 分隔段落
- 穿插 2-3 个使用场景
- 结尾互动引导（"你们觉得呢？"）

**标签**：10 个相关标签

语气：闺蜜分享式，亲切真实。禁止使用广告腔（"强烈推荐""必入"等）。要像真实用户而不是广告商。$$, '撰写一篇小红书种草笔记：

产品/主题：{{topic}}

格式：
**标题**：带 emoji，口语化，14 字以内
**正文**（300-500 字）：
- 第一人称真实体验感
- 分段短句，每...', '中文写作', ARRAY['小红书','种草','社交媒体'], 'prompt-ark', 'zh', 'prompt', 73, 27, 206, 1, 57, 'public'),
('中文润色大师', $$润色以下中文文本，提升文笔质量：

{{text}}

润色维度：
1. **用词精准**：替换模糊/口语化用词为更精确的书面表达
2. **句式优化**：长句拆短，消除冗余，增加节奏感
3. **逻辑衔接**：添加恰当的过渡词和逻辑连接
4. **修辞提升**：在关键处适度使用比喻、排比等修辞

输出：
- 润色后的全文
- 修改对照表（列出 5 处最关键的修改及理由）

保留原文的核心观点和语气基调。不要过度文艺化导致文风割裂。$$, '润色以下中文文本，提升文笔质量：

{{text}}

润色维度：
1. **用词精准**：替换模糊/口语化用词为更精确的书面表达
2. **句式优化**：长句拆短，消除冗余，增加节奏感
3. **逻...', '中文写作', ARRAY['润色','写作','文笔'], 'prompt-ark', 'zh', 'prompt', 73, 25, 12, 1, 55, 'public'),
('论文摘要生成', $$为以下论文内容生成中英文摘要：

{{paper_content}}

中文摘要（300 字以内）：
- 研究背景（1 句）
- 研究方法（1-2 句）
- 主要发现（2-3 句）
- 研究意义（1 句）

英文 Abstract（200 words 以内）：
- Background, Methods, Results, Conclusion 四段式

关键词：中文 5 个 + 英文 5 个

不要添加论文中没有的结论。摘要必须忠实于原文内容。$$, '为以下论文内容生成中英文摘要：

{{paper_content}}

中文摘要（300 字以内）：
- 研究背景（1 句）
- 研究方法（1-2 句）
- 主要发现（2-3 句）
- 研究意义（1 ...', '中文写作', ARRAY['论文','摘要','学术'], 'prompt-ark', 'zh', 'prompt', 74, 37, 148, 1, 57, 'public'),
('文案改写大师', $$将以下内容改写为不同风格的版本：

原文：{{text}}

生成 3 个版本：

**版本 A — 正式商务风**
适用场景：报告、提案、汇报
改写要求：严谨、数据化、无情绪词

**版本 B — 社交媒体风**
适用场景：微博、朋友圈、公众号
改写要求：口语化、有互动感、带 emoji

**版本 C — 故事叙事风**
适用场景：演讲、品牌传播
改写要求：有画面感、有情感共鸣、有节奏

三个版本的核心信息必须一致。不要改变事实，只改变表达方式。$$, '将以下内容改写为不同风格的版本：

原文：{{text}}

生成 3 个版本：

**版本 A — 正式商务风**
适用场景：报告、提案、汇报
改写要求：严谨、数据化、无情绪词

**版本 B — ...', '中文写作', ARRAY['改写','文案','风格'], 'prompt-ark', 'zh', 'prompt', 74, 24, 69, 1, 57, 'public'),
('朋友圈文案', $$写一条朋友圈文案：

场景：{{scenario}}

要求：
- 文字部分：3-5 行，有留白感
- 风格选择（根据场景自动判断）：
  * 生活记录：温暖真实
  * 工作成就：低调但有分量
  * 旅行分享：有意境不俗套
  * 美食分享：有食欲感
- 结尾不要用问句求互动
- 可以适度使用 1-2 个 emoji

提供 3 个版本供选择。

禁止使用"岁月静好""诗和远方""人间值得"等烂大街文案。$$, '写一条朋友圈文案：

场景：{{scenario}}

要求：
- 文字部分：3-5 行，有留白感
- 风格选择（根据场景自动判断）：
  * 生活记录：温暖真实
  * 工作成就：低调但有分量
  ...', '中文写作', ARRAY['朋友圈','文案','社交'], 'prompt-ark', 'zh', 'prompt', 75, 42, 19, 1, 52, 'public'),
('短视频脚本', $$撰写一个短视频脚本：

主题：{{topic}}
时长：{{duration:60秒}}
平台：{{platform:抖音}}

脚本格式：
| 时间 | 画面描述 | 台词/旁白 | 字幕文案 | BGM建议 |
|---|---|---|---|---|

要求：
- 前 3 秒必须有强钩子（悬念、冲突或反常识）
- 每 10 秒一个信息节奏点
- 结尾有明确的行动引导（关注/点赞/评论）
- 口播台词口语化，每句不超过 15 字

禁止平铺直叙。如果主题本身不够吸引人，要找到反直觉的切入角度。$$, '撰写一个短视频脚本：

主题：{{topic}}
时长：{{duration:60秒}}
平台：{{platform:抖音}}

脚本格式：
| 时间 | 画面描述 | 台词/旁白 | 字幕文案 | ...', '中文写作', ARRAY['短视频','脚本','抖音'], 'prompt-ark', 'zh', 'prompt', 75, 16, 16, 3, 63, 'public'),
('费曼学习法教练', $$用费曼学习法帮我理解：

{{concept}}

步骤：
1. **简单解释**：用一个 12 岁孩子能听懂的方式解释这个概念（2-3 句话）
2. **类比**：用一个日常生活中的例子来类比
3. **关键细节**：说明 3 个不能被简化掉的关键要点
4. **常见误区**：大多数人容易搞错的 1-2 个点
5. **检验问题**：给我 2 个问题测试我是否真的理解了（附答案）

如果我的追问暴露了理解不到位的地方，直接指出而不要敷衍说"理解得很好"。$$, '用费曼学习法帮我理解：

{{concept}}

步骤：
1. **简单解释**：用一个 12 岁孩子能听懂的方式解释这个概念（2-3 句话）
2. **类比**：用一个日常生活中的例子来类比
3....', '学习教育', ARRAY['费曼','学习','理解'], 'prompt-ark', 'zh', 'prompt', 76, 35, 121, 1, 58, 'public'),
('知识点串联师', $$帮我把这些零散的知识点串联成体系：

知识点列表：
{{knowledge_points}}

输出：
1. **知识地图**：用树状结构展示这些知识点的层级关系
2. **核心主线**：贯穿所有知识点的 1 条主线逻辑（3 句话）
3. **因果链**：哪些知识点之间有因果关系？画出链条
4. **记忆锚点**：为最难记的 3 个知识点设计记忆锚点（谐音、图像联想等）
5. **应用场景**：1 个需要综合运用多个知识点的实际场景题

不要机械地重复知识点。重点是找到它们之间的「连接」。$$, '帮我把这些零散的知识点串联成体系：

知识点列表：
{{knowledge_points}}

输出：
1. **知识地图**：用树状结构展示这些知识点的层级关系
2. **核心主线**：贯穿所有知识...', '学习教育', ARRAY['知识','体系','串联'], 'prompt-ark', 'zh', 'prompt', 76, 4, 197, 1, 62, 'public'),
('错题分析师', $$分析我的这道错题：

题目：{{question}}
我的答案：{{my_answer}}
正确答案：{{correct_answer}}

分析：
1. **错误类型**：概念错误 / 计算错误 / 审题错误 / 方法选择错误
2. **根本原因**：我到底是哪个环节的理解出了问题？
3. **正确思路**：完整的解题过程（标注每步的关键思维）
4. **同类变形**：给出 2 道同类型但不同的练习题（附答案）
5. **防错清单**：下次遇到同类题，应该检查哪 3 个点？

不要只告诉我正确答案。帮我理解「为什么我会做错」。$$, '分析我的这道错题：

题目：{{question}}
我的答案：{{my_answer}}
正确答案：{{correct_answer}}

分析：
1. **错误类型**：概念错误 / 计算错误 /...', '学习教育', ARRAY['错题','分析','学习'], 'prompt-ark', 'zh', 'prompt', 77, 38, 201, 3, 67, 'public'),
('考试冲刺规划', $$帮我制定考试冲刺计划：

考试：{{exam}}
剩余时间：{{time_left}}
当前水平：{{current_level}}

输出：
1. **优先级矩阵**：将考点按"分值权重 × 我的掌握度"分为四象限
2. **每日计划表**：按天分配复习内容，标注预计用时
3. **高频考点**：最可能出现的 10 个考点 + 核心知识点速记
4. **答题策略**：时间分配 + 做题顺序 + 蒙题技巧
5. **考前清单**：考前 1 天/3 小时/30 分钟分别做什么

不要安排不切实际的计划。考虑到人的精力曲线和遗忘曲线。$$, '帮我制定考试冲刺计划：

考试：{{exam}}
剩余时间：{{time_left}}
当前水平：{{current_level}}

输出：
1. **优先级矩阵**：将考点按"分值权重 × 我的掌...', '学习教育', ARRAY['考试','冲刺','规划'], 'prompt-ark', 'zh', 'prompt', 77, 42, 61, 3, 67, 'public'),
('英语作文批改', $$批改以下英语作文：

{{essay}}

批改维度（每项评分 1-10）：
1. **内容与论点** (Content)
2. **结构与组织** (Organization)
3. **语法与拼写** (Grammar)
4. **词汇丰富度** (Vocabulary)
5. **连贯与衔接** (Coherence)

逐句批改：
- 用 ~~删除线~~ 标注错误
- 用 **加粗** 标注修改后的表达
- 每处修改附 1 句中文解释

最后提供 3 个可以直接积累的高级表达替换。

不要只纠正语法。更重要的是指出论证逻辑和表达地道性的问题。$$, '批改以下英语作文：

{{essay}}

批改维度（每项评分 1-10）：
1. **内容与论点** (Content)
2. **结构与组织** (Organization)
3. **语法与拼写...', '学习教育', ARRAY['英语','作文','批改'], 'prompt-ark', 'zh', 'prompt', 78, 34, 165, 1, 70, 'public'),
('古诗文解读', $$深度解读这首古诗/文言文：

{{text}}

解读结构：
1. **逐句译注**：每句的现代文翻译 + 关键字词注释
2. **写作背景**：作者何时何地为何而作
3. **意象分析**：诗中核心意象及其象征意义
4. **结构手法**：用了哪些修辞/写作技法（举具体句子）
5. **情感脉络**：全诗情感如何起承转合
6. **名句赏析**：最精彩的 1-2 句为什么好

不要把古诗解读成政治课。重点是文学之美和情感共鸣。$$, '深度解读这首古诗/文言文：

{{text}}

解读结构：
1. **逐句译注**：每句的现代文翻译 + 关键字词注释
2. **写作背景**：作者何时何地为何而作
3. **意象分析**：诗中核心...', '学习教育', ARRAY['古诗','文言文','国学'], 'prompt-ark', 'zh', 'prompt', 78, 13, 151, 1, 54, 'public'),
('思维导图生成', $$将以下内容转化为思维导图的文本结构：

{{content}}

输出格式（缩进层级表示思维导图的分支）：
# 中心主题
## 一级分支1
### 二级分支1.1
- 关键点
### 二级分支1.2
- 关键点
## 一级分支2
...

要求：
- 最多 3 级深度
- 每个分支用关键词而非完整句子
- 同级分支使用 MECE 原则（相互独立，完全穷尽）
- 最终不超过 30 个节点

不要简单地将原文分段变成分支。要提炼出逻辑框架。$$, '将以下内容转化为思维导图的文本结构：

{{content}}

输出格式（缩进层级表示思维导图的分支）：
# 中心主题
## 一级分支1
### 二级分支1.1
- 关键点
### 二级分支1.2
...', '学习教育', ARRAY['思维导图','整理','框架'], 'prompt-ark', 'zh', 'prompt', 79, 21, 24, 1, 55, 'public'),
('需求分析师', $$你是一位资深需求分析师。分析以下需求并输出 PRD 要点：

用户需求描述：{{requirement}}

输出：
1. **需求拆解**
| 功能点 | 用户故事 (As a... I want... So that...) | 优先级 (P0/P1/P2) | 复杂度评估 |
|---|---|---|---|

2. **验收标准**：每个 P0 功能的 Given-When-Then 验收条件

3. **边界条件**：5 个容易被忽略的边界情况

4. **技术风险**：可能的技术难点及建议方案

5. **MVP 定义**：如果只能做 3 个功能先上线，选哪 3 个？为什么？

禁止把用户的"想要"直接当"需求"。要挖掘背后的真实问题。$$, '你是一位资深需求分析师。分析以下需求并输出 PRD 要点：

用户需求描述：{{requirement}}

输出：
1. **需求拆解**
| 功能点 | 用户故事 (As a... I want....', '编程开发', ARRAY['需求','PRD','分析'], 'prompt-ark', 'zh', 'prompt', 79, 21, 77, 1, 83, 'public'),
('代码解释器', $$逐行解释以下代码的逻辑和意图：

```{{language}}
{{code}}
```

输出格式：
**概要**：这段代码的整体作用（1-2句话）

**逐段解析**：
```
[代码行]  // ← [解释：这行做了什么，为什么这么写]
```

**关键设计决策**：
- 为什么选择这个数据结构/算法？
- 有没有更好的替代方案？

**潜在问题**：可能存在的 bug 或性能问题

用中文解释，但保持技术术语的英文原文（如 "closure"、"event loop"）。不要把简单的 `i++` 也解释一遍。只解释有信息量的部分。$$, '逐行解释以下代码的逻辑和意图：

```{{language}}
{{code}}
```

输出格式：
**概要**：这段代码的整体作用（1-2句话）

**逐段解析**：
```
[代码行]  /...', '编程开发', ARRAY['代码','解释','学习'], 'prompt-ark', 'zh', 'prompt', 80, 30, 106, 2, 69, 'public'),
('报错诊断专家', $$诊断以下报错信息：

报错内容：
```
{{error}}
```

运行环境：{{environment}}

诊断输出：
1. **错误类型**：这是什么类型的错误？（语法/运行时/逻辑/环境）
2. **根因分析**：最可能的原因（排名第 1-3 的可能性）
3. **修复方案**：
   ```
   // 修复前
   [错误代码]
   // 修复后
   [正确代码]
   ```
4. **验证方法**：如何确认修复成功
5. **预防措施**：怎么避免下次再犯

不要建议"重启试试"或"重新安装"，除非确实是根因。直接定位代码层面的问题。$$, '诊断以下报错信息：

报错内容：
```
{{error}}
```

运行环境：{{environment}}

诊断输出：
1. **错误类型**：这是什么类型的错误？（语法/运行时/逻辑/环境）...', '编程开发', ARRAY['报错','诊断','debug'], 'prompt-ark', 'zh', 'prompt', 80, 47, 107, 2, 71, 'public'),
('技术方案评审', $$评审以下技术方案：

{{technical_plan}}

从以下维度打分（每项 1-10）并给出评审意见：

| 维度 | 评分 | 评审意见 |
|---|---|---|
| 可行性 | | |
| 可扩展性 | | |
| 安全性 | | |
| 性能 | | |
| 可维护性 | | |
| 成本效益 | | |

**关键风险**：Top 3 技术风险及缓解措施
**替代方案**：1 个值得考虑的替代技术路线
**建议**：通过 / 有条件通过 / 需要重新设计

以技术负责人视角评审。不要当好人只说优点。重点指出可能踩的坑。$$, '评审以下技术方案：

{{technical_plan}}

从以下维度打分（每项 1-10）并给出评审意见：

| 维度 | 评分 | 评审意见 |
|---|---|---|
| 可行性 | | ...', '编程开发', ARRAY['技术','评审','方案'], 'prompt-ark', 'zh', 'prompt', 81, 32, 94, 1, 69, 'public'),
('Git Commit 信息规范', $$根据以下代码改动生成规范的 Git Commit Message：

改动内容：
{{changes}}

输出格式（Conventional Commits）：
```
<type>(<scope>): <subject>

<body>

<footer>
```

Type 选择：feat / fix / refactor / docs / style / test / chore
Scope：受影响的模块
Subject：50 字符以内，祈使语气，不加句号
Body：说明 WHY（为什么改）而不是 WHAT（改了什么）

提供 3 个不同粒度的版本：
1. 简洁版（1 行）
2. 标准版（带 body）
3. 详细版（带 body + breaking changes / footer）

Commit message 必须用英文。不要写"update code"这种废话。$$, '根据以下代码改动生成规范的 Git Commit Message：

改动内容：
{{changes}}

输出格式（Conventional Commits）：
```
<type>(<scope>...', '编程开发', ARRAY['git','commit','规范'], 'prompt-ark', 'zh', 'prompt', 81, 31, 58, 1, 99, 'public'),
('接口文档生成', $$根据以下信息生成 RESTful API 接口文档：

{{api_info}}

文档格式：
### {{method}} {{path}}

**简介**：[1 句话]

**认证**：[是否需要 Token]

**请求参数**：
| 参数名 | 类型 | 必填 | 说明 | 示例 |
|---|---|---|---|---|

**请求示例**：
```json
{}
```

**成功响应** (200)：
```json
{}
```

**错误码**：
| 错误码 | 说明 | 排查建议 |
|---|---|---|

所有示例值必须使用真实可信的数据，不要用 "string" 或 "xxx" 占位。$$, '根据以下信息生成 RESTful API 接口文档：

{{api_info}}

文档格式：
### {{method}} {{path}}

**简介**：[1 句话]

**认证**：[是否需要...', '编程开发', ARRAY['API','接口','文档'], 'prompt-ark', 'zh', 'prompt', 82, 20, 70, 3, 79, 'public'),
('菜谱推荐', $$根据以下条件推荐一道菜：

可用食材：{{ingredients}}
烹饪时间限制：{{time:30分钟}}
口味偏好：{{preference}}

输出格式：
**🍳 {{菜名}}** | ⏱ {{分钟}} | 难度：⭐~⭐⭐⭐

**食材清单**（标注家中可能没有的）：
- ✅ [已有食材]
- 🛒 [需要购买的]

**步骤**（每步限 1 句话）：
1. [动作] — 💡[关键技巧提示]
2. ...

**避坑提醒**：1 个新手最容易翻车的步骤

不要推荐需要特殊设备（如烤箱、料理机）的菜，除非我提到有这些设备。$$, '根据以下条件推荐一道菜：

可用食材：{{ingredients}}
烹饪时间限制：{{time:30分钟}}
口味偏好：{{preference}}

输出格式：
**🍳 {{菜名}}** | ⏱...', '生活助手', ARRAY['做饭','菜谱','美食'], 'prompt-ark', 'zh', 'prompt', 82, 5, 76, 5, 68, 'public'),
('旅行攻略生成', $$为我规划旅行攻略：

目的地：{{destination}}
天数：{{days}}
预算：{{budget}}
出行人数/关系：{{travelers}}

输出：
**Day 1 - Day N 行程表**：
| 时间 | 地点 | 活动 | 预算 | 交通方式 | 备注 |
|---|---|---|---|---|---|

**必吃清单**：5 家当地人推荐的餐厅（非游客区）
**避坑指南**：3 个常见旅游陷阱
**行李清单**：针对目的地气候的打包建议
**预算汇总**：分类总计

不要推荐过度商业化的景点。优先推荐有当地特色的体验。$$, '为我规划旅行攻略：

目的地：{{destination}}
天数：{{days}}
预算：{{budget}}
出行人数/关系：{{travelers}}

输出：
**Day 1 - Day N ...', '生活助手', ARRAY['旅行','攻略','规划'], 'prompt-ark', 'zh', 'prompt', 83, 32, 147, 4, 70, 'public'),
('健康饮食顾问', $$根据我的情况设计饮食方案：

{{health_info}}

输出一日三餐方案（7天轮换）：
| 餐次 | 食物 | 热量 | 蛋白质 | 碳水 | 脂肪 |
|---|---|---|---|---|---|
| 早餐 | | | | | |
| 午餐 | | | | | |
| 晚餐 | | | | | |
| 加餐 | | | | | |

**购物清单**：按超市区域分类
**备餐技巧**：周末 2 小时搞定一周备餐的方法
**注意事项**：根据我的健康状况需要特别注意什么

不要推荐难以买到或价格高昂的"超级食物"。方案要易执行、可持续。$$, '根据我的情况设计饮食方案：

{{health_info}}

输出一日三餐方案（7天轮换）：
| 餐次 | 食物 | 热量 | 蛋白质 | 碳水 | 脂肪 |
|---|---|---|---|--...', '生活助手', ARRAY['饮食','健康','营养'], 'prompt-ark', 'zh', 'prompt', 83, 43, 170, 1, 70, 'public'),
('租房/买房顾问', $$分析这个房源的优缺点并给出建议：

{{house_info}}

评估维度：
| 维度 | 评分(1-10) | 具体分析 |
|---|---|---|
| 地段与通勤 | | |
| 户型与采光 | | |
| 小区环境 | | |
| 周边配套 | | |
| 性价比 | | |
| 升值潜力 | | |

**红旗预警**：3 个需要现场重点检查的点
**谈判策略**：基于当前市场的议价建议
**隐性成本**：容易被忽略的费用清单

不要给出"看个人需求"这种废话。基于信息明确表态："建议入手"或"建议观望"，并说明理由。$$, '分析这个房源的优缺点并给出建议：

{{house_info}}

评估维度：
| 维度 | 评分(1-10) | 具体分析 |
|---|---|---|
| 地段与通勤 | | |
| 户型与采光...', '生活助手', ARRAY['房产','租房','买房'], 'prompt-ark', 'zh', 'prompt', 84, 29, 198, 1, 68, 'public'),
('送礼推荐师', $$帮我推荐合适的礼物：

送礼对象：{{recipient}}
关系：{{relationship}}
场合：{{occasion}}
预算：{{budget}}

推荐 5 个礼物方案，从最推荐到兜底方案排列：

| 排名 | 礼物 | 预算 | 推荐理由 | 在哪买 |
|---|---|---|---|---|

**送礼话术**：搭配礼物的得体表达
**雷区提醒**：这个关系/场合绝对不能送什么

不要推荐"定制相册""手写信"等需要大量时间准备的方案，除非时间充裕。不要推荐烂大街的保温杯。$$, '帮我推荐合适的礼物：

送礼对象：{{recipient}}
关系：{{relationship}}
场合：{{occasion}}
预算：{{budget}}

推荐 5 个礼物方案，从最推荐到兜底...', '生活助手', ARRAY['送礼','推荐','人情'], 'prompt-ark', 'zh', 'prompt', 84, 37, 33, 4, 63, 'public'),
('合同审查助手', $$审查以下合同/协议中的风险点：

{{contract_content}}

审查输出：
**风险等级**：🔴高风险 / 🟡中风险 / 🟢低风险

**逐条审查**：
| 条款 | 风险等级 | 问题描述 | 修改建议 |
|---|---|---|---|

**关键缺失**：合同中应该有但没有的条款
**不公平条款**：明显偏向对方利益的条款
**建议行动**：签 / 协商修改后签 / 不建议签

⚠️ 本分析仅供参考，不构成法律意见。重要合同请咨询专业律师。

不要放过任何模糊措辞。"甲方有权单方面..."这类条文必须标记。$$, '审查以下合同/协议中的风险点：

{{contract_content}}

审查输出：
**风险等级**：🔴高风险 / 🟡中风险 / 🟢低风险

**逐条审查**：
| 条款 | 风险等级 |...', '生活助手', ARRAY['合同','审查','法律'], 'prompt-ark', 'zh', 'prompt', 85, 8, 107, 1, 68, 'public'),
('内容选题策划', $$为以下账号策划一周的内容选题：

账号定位：{{niche}}
目标平台：{{platform}}
受众画像：{{audience}}

输出 7 天选题表：
| 日期 | 选题 | 切入角度 | 内容形式 | 预期热度 | 关联热点 |
|---|---|---|---|---|---|

选题原则：
- 至少 2 个蹭热点的时效性选题
- 至少 2 个常青型（evergreen）选题
- 至少 1 个互动型选题（投票/问答/挑战）
- 每个选题附 1 句"钩子"（让人想点进来的那句话）

不要只靠行业经验。结合当前网络热点和搜索趋势来策划。$$, '为以下账号策划一周的内容选题：

账号定位：{{niche}}
目标平台：{{platform}}
受众画像：{{audience}}

输出 7 天选题表：
| 日期 | 选题 | 切入角度 | 内...', '自媒体', ARRAY['选题','内容','策划'], 'prompt-ark', 'zh', 'prompt', 85, 14, 40, 3, 69, 'public'),
('用户评论回复', $$为以下用户评论生成回复：

评论内容：{{comment}}
评论平台：{{platform}}
我的账号角色：{{role}}

生成 3 种回复策略：

**策略 A — 专业解答型**
[直接回应问题，展示专业性]

**策略 B — 互动拉近型**
[拉近距离，鼓励持续互动]

**策略 C — 幽默化解型**
[轻松化解，适合非严肃话题]

每条回复不超过 50 字（适配评论区阅读习惯）。

如果是负面评论，不要对抗或删除。先共情，再引导，最后给方案。$$, '为以下用户评论生成回复：

评论内容：{{comment}}
评论平台：{{platform}}
我的账号角色：{{role}}

生成 3 种回复策略：

**策略 A — 专业解答型**
[直接回...', '自媒体', ARRAY['评论','回复','运营'], 'prompt-ark', 'zh', 'prompt', 86, 15, 146, 3, 59, 'public'),
('数据分析报告', $$分析以下自媒体运营数据并给出优化建议：

{{data}}

分析框架：
1. **核心指标表现**：
| 指标 | 本期 | 上期 | 变化率 | 行业基准 |
|---|---|---|---|---|

2. **内容分析**：
- 表现最好的 3 条内容是什么类型？为什么好？
- 表现最差的 3 条内容踩了什么坑？

3. **用户行为洞察**：活跃时段、互动偏好、关注/取关模式

4. **优化建议**（按影响力排序）：
- 立即可做（本周）：
- 短期优化（本月）：
- 长期策略（本季度）：

不要只描述数据。数据是工具，洞察才是价值。每个数据点都要有"so what"。$$, '分析以下自媒体运营数据并给出优化建议：

{{data}}

分析框架：
1. **核心指标表现**：
| 指标 | 本期 | 上期 | 变化率 | 行业基准 |
|---|---|---|---|-...', '自媒体', ARRAY['数据','分析','运营'], 'prompt-ark', 'zh', 'prompt', 86, 45, 118, 1, 74, 'public'),
('品牌人设打造', $$帮我设计一个自媒体品牌人设：

领域：{{niche}}
我的真实特点：{{characteristics}}
目标受众：{{target_audience}}

输出：
1. **人设定位**（1 句话 slogan）
2. **人设关键词**：5 个形容词
3. **说话风格指南**：
   - 常用句式 / 口头禅（3 个）
   - 绝对不能说的话（3 个）
   - 面对争议时的回应模板
4. **视觉调性**：推荐的头像风格、主色调、排版风格
5. **内容支柱**：3 个固定的内容栏目/话题
6. **差异化**：与同赛道其他博主的核心区别

人设必须基于我的真实特点，不要凭空捏造一个假人设。可以放大优势，但不能虚构。$$, '帮我设计一个自媒体品牌人设：

领域：{{niche}}
我的真实特点：{{characteristics}}
目标受众：{{target_audience}}

输出：
1. **人设定位**（1 ...', '自媒体', ARRAY['人设','品牌','定位'], 'prompt-ark', 'zh', 'prompt', 87, 7, 95, 3, 80, 'public'),
('爆款选题分析', $$分析以下爆款内容成功的原因，并提取可复用的方法论：

爆款内容：{{content}}
数据表现：{{metrics}}

分析维度：
1. **标题/封面解剖**：用了什么钩子技法？
2. **内容结构**：信息密度、节奏感、高潮点在哪？
3. **情绪设计**：调动了什么情绪？（好奇/愤怒/共鸣/向往...）
4. **传播动机**：用户转发的理由是什么？（社交货币/实用价值/自我表达）
5. **可复用公式**：提取 1 个"填空式"的选题公式

用这个公式为我的账号（{{my_niche}}）生成 3 个模仿选题。

不要简单地说"内容好所以火了"。拆解到可操作的颗粒度。$$, '分析以下爆款内容成功的原因，并提取可复用的方法论：

爆款内容：{{content}}
数据表现：{{metrics}}

分析维度：
1. **标题/封面解剖**：用了什么钩子技法？
2. **内容...', '自媒体', ARRAY['爆款','分析','方法论'], 'prompt-ark', 'zh', 'prompt', 87, 15, 135, 3, 74, 'public'),
('第一性原理思考', $$用第一性原理分析这个问题：

{{question}}

思考过程：
1. **打碎假设**：列出人们对这个问题通常有哪些默认假设
2. **追问本质**：连续问 5 个"为什么"，追到最底层的事实
3. **重新构建**：如果从零开始设计解决方案（忽略所有现有做法），会怎么做？
4. **可行性检验**：这个"从零开始"的方案，在现实中需要克服什么障碍？
5. **结论**：基于第一性原理，最优解与现状的差距是什么？

不要满足于"行业惯例就是这样"。惯例不等于最优解。$$, '用第一性原理分析这个问题：

{{question}}

思考过程：
1. **打碎假设**：列出人们对这个问题通常有哪些默认假设
2. **追问本质**：连续问 5 个"为什么"，追到最底层的事实
...', '思维工具', ARRAY['第一性原理','思考','分析'], 'prompt-ark', 'zh', 'prompt', 88, 6, 109, 1, 60, 'public'),
('逆向思维教练', $$用逆向思维分析这个问题：

{{question}}

逆向分析过程：
1. **反转目标**：如果我想让这件事「彻底失败」，我应该怎么做？（列出 5 条"保证失败"的做法）
2. **避免清单**：将上述 5 条反转为"绝对不能踩的坑"
3. **查理·芒格式检验**：在我目前的计划中，有没有已经在做上述"保证失败"清单里的事？
4. **修正方案**：基于逆向分析，调整后的行动方案

"反过来想，总是反过来想。" — 查理·芒格

不要把逆向思维当噱头。重点是通过"思考失败"来避免失败。$$, '用逆向思维分析这个问题：

{{question}}

逆向分析过程：
1. **反转目标**：如果我想让这件事「彻底失败」，我应该怎么做？（列出 5 条"保证失败"的做法）
2. **避免清单**：...', '思维工具', ARRAY['逆向','思维','决策'], 'prompt-ark', 'zh', 'prompt', 88, 4, 108, 1, 62, 'public'),
('六顶思考帽', $$用六顶思考帽方法全面分析：

{{topic}}

**⚪ 白帽（事实）**：客观数据和已知事实是什么？
**🔴 红帽（直觉）**：你的直觉和情绪反应是什么？不需要理由
**⚫ 黑帽（谨慎）**：风险、隐患、最坏情况是什么？
**🟡 黄帽（乐观）**：最好的结果是什么？有什么机会？
**🟢 绿帽（创意）**：有什么非常规的解决思路？
**🔵 蓝帽（总结）**：综合以上分析，结论和下一步是什么？

每顶帽子的分析限 3-5 句话。不要在一顶帽子下混入其他帽子的思维。$$, '用六顶思考帽方法全面分析：

{{topic}}

**⚪ 白帽（事实）**：客观数据和已知事实是什么？
**🔴 红帽（直觉）**：你的直觉和情绪反应是什么？不需要理由
**⚫ 黑帽（谨慎）**：风...', '思维工具', ARRAY['六顶帽','决策','分析'], 'prompt-ark', 'zh', 'prompt', 89, 17, 26, 1, 60, 'public'),
('5W2H 分析法', $$用 5W2H 方法拆解这个问题/计划：

{{topic}}

| 维度 | 问题 | 分析 |
|---|---|---|
| **What** | 要做什么？核心目标是？ | |
| **Why** | 为什么要做？不做会怎样？ | |
| **Who** | 谁来做？涉及哪些利益相关方？ | |
| **When** | 什么时候做？关键时间节点？ | |
| **Where** | 在哪里做？影响范围？ | |
| **How** | 怎么做？具体方法和步骤？ | |
| **How Much** | 需要多少资源？ROI 评估？ | |

**盲点检查**：有哪个 W/H 没有被充分考虑？
**优先行动**：基于分析，最应该先解决哪个维度？

不要让分析停留在提问。每个维度都要有具体、可执行的回答。$$, '用 5W2H 方法拆解这个问题/计划：

{{topic}}

| 维度 | 问题 | 分析 |
|---|---|---|
| **What** | 要做什么？核心目标是？ | |
| **Why*...', '思维工具', ARRAY['5W2H','分析','框架'], 'prompt-ark', 'zh', 'prompt', 89, 9, 139, 1, 90, 'public'),
('复盘教练', $$帮我对以下事件进行结构化复盘：

{{event}}

复盘框架（GRAI 模型）：
1. **Goal（目标回顾）**：
   - 当初的目标是什么？
   - 目标设定合理吗？

2. **Result（结果对比）**：
   - 实际结果 vs 预期目标
   - 差距有多大？超额还是不足？

3. **Analysis（原因分析）**：
   - 成功因素：哪些做法值得继续？（至少 3 点）
   - 失败因素：哪些做法需要改变？（至少 3 点）
   - 区分运气和实力的成分

4. **Insight（行动洞察）**：
   - 提炼 1 条可复用的方法论
   - 下次类似情况的行动清单

不要做流水账式复盘。重点是提炼出可迁移的认知。$$, '帮我对以下事件进行结构化复盘：

{{event}}

复盘框架（GRAI 模型）：
1. **Goal（目标回顾）**：
   - 当初的目标是什么？
   - 目标设定合理吗？

2. **Res...', '思维工具', ARRAY['复盘','反思','总结'], 'prompt-ark', 'zh', 'prompt', 90, 26, 159, 1, 83, 'public'),
('类比推理助手', $$用类比思维帮我理解/解决这个问题：

{{question}}

步骤：
1. **寻找类比**：从完全不同的领域找 3 个与此问题结构相似的情境
2. **映射关系**：画出原问题和类比情境之间的对应关系表
   | 原问题要素 | 类比情境要素 | 对应关系 |
   |---|---|---|
3. **借鉴方案**：这些类比领域是怎么解决类似问题的？
4. **迁移应用**：将借鉴的方案翻译回原问题的语境
5. **检验**：类比在哪里成立，在哪里不成立？（找出类比的局限性）

好的类比应该来自尽可能远的领域。用生物学类比商业，用建筑学类比编程，越跨界越好。$$, '用类比思维帮我理解/解决这个问题：

{{question}}

步骤：
1. **寻找类比**：从完全不同的领域找 3 个与此问题结构相似的情境
2. **映射关系**：画出原问题和类比情境之间的对...', '思维工具', ARRAY['类比','跨界','创新'], 'prompt-ark', 'zh', 'prompt', 90, 32, 174, 1, 72, 'public'),
('成语故事讲解', $$深度讲解这个成语：

{{idiom}}

结构：
1. **字面解释**：每个字的原始含义
2. **典故出处**：原始故事（用生动的叙事而非百科式罗列）
3. **含义演变**：从古到今，含义发生了什么变化？
4. **正确用法**：2 个正确的例句
5. **常见误用**：这个成语最容易在什么场景下被错用？
6. **近义辨析**：与 1-2 个近义成语的区别

不要写成词典条目。要像给朋友讲一个有趣的故事一样。$$, '深度讲解这个成语：

{{idiom}}

结构：
1. **字面解释**：每个字的原始含义
2. **典故出处**：原始故事（用生动的叙事而非百科式罗列）
3. **含义演变**：从古到今，含义发生...', '国学文化', ARRAY['成语','故事','文化'], 'prompt-ark', 'zh', 'prompt', 91, 39, 203, 1, 53, 'public'),
('对联创作', $$创作一副对联：

主题/场景：{{theme}}

要求：
- 字数对齐，平仄工整
- 上下联词性对仗
- 意境优美，有巧思
- 横批四字点睛

提供 3 副不同风格的对联：
1. **典雅古风**：用典、意境深远
2. **通俗趣味**：接地气、有幽默感
3. **创意新颖**：打破常规但不失工整

每副对联附简要赏析（为什么这么对，巧在哪里）。

不要为凑字数而使用生僻字或晦涩典故。好对联应该雅俗共赏。$$, '创作一副对联：

主题/场景：{{theme}}

要求：
- 字数对齐，平仄工整
- 上下联词性对仗
- 意境优美，有巧思
- 横批四字点睛

提供 3 副不同风格的对联：
1. **典雅古风**：...', '国学文化', ARRAY['对联','创作','传统'], 'prompt-ark', 'zh', 'prompt', 91, 49, 105, 1, 52, 'public'),
('古今人物对话', $$模拟一场{{historical_figure}}与现代人关于{{topic}}的对话。

规则：
- {{historical_figure}}的语言风格要忠实于其时代和性格
- 适度引用其真实的名言或思想
- 现代人用当代口语，可以适当用网络用语
- 对话要有思想碰撞，不是简单的"古人说得对"
- 至少 8 轮对话

对话中要自然地融入{{historical_figure}}的 3 个核心思想观点。

不要把古人写成完美的圣人。他们也有时代局限性，对话应该呈现这种张力。$$, '模拟一场{{historical_figure}}与现代人关于{{topic}}的对话。

规则：
- {{historical_figure}}的语言风格要忠实于其时代和性格
- 适度引用其真实的名...', '国学文化', ARRAY['对话','历史','人物'], 'prompt-ark', 'zh', 'prompt', 92, 12, 90, 2, 60, 'public'),
('诗词创作助手', $$以{{theme}}为主题创作一首{{form:七言绝句}}。

创作要求：
- 严格遵守格律（平仄、押韵、对仗）
- 避免直白说理，要"言有尽而意无穷"
- 至少使用 1 个通感或化用前人佳句
- 意象选择要新颖，避免"明月""清风"等俗套意象

输出：
**作品**：
[诗词正文]

**自评**：
- 格律校验：平仄/押韵是否合规
- 意象选择：为什么选这些意象
- 最得意的一句：为什么觉得写得好
- 不足之处：哪里还可以打磨

不要只求"像诗"。要有真情实感和个人视角。$$, '以{{theme}}为主题创作一首{{form:七言绝句}}。

创作要求：
- 严格遵守格律（平仄、押韵、对仗）
- 避免直白说理，要"言有尽而意无穷"
- 至少使用 1 个通感或化用前人佳句
- ...', '国学文化', ARRAY['诗词','创作','格律'], 'prompt-ark', 'zh', 'prompt', 92, 5, 47, 2, 61, 'public'),
('中华典故应用', $$推荐适合以下场景使用的中华典故/名言：

使用场景：{{scenario}}

推荐 5 个典故/名言，每个包含：

| 序号 | 典故/名言 | 出处 | 原文含义 | 在此场景如何使用 | 使用示例句 |
|---|---|---|---|---|---|

分类：
- 2 个广为人知的经典（确保不会用错）
- 2 个相对冷门但恰切的（展现文化底蕴）
- 1 个可以幽默化用的（调节气氛）

提醒：标注哪些典故在特定场合可能有负面联想需要慎用。$$, '推荐适合以下场景使用的中华典故/名言：

使用场景：{{scenario}}

推荐 5 个典故/名言，每个包含：

| 序号 | 典故/名言 | 出处 | 原文含义 | 在此场景如何使用 | 使用示...', '国学文化', ARRAY['典故','名言','应用'], 'prompt-ark', 'zh', 'prompt', 93, 13, 72, 1, 57, 'public'),
('文言文翻译与仿写', $$完成以下文言文相关任务：

文言文原文：
{{text}}

任务 1 — 精准翻译：
逐句对照翻译，格式：
> 原文：[文言文]
> 翻译：[现代文]
> 注释：[关键字词解释]

任务 2 — 语法分析：
标注文中出现的特殊文言语法（判断句、被动句、倒装句、省略句等）

任务 3 — 风格仿写：
模仿此文的文风，以"{{modern_topic}}"为主题写一段 100 字左右的文言文，附上白话文对照。

翻译要准确达意，不要为了好听而曲解原意。仿写要「神似」而非「形似」。$$, '完成以下文言文相关任务：

文言文原文：
{{text}}

任务 1 — 精准翻译：
逐句对照翻译，格式：
> 原文：[文言文]
> 翻译：[现代文]
> 注释：[关键字词解释]

任务 2 — 语...', '国学文化', ARRAY['文言文','翻译','仿写'], 'prompt-ark', 'zh', 'prompt', 93, 4, 190, 2, 61, 'public');