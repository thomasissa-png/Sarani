// ─── Shared Brief Templates ──────────────────────────────────────────────────
// Based on the real Sarani PM briefing format used with the 35-expert team.
// These templates are shared between /admin/quick-brief and /admin/tracker/new.

export const PROJECT_TYPES = [
  { value: "generic", label: "Other / General" },
  { value: "design", label: "Graphic Design" },
  { value: "video", label: "Video Editing" },
  { value: "translation", label: "Translation" },
] as const;

export const BRIEF_TEMPLATES: Record<string, string> = {
  generic: `🌟 Introduction / Goal:
[Short description of the project, the client, and its purpose]

✈️ Brief:
[Project briefing — paste the client email, a document link, or write the brief here]

🚚 Deliverables:
[Number of assets, formats, dimensions, file types]

📍 Source Files:
[Links to Google Drive, SharePoint, or any required files]

💬 Branding / Inspirations:
[Brand toolkit link if any]
[Inspirations from past projects — use public SharePoint links]

➡️ Others:
[Naming conventions, adaptation overviews, special instructions]`,

  design: `🌟 Introduction / Goal:
[Client name — campaign or project purpose]

✈️ Brief:
[Design brief — what needs to be created, for what audience, where it will be used]

🚚 Deliverables:
Number of assets:
Formats: [1080x1080 / 1200x628 / 320x50 / etc.]
File type: [JPG / PNG / PDF / AI / PSD]
Languages: [EN / FR / etc.]

📍 Source Files:
[Google Drive or SharePoint link to logos, photos, previous versions]

💬 Branding / Inspirations:
Brand guidelines: [link to brand book or "attached"]
Inspirations: [links to reference designs or past projects]
Colors / Fonts: [specific constraints or "follow brand book"]

➡️ Others:
Naming convention: [e.g. CLIENT_CAMPAIGN_FORMAT_LANG_v01]
For multiple adaptations: [provide an overview file like Overview-01.png]
For print files: [provide low-res PDF + image for client review]`,

  video: `🌟 Introduction / Goal:
[Client name — video purpose, platform, campaign context]

✈️ Brief:
[Video brief — story/message, key moments, tone, pacing]

🚚 Deliverables:
Number of videos:
Duration: [15s / 30s / 60s / etc.]
Aspect ratio: [16:9 / 9:16 / 1:1]
Format: [MP4 H.264 / ProRes / MOV]
Resolution: [1080p / 4K]
Subtitles: [Yes — languages: / No]

📍 Source Files:
Raw footage: [link to drive/SharePoint or "to be provided"]
Music / VO: [client provides / Sarani sources / no music]

💬 Branding / Inspirations:
Brand guidelines: [link or "attached"]
Reference videos: [links]
End card / Logo animation: [provided / to create / none]

➡️ Others:
Platform(s): [TikTok / Instagram / YouTube / LinkedIn]
[For heavy files: provide low-res version for review]`,

  translation: `🌟 Introduction / Goal:
[Client name — what document, why it needs translation]

✈️ Brief:
[Context: marketing / legal / technical — level of adaptation needed]

🚚 Deliverables:
Source language: [EN / FR / etc.]
Target language(s): [FR, DE, ES, IT, etc.]
Word count: [approx or "see attached"]
Number of files:
Output format: [same as source / DOCX / PDF / InDesign]

📍 Source Files:
[Link to documents to translate]
[Link to glossary / TM if available]

💬 Branding / Inspirations:
Tone: [formal / casual / technical / marketing]
Do-not-translate terms: [brand names, product names, etc.]
Previous translations: [link to approved versions if any]

➡️ Others:
[Transcreation needed? Cultural adaptation?]
[Layout adaptation needed? (e.g. RTL for Arabic)]`,
};
