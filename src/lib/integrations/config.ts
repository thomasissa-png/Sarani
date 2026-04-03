// ─── Phase 3 Integration Configuration ──────────────────────────────────────
// Source of truth for all cross-system mappings:
//   ClickUp Space <-> Excel Tracker <-> SharePoint Customer Folder
// Data from Addendum A.1, A.4, A.5 of phase3-integrations-specs.md

// ─── SharePoint Drive IDs ────────────────────────────────────────────────────

/** OneDrive for Business (team@sarani.studio) — contains Excel tracker files */
export const SHAREPOINT_TRACKERS_DRIVE_ID =
  "b!JFtnCBXApE6jsyomGN6hXni64SgHnShCg41yK06ZLObe1kAv17nOTZJFGBX3aH4A";

/** SaraniAssets site — contains project folders and client assets */
export const SHAREPOINT_ASSETS_DRIVE_ID =
  "b!BTvSB7PxVEeCQbtgLKBtdI62eOvL4gFEkH_L6luQY04w7z1UWPKDQ4GDuZJmfD9_";

/** Base path within the Trackers drive (OneDrive personal — no /Documents prefix) */
export const TRACKERS_BASE_PATH =
  "/00. Administrative/03. Financials (Trackers)";

/** Base path within the Assets drive where customer folders live */
export const ASSETS_CUSTOMERS_BASE_PATH = "/Documents/03. Customers";

// ─── ClickUp Status Mappings ─────────────────────────────────────────────────
// From Addendum A.2: real statuses discovered via live API exploration

export type ClickUpStatusName = "Open" | "in progress" | "review" | "Closed";

export interface ClickUpStatusMapping {
  readonly clickupStatus: ClickUpStatusName;
  readonly type: "open" | "custom" | "closed";
  readonly color: string;
  readonly projectStatus: string;
  readonly invoiceStatus: string | null;
}

export const CLICKUP_STATUS_MAPPINGS: readonly ClickUpStatusMapping[] = [
  {
    clickupStatus: "Open",
    type: "open",
    color: "#87909e",
    projectStatus: "In progress",
    invoiceStatus: null,
  },
  {
    clickupStatus: "in progress",
    type: "custom",
    color: "#1090e0",
    projectStatus: "In progress",
    invoiceStatus: null,
  },
  {
    clickupStatus: "review",
    type: "custom",
    color: "#5f55ee",
    projectStatus: "In progress",
    invoiceStatus: "Open PO",
  },
  {
    clickupStatus: "Closed",
    type: "closed",
    color: "#008844",
    projectStatus: "Delivered",
    invoiceStatus: null,
  },
] as const;

// ─── Client Integration Mapping ─────────────────────────────────────────────
// From Addendum A.5: mapping ClickUp Space -> Excel Tracker -> SharePoint folder

export interface ClientSubdivision {
  /** Division name (e.g., "Sony France", "Sony Pro") */
  readonly name: string;
  /** ClickUp List ID for this division */
  readonly clickupListId: string;
  /** ClickUp URL for quick access */
  readonly clickupUrl: string;
  /** SharePoint subfolder name within the client's Projects folder (e.g., "15. TikTok P&E SEA") */
  readonly sharepointSubfolder?: string;
}

export interface ClientIntegrationMapping {
  /** ClickUp Space name (exact match) */
  readonly clickupSpaceName: string;
  /** ClickUp Space ID */
  readonly clickupSpaceId: string;
  /** Excel tracker filename (in TRACKERS_BASE_PATH) */
  readonly excelTrackerFilename: string;
  /** Customer folder path relative to ASSETS_CUSTOMERS_BASE_PATH */
  readonly sharepointCustomerFolder: string;
  /** Subdivisions/entities within the client (e.g., Sony France, Sony Pro) */
  readonly subdivisions?: readonly ClientSubdivision[];
}

export const CLIENT_MAPPINGS: readonly ClientIntegrationMapping[] = [
  {
    clickupSpaceName: "Sony",
    clickupSpaceId: "90100452675",
    excelTrackerFilename: "01. Sarani_Sony Projects.xlsx",
    sharepointCustomerFolder: "02. Sony",
    subdivisions: [
      { name: "Sony France", clickupListId: "900303355039", clickupUrl: "https://app.clickup.com/14389859/v/li/900303355039" },
      { name: "Sony Europe", clickupListId: "900502245411", clickupUrl: "https://app.clickup.com/14389859/v/li/900502245411" },
      { name: "Sony Pro", clickupListId: "900502249763", clickupUrl: "https://app.clickup.com/14389859/v/li/900502249763" },
    ],
  },
  {
    clickupSpaceName: "TikTok",
    clickupSpaceId: "90050434316",
    excelTrackerFilename: "02. Sarani_Bytedance Projects.xlsx",
    sharepointCustomerFolder: "05. TikTok",
    subdivisions: [
      { name: "TikTok Germany", clickupListId: "900502249117", clickupUrl: "https://app.clickup.com/14389859/v/li/900502249117", sharepointSubfolder: "02. Germany" },
      { name: "TikTok France", clickupListId: "900502247465", clickupUrl: "https://app.clickup.com/14389859/v/li/900502247465", sharepointSubfolder: "03. France" },
      { name: "TikTok UK", clickupListId: "900303407539", clickupUrl: "https://app.clickup.com/14389859/v/li/900303407539", sharepointSubfolder: "03. UK" },
      { name: "TikTok SMB", clickupListId: "900802525893", clickupUrl: "https://app.clickup.com/14389859/v/li/900802525893", sharepointSubfolder: "04. SMB" },
      { name: "TikTok Global Accounts", clickupListId: "900502263845", clickupUrl: "https://app.clickup.com/14389859/v/li/900502263845", sharepointSubfolder: "05. Global Accounts" },
      { name: "TikTok Benelux", clickupListId: "900502247464", clickupUrl: "https://app.clickup.com/14389859/v/li/900502247464", sharepointSubfolder: "06. Benelux" },
      { name: "TikTok Shop SEA", clickupListId: "900502247998", clickupUrl: "https://app.clickup.com/14389859/v/li/900502247998", sharepointSubfolder: "07. SEA" },
      { name: "TikTok US Branding", clickupListId: "900502251376", clickupUrl: "https://app.clickup.com/14389859/v/li/900502251376", sharepointSubfolder: "08. US Branding" },
      { name: "TikTok USA", clickupListId: "901701757963", clickupUrl: "https://app.clickup.com/14389859/v/li/901701757963", sharepointSubfolder: "09. USA" },
      { name: "TikTok METAP", clickupListId: "901701490958", clickupUrl: "https://app.clickup.com/14389859/v/li/901701490958", sharepointSubfolder: "10. METAP" },
      { name: "TikTok LIVE", clickupListId: "901702577214", clickupUrl: "https://app.clickup.com/14389859/v/li/901702577214", sharepointSubfolder: "12. TikTok LIVE" },
      { name: "TikTok Shop EMEA", clickupListId: "901702723533", clickupUrl: "https://app.clickup.com/14389859/v/li/901702723533", sharepointSubfolder: "13. TikTok Shop EMEA" },
      { name: "TikTok CEE", clickupListId: "901702750815", clickupUrl: "https://app.clickup.com/14389859/v/li/901702750815", sharepointSubfolder: "14. TikTok CEE" },
      { name: "TikTok P&E SEA", clickupListId: "901702879453", clickupUrl: "https://app.clickup.com/14389859/v/li/901702879453", sharepointSubfolder: "15. TikTok P&E SEA" },
      { name: "TikTok Shop USA", clickupListId: "901702899564", clickupUrl: "https://app.clickup.com/14389859/v/li/901702899564", sharepointSubfolder: "16. TikTok Shop USA" },
      { name: "TikTok Others", clickupListId: "901704680268", clickupUrl: "https://app.clickup.com/14389859/v/li/901704680268", sharepointSubfolder: "17. Others" },
      { name: "TikTok Shop LATAM", clickupListId: "901704846947", clickupUrl: "https://app.clickup.com/14389859/v/li/901704846947", sharepointSubfolder: "18. TikTok Shop LATAM" },
      { name: "TikTok CCA", clickupListId: "901705458972", clickupUrl: "https://app.clickup.com/14389859/v/li/901705458972", sharepointSubfolder: "19. TikTok CCA" },
      { name: "TikTok Shop UK", clickupListId: "901706876621", clickupUrl: "https://app.clickup.com/14389859/v/li/901706876621", sharepointSubfolder: "20. TikTok Shop UK" },
      { name: "TikTok EU Branding", clickupListId: "901711816120", clickupUrl: "https://app.clickup.com/14389859/v/li/901711816120", sharepointSubfolder: "21. TikTok EU Branding" },
      { name: "TTS Global Ops", clickupListId: "901712261426", clickupUrl: "https://app.clickup.com/14389859/v/li/901712261426", sharepointSubfolder: "22. TTS Global Ops" },
    ],
  },
  {
    clickupSpaceName: "PICO XR",
    clickupSpaceId: "90050434327",
    excelTrackerFilename: "02. Sarani_Bytedance Projects.xlsx",
    sharepointCustomerFolder: "04. PICO XR",
    subdivisions: [
      { name: "PICO B2C EMEA", clickupListId: "900502247535", clickupUrl: "https://app.clickup.com/14389859/v/li/900502247535" },
      { name: "PICO B2B EMEA", clickupListId: "900502247536", clickupUrl: "https://app.clickup.com/14389859/v/li/900502247536" },
    ],
  },
  {
    clickupSpaceName: "Other customers",
    clickupSpaceId: "90050435651",
    excelTrackerFilename: "03. Sarani_Other Projects.xlsx",
    sharepointCustomerFolder: "01. Single Projects",
  },
  {
    clickupSpaceName: "Aristocrat",
    clickupSpaceId: "90174878459",
    excelTrackerFilename: "04. Sarani_Aristocrat Projects.xlsx",
    sharepointCustomerFolder: "11. Aristocrat",
    subdivisions: [
      { name: "Aristocrat USA", clickupListId: "901712262709", clickupUrl: "https://app.clickup.com/14389859/v/li/901712262709" },
      { name: "Aristocrat Asia", clickupListId: "901712262834", clickupUrl: "https://app.clickup.com/14389859/v/li/901712262834" },
    ],
  },
  {
    clickupSpaceName: "Ubi",
    clickupSpaceId: "90171040997",
    excelTrackerFilename: "09. Sarani_Projets Ubi.xlsx",
    sharepointCustomerFolder: "17. Ubi",
    subdivisions: [
      { name: "Adidas", clickupListId: "901704341200", clickupUrl: "https://app.clickup.com/14389859/v/li/901704341200" },
      { name: "Ubi Internal", clickupListId: "901704345673", clickupUrl: "https://app.clickup.com/14389859/v/li/901704345673" },
      { name: "Red Bull", clickupListId: "901707332168", clickupUrl: "https://app.clickup.com/14389859/v/li/901707332168" },
      { name: "LEGO", clickupListId: "901704345855", clickupUrl: "https://app.clickup.com/14389859/v/li/901704345855" },
      { name: "IKEA", clickupListId: "901704970300", clickupUrl: "https://app.clickup.com/14389859/v/li/901704970300" },
      { name: "TikTok via Ubi", clickupListId: "901706944747", clickupUrl: "https://app.clickup.com/14389859/v/li/901706944747" },
      { name: "Barilla", clickupListId: "901712149614", clickupUrl: "https://app.clickup.com/14389859/v/li/901712149614" },
    ],
  },
  {
    clickupSpaceName: "Aujan",
    clickupSpaceId: "90171121804",
    excelTrackerFilename: "10. Sarani_Aujan Projects.xlsx",
    sharepointCustomerFolder: "18. Aujan",
    subdivisions: [
      { name: "Aujan Corporate", clickupListId: "901705328640", clickupUrl: "https://app.clickup.com/14389859/v/li/901705328640" },
      { name: "Rani", clickupListId: "901704818470", clickupUrl: "https://app.clickup.com/14389859/v/li/901704818470" },
      { name: "Barbican", clickupListId: "901705328468", clickupUrl: "https://app.clickup.com/14389859/v/li/901705328468" },
    ],
  },
  {
    clickupSpaceName: "Bose",
    clickupSpaceId: "90171343766",
    excelTrackerFilename: "11. Sarani_Bose Projects.xlsx",
    sharepointCustomerFolder: "19. Bose",
    subdivisions: [
      { name: "Bose", clickupListId: "901705794806", clickupUrl: "https://app.clickup.com/14389859/v/li/901705794806" },
    ],
  },
  {
    clickupSpaceName: "Lamarck",
    clickupSpaceId: "90172906076",
    excelTrackerFilename: "12. Sarani_Lamarck Projects.xlsx",
    sharepointCustomerFolder: "21.Lamarck",
    subdivisions: [
      { name: "Lamarck", clickupListId: "901708730218", clickupUrl: "https://app.clickup.com/14389859/v/li/901708730218" },
    ],
  },
  {
    clickupSpaceName: "CMC Markets",
    clickupSpaceId: "90172572190",
    excelTrackerFilename: "13. Sarani_CMC Markets Project.xlsx",
    sharepointCustomerFolder: "20. CMC Markets",
    subdivisions: [
      { name: "CMC Markets", clickupListId: "901708074740", clickupUrl: "https://app.clickup.com/14389859/v/li/901708074740" },
    ],
  },
] as const;

// ─── Additional ClickUp Spaces (no tracker mapping yet) ─────────────────────

export const CLICKUP_SPACES_WITHOUT_TRACKER = [
  { name: "Brand Native", id: "90050436581" },
  { name: "Sarani", id: "90050433950" },
] as const;

// ─── Global Overview Tracker ─────────────────────────────────────────────────

export const GLOBAL_OVERVIEW_FILENAME = "00. Global Overview.xlsx";

// ─── Excel Sheet Name Candidates ────────────────────────────────────────────
// Ordered list of worksheet names to try when reading Excel files.
// Used by both the tracker route and the create-project route.
export const EXCEL_SHEET_NAME_CANDIDATES = ["Sheet1", "Feuil1", "Feuille1"] as const;

// ─── ClickUp PM User ID Mapping ─────────────────────────────────────────────
// Maps Sarani user emails to their ClickUp user IDs.
// Used to set the PM custom field on newly created tasks.
// Find IDs via ClickUp API: GET /team/{team_id}/member

export const CLICKUP_PM_MAPPING: Record<string, number> = {
  "thomas@sarani.studio": 38103140, // Emmanuel Gomez = Thomas Issa
};

/** All ClickUp team members — used for assignee dropdown in briefs and feedback */
export interface ClickUpTeamMember {
  readonly name: string;
  readonly id: number;
  readonly skills: readonly string[];       // "design", "video", "translation", "social", "copywriting", "pm"
  readonly languages: readonly string[];    // ISO codes: "fr", "en", "es", "it", "de", etc.
  readonly clients: readonly string[];      // Client names: "Sony", "TikTok", etc.
}

export const CLICKUP_TEAM_MEMBERS: readonly ClickUpTeamMember[] = [
  { name: "Thomas Issa", id: 38103140, skills: ["pm"], languages: ["fr", "en"], clients: ["Sony", "TikTok", "Aristocrat", "Bose", "GEODIS", "PICO XR", "Lamarck", "Ubi", "Aujan", "CMC Markets"] },
  { name: "Lauriane Celton", id: 290479583, skills: ["design"], languages: ["fr", "en"], clients: ["Lamarck"] },
  { name: "Camilla Palermo", id: 49467956, skills: ["design"], languages: ["en", "it"], clients: ["Sony"] },
  { name: "Claire Boutreux", id: 266547441, skills: ["design"], languages: ["fr", "en"], clients: ["Lamarck"] },
  { name: "Hiruni", id: 95230414, skills: ["pm"], languages: ["en"], clients: ["TikTok", "Sony", "GEODIS", "PICO XR"] }, // Departed — replaced by Anastasia
  { name: "Anastasia", id: 0, skills: ["pm"], languages: ["fr", "en"], clients: ["Bose", "Aristocrat", "CMC Markets"] }, // New PM starting Monday — TODO: get ClickUp ID
  { name: "Claudia Salgueiro", id: 89382349, skills: ["design"], languages: ["pt", "en", "es"], clients: ["TikTok"] },
  { name: "Affan Hakim", id: 60852951, skills: ["video"], languages: ["en"], clients: ["Sony", "TikTok", "Aristocrat", "Bose", "GEODIS", "PICO XR", "Lamarck", "Ubi", "Aujan", "CMC Markets"] },
  { name: "JC", id: 89363031, skills: ["video"], languages: ["en"], clients: ["TikTok", "Sony"] },
  { name: "Mahée Ahouansou", id: 89360336, skills: ["pm"], languages: ["fr", "en"], clients: ["TikTok"] },
  { name: "Branko Rosic", id: 89354959, skills: ["design"], languages: ["en", "sr"], clients: ["Bose", "Ubi"] },
  { name: "Cristina Ramos", id: 38467924, skills: ["design"], languages: ["es", "en"], clients: ["Sony"] },
  { name: "Ameena Gorton", id: 89353227, skills: ["pm"], languages: ["en"], clients: ["Sony", "TikTok", "Aristocrat", "Bose", "GEODIS", "PICO XR", "Lamarck", "Ubi", "Aujan", "CMC Markets"] },
  { name: "Gabrielle Belledent", id: 80499023, skills: ["social"], languages: ["fr", "en"], clients: ["TikTok", "PICO XR"] },
  { name: "Anissa Baroudi", id: 78188831, skills: ["design"], languages: ["fr", "en", "ar"], clients: ["Sony", "TikTok", "Aristocrat", "Bose", "GEODIS", "PICO XR", "Lamarck", "Ubi", "Aujan", "CMC Markets"] },
  { name: "Clara Jaeger", id: 89331511, skills: ["pm"], languages: ["fr", "en", "de"], clients: ["TikTok", "Sony", "Ubi"] },
  { name: "AnneLaure G.", id: 89316728, skills: ["pm"], languages: ["fr", "en"], clients: ["Lamarck", "Ubi"] },
  { name: "Prudence Ip", id: 182471913, skills: ["design"], languages: ["en", "zh"], clients: ["TikTok", "Sony"] },
  { name: "Milan Pantović", id: 182468711, skills: ["design"], languages: ["en", "sr"], clients: ["Ubi", "Sony", "PICO XR", "Aristocrat"] },
  { name: "Marie Foster", id: 88228411, skills: ["copywriting"], languages: ["en", "fr"], clients: ["TikTok"] },
  { name: "Carla Pavetti", id: 89273119, skills: ["design"], languages: ["it", "en"], clients: ["Ubi", "PICO XR", "Sony"] },
  { name: "Claire Boussuge", id: 89271372, skills: ["pm"], languages: ["fr", "en"], clients: ["TikTok", "Aristocrat"] },
  { name: "Abdelrahman Garhi", id: 4663471, skills: ["design"], languages: ["ar", "en"], clients: ["TikTok"] },
  { name: "Aurélie Touchard", id: 96738712, skills: ["pm"], languages: ["fr", "en"], clients: ["Sony", "PICO XR"] },
  { name: "Amjad Jameel", id: 89225560, skills: ["design"], languages: ["ar", "en"], clients: ["Aujan"] },
  { name: "Pablo Ojeda", id: 89176064, skills: ["design"], languages: ["es", "en"], clients: ["TikTok"] },
  { name: "Alessia Faustini", id: 89176061, skills: ["copywriting"], languages: ["it", "en"], clients: ["TikTok"] },
  { name: "Chloé Mwenge", id: 10948297, skills: ["design"], languages: ["fr", "en"], clients: ["Ubi"] },
  { name: "Genaro Splendore", id: 56576185, skills: ["video"], languages: ["it", "en", "es"], clients: ["Sony", "TikTok", "Aristocrat", "Bose", "GEODIS", "PICO XR", "Lamarck", "Ubi", "Aujan", "CMC Markets"] },
  { name: "Jason Angeles", id: 56575760, skills: ["design"], languages: ["en"], clients: ["Sony", "TikTok", "Aristocrat", "Bose", "GEODIS", "PICO XR", "Lamarck", "Ubi", "Aujan", "CMC Markets"] },
  { name: "Luis Caballero", id: 56575759, skills: ["design"], languages: ["es", "en"], clients: ["Sony", "TikTok", "Aristocrat", "Bose", "GEODIS", "PICO XR", "Lamarck", "Ubi", "Aujan", "CMC Markets"] },
  { name: "Silvia Franzi", id: 56575757, skills: ["translation", "copywriting"], languages: ["it", "en", "fr"], clients: ["Sony"] },
  { name: "Fanny Place", id: 56575754, skills: ["pm"], languages: ["fr", "en"], clients: ["Sony", "TikTok"] },
  { name: "Carole Eid", id: 56575753, skills: ["pm"], languages: ["fr", "en", "ar"], clients: ["TikTok"] },
  { name: "Ara dela Fuente", id: 38103175, skills: ["design"], languages: ["es", "en"], clients: ["Sony", "TikTok", "Aristocrat", "Bose", "GEODIS", "PICO XR", "Lamarck", "Ubi", "Aujan", "CMC Markets"] },
  { name: "Binary Data", id: 94804152, skills: [], languages: [], clients: [] }, // System user — not a real team member
];

// ─── Team Recommendation Helper ─────────────────────────────────────────────
// Returns the top N team members matching the project's requirements.

export interface TeamRecommendation {
  member: ClickUpTeamMember;
  score: number;        // 0-100 relevance score
  reasons: string[];    // Why this member is recommended
}

// ─── PM Assignment by Client + Timezone ────────────────────────────────────

const PM_ASSIGNMENT_CET: Record<string, string[]> = {
  Sony: ["Aurélie Touchard"],
  "PICO XR": ["Aurélie Touchard"],
  Ubi: ["AnneLaure G."],
  TikTok: ["Mahée Ahouansou", "Carole Eid"],
  Lamarck: ["AnneLaure G."],
  Bose: ["Anastasia"],
  GEODIS: ["Aurélie Touchard"],
  Aristocrat: ["Anastasia"],
  Aujan: ["Ameena Gorton"],
  "CMC Markets": ["Anastasia"],
};

const PM_ASSIGNMENT_EVENING: Record<string, string[]> = {
  Sony: ["Fanny Place", "Clara Jaeger"],
  TikTok: ["Claire Boussuge", "Clara Jaeger"],
  "CMC Markets": ["Clara Jaeger"],
  Aristocrat: ["Claire Boussuge"],
};
const PM_ASSIGNMENT_EVENING_DEFAULT = ["Clara Jaeger"];

/**
 * Get recommended PM(s) for a client based on current time.
 * CET hours (8h-18h) → daytime PMs. Evening → Americas PMs.
 */
export function getRecommendedPM(clientName: string): string[] {
  const hour = new Date().getUTCHours() + 2; // Rough CET approximation
  const isCET = hour >= 8 && hour < 18;

  if (isCET) {
    return PM_ASSIGNMENT_CET[clientName] ?? [];
  }
  return PM_ASSIGNMENT_EVENING[clientName] ?? PM_ASSIGNMENT_EVENING_DEFAULT;
}

/**
 * Recommend team members for a project based on skill match, language match,
 * and prior client experience. Returns top `limit` matches sorted by score.
 */
export function recommendTeamMembers(params: {
  projectType: string;      // "design", "video", "translation", "social", "other"
  clientName?: string;       // "Sony", "TikTok", etc.
  languages?: string[];      // ["en", "fr"]
  limit?: number;            // default 5
}): TeamRecommendation[] {
  const { projectType, clientName, languages = [], limit = 5 } = params;

  const recommendations: TeamRecommendation[] = [];

  for (const member of CLICKUP_TEAM_MEMBERS) {
    // Skip system users and PMs
    if (member.skills.length === 0) continue;
    if (member.skills.length === 1 && member.skills[0] === "pm") continue;

    let score = 0;
    const reasons: string[] = [];

    // Skill match (40 points)
    const skillMap: Record<string, string[]> = {
      design: ["design"],
      video: ["video"],
      translation: ["translation", "copywriting"],
      social: ["social", "design", "copywriting"],
      other: ["design", "copywriting"],
    };
    const relevantSkills = skillMap[projectType] ?? ["design"];
    const hasSkill = member.skills.some((s) => relevantSkills.includes(s));
    if (hasSkill) {
      score += 40;
      const matched = member.skills.filter((s) => relevantSkills.includes(s));
      reasons.push(`Skills: ${matched.join(", ")}`);
    } else {
      continue; // No point recommending someone without the right skills
    }

    // Client experience (30 points)
    if (clientName && member.clients.some((c) => c.toLowerCase() === clientName.toLowerCase())) {
      score += 30;
      reasons.push(`Worked with ${clientName}`);
    }

    // Language match (30 points — proportional to overlap)
    if (languages.length > 0) {
      const langOverlap = languages.filter((l) =>
        member.languages.includes(l.toLowerCase())
      );
      if (langOverlap.length > 0) {
        const langScore = Math.round((langOverlap.length / languages.length) * 30);
        score += langScore;
        reasons.push(`Languages: ${langOverlap.join(", ").toUpperCase()}`);
      }
    } else {
      // No language requirement — give partial credit to English speakers
      if (member.languages.includes("en")) {
        score += 10;
      }
    }

    recommendations.push({ member, score, reasons });
  }

  return recommendations
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// ─── Project Benchmarks (few-shot references for estimation) ────────────────
// Historical project data used to calibrate LLM workload estimation.
// Add real examples as they accumulate — the more, the better Arya estimates.

export interface ProjectBenchmark {
  readonly type: string;          // "design", "video", "translation", "social"
  readonly description: string;   // Short description of the project scope
  readonly totalFiles: number;    // Total deliverable count
  readonly estimatedHours: number;// Actual hours spent (or best estimate)
  readonly exampleClient: string; // Client for context
}

export const PROJECT_BENCHMARKS: readonly ProjectBenchmark[] = [
  { type: "design", description: "50 banners 3 sizes 2 languages", totalFiles: 300, estimatedHours: 8, exampleClient: "Sony" },
  { type: "video", description: "80 TikTok videos editing", totalFiles: 80, estimatedHours: 40, exampleClient: "TikTok" },
  { type: "translation", description: "Cashback copies 10 markets 10 languages", totalFiles: 100, estimatedHours: 16, exampleClient: "Sony" },
  { type: "design", description: "350 presentation slides rebranding", totalFiles: 350, estimatedHours: 24, exampleClient: "GEODIS" },
  { type: "design", description: "10 social media posts 3 sizes", totalFiles: 30, estimatedHours: 3, exampleClient: "Bose" },
  { type: "video", description: "5 product launch videos 30s each", totalFiles: 5, estimatedHours: 15, exampleClient: "Aristocrat" },
  { type: "translation", description: "Website copy 5 languages", totalFiles: 50, estimatedHours: 10, exampleClient: "CMC Markets" },
  { type: "design", description: "Full brand guidelines deck 80 pages", totalFiles: 80, estimatedHours: 16, exampleClient: "Lamarck" },
] as const;

/**
 * Get benchmarks relevant to a project type for few-shot prompt injection.
 * Returns up to `limit` benchmarks sorted by type match then total files.
 */
export function getRelevantBenchmarks(
  projectType: string,
  limit: number = 4
): ProjectBenchmark[] {
  // Exact type matches first, then all others as fallback
  const exactMatches = PROJECT_BENCHMARKS.filter((b) => b.type === projectType);
  const others = PROJECT_BENCHMARKS.filter((b) => b.type !== projectType);
  return [...exactMatches, ...others].slice(0, limit);
}

/**
 * Build a prompt block with estimation references for injection into brief-extractor.
 * Pass "all" to include all benchmarks (useful when project type is unknown).
 */
export function buildEstimationPromptBlock(projectType: string): string {
  const benchmarks = projectType === "all"
    ? [...PROJECT_BENCHMARKS]
    : getRelevantBenchmarks(projectType);
  if (benchmarks.length === 0) return "";

  const lines = [
    "",
    "ESTIMATION REFERENCE (similar past projects):",
  ];
  for (const b of benchmarks) {
    lines.push(`- ${b.description} = ${b.totalFiles} files → ~${b.estimatedHours}h ${b.type}`);
  }
  lines.push("Estimate this project's complexity based on these references.");
  return lines.join("\n");
}

// ─── Cache TTL Configuration (seconds) ──────────────────────────────────────

export const CACHE_TTL = {
  /** ClickUp API responses */
  clickup: 600, // 10 minutes
  /** Evoliz API responses */
  evoliz: 600, // 10 minutes
  /** SharePoint Excel reads (very expensive — 50+ sheets across 9 files) */
  sharepoint: 3600, // 1 hour (force-refresh via "Sync now" button)
} as const;

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Find the client mapping for a given ClickUp Space name.
 * Uses a 3-tier match strategy:
 *   1. Exact match (case-insensitive)
 *   2. Contains match (space name contains mapping name, or vice versa)
 *   3. First-word match (e.g. "CMC" matches "CMC Markets")
 * Returns undefined if no mapping exists (e.g. Brand Native, Sarani internal).
 */
export function getMappingBySpaceName(
  spaceName: string
): ClientIntegrationMapping | undefined {
  const lower = spaceName.toLowerCase().trim();
  // 1. Exact match
  const exact = CLIENT_MAPPINGS.find(
    (m) => m.clickupSpaceName.toLowerCase() === lower
  );
  if (exact) return exact;
  // 2. Contains match (skip "Other customers" — too generic)
  const contains = CLIENT_MAPPINGS.find((m) => {
    const ml = m.clickupSpaceName.toLowerCase();
    if (ml === "other customers") return false;
    return lower.includes(ml) || ml.includes(lower);
  });
  if (contains) return contains;
  // 3. First-word match (for cases like "CMC" matching "CMC Markets")
  const firstWord = lower.split(/\s+/)[0];
  if (firstWord.length >= 3) {
    const byFirstWord = CLIENT_MAPPINGS.find((m) => {
      const ml = m.clickupSpaceName.toLowerCase();
      if (ml === "other customers") return false;
      return ml.startsWith(firstWord) || firstWord.startsWith(ml.split(/\s+/)[0]);
    });
    if (byFirstWord) return byFirstWord;
  }
  // 4. Subdivision name match (e.g. "Sony Professional" matches Sony's "Sony Pro" subdivision)
  const bySubdivision = CLIENT_MAPPINGS.find((m) => {
    if (!m.subdivisions) return false;
    return m.subdivisions.some((sub) => {
      const sl = sub.name.toLowerCase();
      return lower.includes(sl) || sl.includes(lower);
    });
  });
  if (bySubdivision) return bySubdivision;
  return undefined;
}

/**
 * Find a subdivision by its ClickUp List ID.
 * Returns the parent mapping + the matched subdivision, or undefined.
 * This is the PRIMARY lookup for ShareFolderModal — no fuzzy matching needed.
 */
export function getSubdivisionByListId(
  listId: string
): { mapping: ClientIntegrationMapping; subdivision: ClientSubdivision } | undefined {
  for (const m of CLIENT_MAPPINGS) {
    if (!m.subdivisions) continue;
    const sub = m.subdivisions.find((s) => s.clickupListId === listId);
    if (sub) return { mapping: m, subdivision: sub };
  }
  return undefined;
}

/**
 * Find a subdivision by its name (e.g. "TikTok P&E SEA").
 * Used as fallback when list ID lookup fails.
 */
export function getSubdivisionByName(
  name: string
): { mapping: ClientIntegrationMapping; subdivision: ClientSubdivision } | undefined {
  const normalized = name.toLowerCase().trim();
  for (const m of CLIENT_MAPPINGS) {
    if (!m.subdivisions) continue;
    const sub = m.subdivisions.find((s) => s.name.toLowerCase().trim() === normalized);
    if (sub) return { mapping: m, subdivision: sub };
  }
  return undefined;
}

/**
 * Find the client mapping for a given ClickUp Space ID.
 */
export function getMappingBySpaceId(
  spaceId: string
): ClientIntegrationMapping | undefined {
  return CLIENT_MAPPINGS.find((m) => m.clickupSpaceId === spaceId);
}

/**
 * Find the client mapping for a given Excel tracker filename.
 */
export function getMappingByTrackerFilename(
  filename: string
): ClientIntegrationMapping | undefined {
  return CLIENT_MAPPINGS.find(
    (m) => m.excelTrackerFilename.toLowerCase() === filename.toLowerCase()
  );
}

/**
 * Build the full SharePoint path for a tracker file.
 */
export function getTrackerFullPath(filename: string): string {
  return `${TRACKERS_BASE_PATH}/${filename}`;
}

/**
 * Build the full SharePoint path for a customer folder in SaraniAssets.
 */
export function getCustomerFolderPath(customerFolder: string): string {
  return `${ASSETS_CUSTOMERS_BASE_PATH}/${customerFolder}`;
}

/**
 * Map a ClickUp status string to the project/invoice status tuple.
 * Returns null if the status is not recognized.
 */
export function mapClickUpStatus(
  status: string
): { projectStatus: string; invoiceStatus: string | null } | null {
  const mapping = CLICKUP_STATUS_MAPPINGS.find(
    (m) => m.clickupStatus.toLowerCase() === status.toLowerCase()
  );
  if (!mapping) return null;
  return {
    projectStatus: mapping.projectStatus,
    invoiceStatus: mapping.invoiceStatus,
  };
}
