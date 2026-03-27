# Video AI Prompt Library — Sarani

*Produced by @ia — 2026-03-27*
*Livrable: `docs/ia/video-prompt-library.md`*
*Context: optimized prompt templates for AI video preview generation in the Sarani back-office*
*References: `docs/product/video-ai-specs.md`, `docs/product/storyboard-specs.md`, `project-context.md`*

**Persona**: Sophie, 38, Head of Marketing at enterprise clients (TikTok, Sony, Adidas, GEODIS). She needs to validate creative concepts fast — not wait 2 weeks for a production edit. These prompts generate the AI previews she reviews for approval, replacing slow agency back-and-forth with instant iteration.

**KPI North Star**: 10M EUR CA at 20% EBITDA. This library directly impacts scalability (more projects, same team) and margin (fewer regenerations = lower AI costs per project). Every prompt optimization reduces the average cost-per-preview while increasing Sophie's approval rate on first pass.

**Provider strategy** (validated by Thomas — 2026-03-27, see `docs/product/video-ai-specs.md` H-03): Veo 3.1 (client-facing quality), Runway Gen-4 Turbo (fast internal iterations), Kling 3.0 via fal.ai (fallback/volume). PiAPI + Kling 2.6 abandoned.

---

## Table of Contents

1. [Prompt Templates by Content Type](#1-prompt-templates-by-content-type)
2. [Prompt Engineering Rules by Provider](#2-prompt-engineering-rules-by-provider)
3. [Scene Description Template](#3-scene-description-template)
4. [Image-to-Video Bridge Prompts](#4-image-to-video-bridge-prompts)
5. [Quality Checklist](#5-quality-checklist)

---

## 1. Prompt Templates by Content Type

Each template uses `{placeholders}` that the back-office auto-fills from the Video Script agent output (fields: `action`, `visualDirection`, `duration`, `dialogue`, `cameraDirection`). The system prompt wrapper is applied by `src/lib/ai/video-prompt-builder.ts` before sending to the provider API.

### 1.1 Product Showcase

*Use case: hero product shots for Sony, L'Oreal — close-up, rotation, studio lighting.*

```
{shot_type} of {product_name} on {surface_material} surface. {product_action}.
Studio lighting: {lighting_setup}. Background: {background_description}.
Camera: {camera_movement}. Smooth, commercial-grade motion.
No text, no logos, no hands unless specified. {duration}s.
```

**Example (Sony headphones):**
```
Extreme close-up of Sony WH-1000XM6 headphones on matte black marble surface.
The headphones rotate slowly 180 degrees revealing the ear cup texture and brushed metal hinge.
Studio lighting: single soft key light from upper left, subtle rim light from behind creating a halo on the ear cup edge.
Background: deep charcoal gradient, no reflections.
Camera: slow orbit right to left at ear-cup height. Smooth, commercial-grade motion.
No text, no logos, no hands unless specified. 5s.
```

### 1.2 Event Recap

*Use case: capturing energy and atmosphere for Adidas, PICO events.*

```
{shot_type} of {event_type} at {venue_description}. {crowd_description} {crowd_action}.
{focal_subject} {subject_action} in the {position_in_frame}.
Lighting: {lighting_description}. Atmosphere: {atmosphere_keywords}.
Camera: {camera_movement}. Energy: high. Pace: {editing_pace}.
No exact face details required. {duration}s.
```

**Example (Adidas product launch):**
```
Wide tracking shot of a sneaker launch event at an industrial warehouse venue.
A crowd of 30+ attendees cheering and raising phones as confetti falls from above.
A presenter on a raised platform unveils a shoe display case in the center of frame.
Lighting: dramatic stage spotlights with blue and white washes, lens flares from overhead rigs.
Atmosphere: electric, celebratory, premium.
Camera: steady crane shot descending from above the crowd toward the stage. Energy: high. Pace: fast.
No exact face details required. 10s.
```

### 1.3 Brand Story

*Use case: narrative storytelling for TikTok, Pernod Ricard — emotion, characters, arcs.*

```
{shot_type}. {character_description} {character_action} in {environment}.
Expression: {facial_expression}. Body language: {body_language}.
{environmental_detail} adds texture to the scene.
Lighting: {lighting_mood}. Color palette: {color_palette}.
Camera: {camera_movement}. Mood: {emotional_tone}. Cinematic depth of field.
{dialogue_direction}. {duration}s.
```

**Example (Pernod Ricard evening gathering):**
```
Medium close-up. A woman in her 30s in a linen blouse smiles and raises a glass toward
a friend seated across a rustic wooden table in a Provencal garden at golden hour.
Expression: genuine warmth, eyes crinkling. Body language: relaxed shoulders, leaning forward slightly.
Cicadas hum, string lights sway gently above the table, a half-empty bottle of wine catches the light.
Lighting: warm golden hour backlight with soft fill from the string lights. Color palette: amber, olive, cream.
Camera: slow push-in from waist-level. Mood: intimate, convivial. Cinematic depth of field.
Ambient laughter and clinking glasses in the background. 10s.
```

### 1.4 Explainer / Motion Design

*Use case: animated graphics, data visualization for GEODIS logistics.*

```
{animation_style} animation. {graphic_element} {element_action} on {background_style} background.
{data_or_text_content} {text_animation}.
Color scheme: {brand_colors}. Typography style: {font_style}.
Camera: {camera_movement}. Transition: {transition_type}.
Clean, modern, corporate. No photorealistic elements. {duration}s.
```

**Example (GEODIS supply chain explainer):**
```
Flat design motion graphics animation. A world map with glowing route lines draws itself
from Shanghai to Rotterdam to New York on a dark navy background.
Three KPI counters animate upward: "350+ routes", "98.7% on-time", "24/7 tracking".
Each counter slides in from the bottom with a subtle bounce easing.
Color scheme: GEODIS blue (#003366), white, accent gold (#FFB800). Typography style: bold sans-serif, clean.
Camera: static with slight zoom-out to reveal the full map. Transition: smooth fade between data points.
Clean, modern, corporate. No photorealistic elements. 10s.
```

### 1.5 Social Media Teaser

*Use case: vertical 9:16 hooks for TikTok — fast, punchy, scroll-stopping.*

```
Vertical 9:16. {hook_action} in the first 1 second.
{subject_description} {subject_action} in {environment}.
{visual_hook_element} draws the eye immediately.
Lighting: {lighting_style}. Pace: fast cuts, {transitions}.
Camera: {camera_movement}. Style: {aesthetic_keywords}.
High energy, designed to stop the scroll. {duration}s.
```

**Example (TikTok campaign teaser):**
```
Vertical 9:16. A neon sign flickers ON reading "DROP" in the first 1 second.
A young man in streetwear catches a sneaker box mid-air in a graffiti-covered alley at night.
The sneaker box glows with an inner light, casting colored shadows on the walls — draws the eye immediately.
Lighting: neon pink and cyan from signs above, harsh directional shadows. Pace: fast cuts, whip pans.
Camera: handheld, slight shake, quick push-in to the subject's face reacting. Style: raw, urban, Gen-Z energy.
High energy, designed to stop the scroll. 5s.
```

### 1.6 Corporate / Institutional

*Use case: professional, values-driven content for France Chimie, GIE.*

```
{shot_type} of {subject_description} in {corporate_environment}.
{subject_action}. Professional attire, natural behavior.
Environment details: {environment_details}.
Lighting: {lighting_style}. Tone: {brand_tone}.
Camera: {camera_movement}. Steady, composed, authoritative.
No dramatic effects. Clean, trustworthy aesthetic. {duration}s.
```

**Example (France Chimie institutional):**
```
Medium shot of a female engineer in a white lab coat examining a sample vial
in a modern chemistry laboratory with floor-to-ceiling windows.
She holds the vial up to the light, nods, and makes a note on a digital tablet. Professional attire, natural behavior.
Environment details: clean lab benches, safety equipment visible, green plants on windowsill, colleagues blurred in background.
Lighting: bright, even, natural daylight from large windows supplemented by overhead fluorescents. Tone: competent, innovative, trustworthy.
Camera: slow dolly right, keeping the subject centered. Steady, composed, authoritative.
No dramatic effects. Clean, trustworthy aesthetic. 8s.
```

---

## 2. Prompt Engineering Rules by Provider

### 2.1 Veo 3.1 (Primary — Client Quality)

**What works:**

| Technique | Why it works | Example |
|---|---|---|
| 7-layer formula: Camera + Subject + Action + Environment + Lighting + Style + Audio | Aligns with Veo's cross-modal attention architecture | "Medium close-up, 50mm lens. A barista pours steamed milk into a latte. Cafe counter, morning. Soft window light from the left. Warm film grain. Milk-frothing hiss, background chatter." |
| One action per shot | Physics engine destabilizes with conflicting simultaneous actions | Split "walks, talks, and gestures" into 3 separate clips |
| Plain, specific language over poetic metaphors | Model interprets literally — metaphors cause hallucinations | "Wind-whipped jacket, dust trail from shoes" not "a dance with the wind" |
| Native audio/dialogue cues | Veo 3.1 generates synchronized audio natively | Include `[DIALOGUE]: "Welcome to our lab"` or `[SFX]: glass clinking` |
| Negative prompts | Removes unwanted artifacts | "No captions, no extra people, no jump cuts, no text overlay" |
| Avoid exact counts | Model struggles with precise object duplication | "A small group of colleagues" not "five people standing" |
| Seed parameter for consistency | Reproduces lighting/palette across multi-scene projects | Reuse the same seed + consistent lighting/lens descriptors across scenes |
| Reference images (max 3) | Anchors visual style when consistency matters | Upload brand reference frame + color palette swatch |

**What to avoid:**
- Abstract concepts ("the feeling of innovation") — translate to physical visuals
- Multiple scene changes in one generation
- Prompts over 200 words — diminishing returns after ~150 words
- Switching aspect ratio mid-project (lock 16:9 or 9:16 at start)

### 2.2 Runway Gen-4 Turbo (Secondary — Fast Iterations)

**What works:**

| Technique | Why it works | Example |
|---|---|---|
| Image-first prompting | The input image establishes visuals — prompt describes MOTION only | Upload storyboard frame, prompt: "The subject slowly turns to face the camera" |
| General subject terms | "The subject" or "she" keeps model focused on motion, not re-interpreting appearance | "The subject raises her hand" not "the 35-year-old woman with brown hair raises her hand" |
| Single scene per generation | Gen-4 produces 5s or 10s clips — one scene each | Never attempt scene transitions within a single generation |
| Camera motion vocabulary | Model excels at cinematic camera language | "Slow dolly forward", "steady tracking shot", "locked-off tripod" |
| 5s for simple actions, 10s for complex | Duration choice prevents motion artifacts | A head turn = 5s. A walk + sit + pick up object = 10s |
| Style descriptors | Model supports explicit style control | "Cinematic", "handheld", "vintage film", "smooth animation" |

**What to avoid:**
- Negative phrasing ("don't show", "no movement") — model ignores or inverts negatives
- Abstract/conceptual language ("convey the spirit of teamwork") — describe physical actions
- Describing visual details already present in the input image — redundant and may conflict
- Overloading motion descriptions — one primary action + one secondary maximum

**Turbo vs Standard decision rule:**
- Use Turbo for: iteration, testing compositions, client review drafts (half the credits, 3x faster)
- Use Standard Gen-4 for: final client-facing deliverables where motion fidelity is critical

### 2.3 Kling 3.0 via fal.ai (Fallback)

**What works:**

| Technique | Why it works | Example |
|---|---|---|
| 5-layer structure: Scene, Characters, Action, Camera, Audio/Style | Matches Kling's processing pipeline | Write prompts in this exact order for best results |
| 80-150 word sweet spot | Beyond 150 words, model averages conflicting instructions | Identify 5-6 key visual elements, describe each precisely |
| Physical motion descriptions | Weight, momentum, texture cues guide frame-to-frame coherence | "Her foot lands heel-first on wet cobblestone, weight shifting forward" |
| Anchor hands to objects | Eliminates the common AI hand distortion problem | "Fingers grip the ceramic cup edge" not "she gestures" |
| Multi-shot prompting (up to 6 shots) | Native capability — label each shot explicitly | `[SHOT 1]: Wide establishing... [SHOT 2]: Close-up reaction...` |
| Character consistency descriptors | Define once, reuse exact descriptors across shots | "The woman in the red coat" referenced identically in every shot |
| Negative prompts | Required for gritty/realistic looks — model defaults to polished/smiling | "Negative: smiling, cartoonish, 3D render, smooth plastic skin, floating limbs" |
| Motion intensity 0.5 as starting point | Moderate intensity prevents motion artifacts | Scale up only after confirming base prompt works |
| Physical textures | Film grain, skin pores, fabric creases add realism | "Subtle film grain, visible fabric texture on the jacket collar" |

**What to avoid:**
- Prompts over 150 words (quality degrades beyond sweet spot)
- Free-floating hand movements without object anchoring
- Generic lighting terms ("good lighting", "nice lighting") — be specific
- Starting with complex multi-shot before validating single-shot
- Omitting negative prompts for realistic scenes (model defaults to idealized/smooth)

**Kling-specific parameters via fal.ai:**
- `motion_intensity`: 0.0-1.0 (start at 0.5)
- `first_frame` / `last_frame`: upload for precise start/end control
- Resolution: 1080p for testing, 4K for final renders
- Duration: up to 15 seconds natively

---

## 3. Scene Description Template

Every scene in a Sarani video script maps to one AI generation call. The back-office transforms the script agent's structured output into this canonical format before sending to any provider. Field order matters — providers process tokens sequentially.

### Canonical Format

```
[SHOT]: {shot_type}
[CAMERA]: {camera_movement}, {lens_focal_length}
[SUBJECT]: {subject_description}
[ACTION]: {primary_action}. {secondary_action_if_any}.
[ENVIRONMENT]: {location}, {time_of_day}, {weather_or_conditions}
[LIGHTING]: {key_light_position}, {light_quality}, {color_temperature}
[MOOD]: {emotional_tone}, {energy_level}
[STYLE]: {visual_style}, {texture_keywords}
[AUDIO]: {dialogue_or_sfx_or_music_cue}
[NEGATIVE]: {elements_to_exclude}
[DURATION]: {seconds}s
[ASPECT]: {aspect_ratio}
```

### Field Reference

| Field | Required | Values / Examples |
|---|---|---|
| SHOT | Yes | Extreme close-up, Close-up, Medium close-up, Medium, Medium wide, Wide, Extreme wide, Over-the-shoulder, POV, Bird's eye, Low angle |
| CAMERA | Yes | Static/locked-off, Pan left/right, Tilt up/down, Dolly in/out, Tracking left/right, Crane up/down, Orbit, Handheld, Whip pan, Zoom in/out, Steadicam follow |
| SUBJECT | Yes | Concise physical description. For people: age range, clothing, 1-2 distinguishing features. For products: brand name, model, material, color |
| ACTION | Yes | One primary action per scene. Maximum one secondary action. Use physical verbs ("pours", "lifts", "turns") not conceptual ("contemplates", "represents") |
| ENVIRONMENT | Yes | Specific location + time + conditions. "Modern chemistry lab, midday, fluorescent overhead" not "a nice room" |
| LIGHTING | Yes | Direction + quality + temperature. "Soft key light from upper left, warm 3200K" not "good lighting" |
| MOOD | Yes | Emotional tone + energy. "Intimate, low energy" or "Electric, high energy" |
| STYLE | No | Visual treatment. "Cinematic film grain", "Clean commercial", "Raw handheld documentary" |
| AUDIO | No | Dialogue in quotes, SFX descriptions, music cues. Supported natively by Veo 3.1 and Kling 3.0. Runway Gen-4 ignores audio prompts — handle audio in post |
| NEGATIVE | Recommended | Elements to exclude. Veo 3.1 and Kling 3.0 support negative prompts. Omit for Runway Gen-4 (negative phrasing causes unpredictable results) |
| DURATION | Yes | 5s or 10s (Veo/Runway). Up to 15s (Kling). Match complexity to duration — simple action = 5s, compound action = 10s |
| ASPECT | Yes | 16:9 (landscape/corporate/event), 9:16 (social/TikTok), 1:1 (Instagram feed) |

### Provider-Specific Assembly

The `video-prompt-builder.ts` module assembles the canonical fields into provider-optimized strings:

**Veo 3.1 assembly:** All fields concatenated in natural language. Audio field included inline. Negative field appended as separate sentence.
```
"{SHOT} shot, {CAMERA}. {SUBJECT} {ACTION} in {ENVIRONMENT}. {LIGHTING}. {MOOD} atmosphere.
{STYLE}. [DIALOGUE]: {AUDIO}. No {NEGATIVE}. {DURATION}s."
```

**Runway Gen-4 assembly:** Motion-focused. Visual details assumed from input image. Audio and Negative fields stripped.
```
"{CAMERA}. {ACTION}. {MOOD} energy. {DURATION}s."
```
(Input image carries: SUBJECT, ENVIRONMENT, LIGHTING, STYLE)

**Kling 3.0 assembly:** 5-layer structure. Negative field sent via dedicated API parameter.
```
"[Scene]: {ENVIRONMENT}, {LIGHTING}. [Character]: {SUBJECT}. [Action]: {ACTION}.
[Camera]: {SHOT}, {CAMERA}. [Style]: {STYLE}, {MOOD}."
```
(Negative sent as `negative_prompt` parameter. Audio sent as `audio_prompt` parameter.)

---

## 4. Image-to-Video Bridge Prompts

When the optional storyboard step is used (see `docs/product/storyboard-specs.md`), each scene has a Flux.1 Pro generated image that becomes the visual anchor for video generation. This section documents how to bridge from static image to motion.

### 4.1 Provider-Specific Image Reference

**Runway Gen-4 (best for image-to-video):**
- Upload the storyboard frame as the input image — this IS the primary visual reference
- The prompt describes ONLY the desired motion, not the visuals
- Use "the subject" or pronouns to reference elements already visible in the image
- Do not re-describe clothing, colors, environment — the image carries all visual context

```
// Prompt when storyboard image is provided:
"{camera_movement}. The subject {primary_motion}. {secondary_motion_if_any}. {duration}s."

// Example:
"Slow dolly forward. The subject turns to face the camera and smiles slightly. Her hair moves with a gentle breeze. 5s."
```

**Veo 3.1 (reference image mode):**
- Upload storyboard frame as reference image (max 3 images per generation)
- Still requires a full text prompt — the image is a style/composition anchor, not the sole input
- Prompt should describe the scene fully but add: "Matching the visual style and composition of the reference image"

```
// Prompt when storyboard image is provided:
"{full_scene_prompt_from_canonical_template}. Matching the visual style, color palette,
and composition of the reference image. {duration}s."
```

**Kling 3.0 (first-frame control):**
- Upload storyboard frame as `first_frame` parameter via fal.ai API
- The video will start exactly from this frame and animate forward
- Prompt describes what happens AFTER the first frame — the motion trajectory

```
// Prompt when storyboard image is provided as first_frame:
"Starting from this frame: {primary_motion}. {camera_movement}.
{environmental_motion} adds life to the background. {duration}s."

// Example:
"Starting from this frame: the engineer lifts the vial to eye level and examines it against the window light.
Slow push-in. Lab equipment hums softly in the background. 8s."
```

### 4.2 Describing Motion from a Static Image

When converting a storyboard image to video, follow this protocol:

1. **Identify the implied motion.** What was the subject about to do? The script's `action` field provides this.
2. **Describe the motion trajectory, not the pose.** The image already shows the starting pose. Describe where the motion goes.
3. **Add environmental motion.** Static backgrounds feel dead. Always add at least one ambient motion: wind in hair, steam rising, background figures moving, light shifting.
4. **Specify motion intensity.** Subtle scenes (corporate, intimate) = low intensity. Action scenes (event, teaser) = high intensity.

**Motion descriptor vocabulary for common transitions:**

| Static pose in image | Motion prompt addition |
|---|---|
| Person standing | "shifts weight, takes a step forward" |
| Person sitting at desk | "leans forward, fingers begin typing on keyboard" |
| Product on surface | "rotates slowly, light catches the surface edge" |
| Group of people | "the foreground figure turns to speak, background figures react" |
| Landscape/cityscape | "camera slowly pans right revealing more of the skyline, clouds drift" |
| Hands holding object | "fingers adjust grip, tilts the object toward camera" |

### 4.3 Maintaining Visual Consistency Across Scenes

When generating multiple video scenes from a storyboard sequence:

- **Lock the seed** (Veo 3.1): use the same seed value across all scenes in a project
- **Reuse exact character descriptors**: if scene 1 says "woman in red coat, mid-30s, dark hair in a low bun" — every subsequent scene must use this exact phrase
- **Maintain lighting continuity**: if the storyboard establishes golden hour, every scene prompt includes the same lighting descriptor
- **Use the storyboard image as first_frame** (Kling) or reference image (Veo) for every scene to anchor the visual palette
- **Runway Gen-4**: upload a consistent reference image for character/style — the model's character consistency feature will maintain identity across generations

---

## 5. Quality Checklist

Run this checklist on every prompt BEFORE submitting to the API. A prompt that fails any CRITICAL item will produce poor results and waste generation credits. Remember: Sophie (Head of Marketing) sees these previews — every failed generation is a delay in her approval cycle and a cost against our 20% EBITDA target.

### Pre-Submission Checklist

| # | Check | Class | Pass criteria |
|---|---|---|---|
| Q1 | Single primary action | CRITICAL | The prompt describes exactly ONE main action. No "walks AND talks AND picks up the phone" |
| Q2 | Physical verbs only | CRITICAL | Every action uses a concrete physical verb. No "contemplates", "represents", "evokes" |
| Q3 | Specific lighting | CRITICAL | Light direction + quality + color temperature specified. No "good lighting" or "nice atmosphere" |
| Q4 | Shot type declared | CRITICAL | One of: extreme close-up, close-up, medium, wide, etc. Never undefined |
| Q5 | Camera movement declared | CRITICAL | Explicit camera instruction or "static/locked-off". Never omitted |
| Q6 | Duration matches complexity | REQUIRED | Simple single action = 5s. Multi-element or compound action = 10s. Never 5s for complex motion |
| Q7 | Aspect ratio set | REQUIRED | 16:9, 9:16, or 1:1 declared. Matches the deliverable format (social = 9:16, corporate = 16:9) |
| Q8 | Word count in range | REQUIRED | Veo: under 200 words. Kling: 80-150 words. Runway: under 50 words (motion only) |
| Q9 | No abstract language | REQUIRED | No metaphors, no conceptual descriptions. Everything translatable to a visual |
| Q10 | Negative prompts included | RECOMMENDED | For Veo and Kling: explicit list of elements to exclude. Omitted for Runway |
| Q11 | Character descriptors consistent | RECOMMENDED | If multi-scene: exact same descriptor phrase used for recurring characters |
| Q12 | Hands anchored to objects | RECOMMENDED | Any visible hands grip, hold, or rest on something specific |
| Q13 | Environmental motion present | RECOMMENDED | At least one ambient motion element (wind, steam, background movement, light shift) |
| Q14 | Provider-appropriate format | CRITICAL | Veo = full natural language. Runway = motion-only with input image. Kling = 5-layer structure |
| Q15 | No brand logos described | REQUIRED | Never ask AI to generate logos or brand text — these are composited in post-production |

### Scoring

- **All CRITICAL pass**: prompt is ready to submit
- **1+ CRITICAL fail**: rewrite before submitting — high probability of wasted credits
- **REQUIRED fails**: prompt will likely work but results may be suboptimal — fix if time allows
- **RECOMMENDED fails**: acceptable for draft/iteration rounds, fix for final client-facing generations

### Common Failure Patterns and Fixes

| Failure | Symptom in output | Fix |
|---|---|---|
| Multiple actions in 5s clip | Jerky, incomplete motion — subject starts action but video ends before completion | Split into two 5s clips OR extend to 10s |
| Abstract mood description | Random, incoherent visuals — model "interprets" with hallucinations | Replace with physical descriptors: "warm golden backlight" not "cozy feeling" |
| Missing camera instruction | Camera wanders randomly, unexpected zooms or pans | Always declare camera: even "static, locked-off tripod" is better than nothing |
| Hands in free space | Distorted fingers, extra digits, melting hands | Anchor every hand to an object: cup, railing, tablet, pocket |
| Generic subject description | Inconsistent appearance across multi-scene generation | Define once with 3-4 specific traits, copy-paste across all scene prompts |
| Over-long prompt (200+ words) | Model averages instructions — some elements missing, others exaggerated | Cut to core: shot + camera + subject + action + light + mood. Remove redundancy |
| Negative phrasing in Runway | Opposite of intended result — told "no zoom" and got zoom | Remove all negatives for Runway. Describe what SHOULD happen, not what shouldn't |

---

**Handoff -> @fullstack**
- File produced: `docs/ia/video-prompt-library.md`
- Decisions made: canonical 12-field scene description format, provider-specific assembly rules (Veo = full NLP, Runway = motion-only, Kling = 5-layer), image-to-video bridge protocol per provider, 15-point quality checklist
- Action for @fullstack: implement `src/lib/ai/video-prompt-builder.ts` module that (a) takes structured scene data from the Video Script agent, (b) assembles prompts using the canonical format from Section 3, (c) applies provider-specific assembly rules from Section 3 "Provider-Specific Assembly", (d) runs the Q1-Q14 quality checks programmatically before API submission. The storyboard-to-video bridge logic (Section 4) should handle the optional `first_frame` / `reference_image` attachment per provider.
- Points of attention: Runway Gen-4 does NOT support negative prompts or audio prompts — strip these fields before submission. Kling negative prompts go in a separate API parameter (`negative_prompt`), not inline. Veo 3.1 audio/dialogue goes inline in the prompt text. Word count limits are provider-specific and must be enforced before API call.
