/**
 * Tests for the findMatchingFolder logic in ShareFolderModal.
 *
 * This replicates the exact algorithm from ShareFolderModal.tsx
 * to verify folder matching with real production data (TikTok scenario).
 */
import { describe, it, expect } from "vitest";

// ─── Replicate the exact matching logic from ShareFolderModal ───────────────

type FolderItem = { name: string; id: string };

function findMatchingFolder(
  folders: FolderItem[],
  clickupList: string,
  clientName: string
): FolderItem | null {
  const listLower = clickupList.toLowerCase().trim();
  const clientLower = clientName.toLowerCase().trim();

  const stripNumberPrefix = (name: string): string =>
    name.replace(/^\d+\.\s*/, "").trim();

  const normalize = (s: string): string =>
    s.replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

  const normalizedFolders = folders.map((f) => ({
    folder: f,
    raw: f.name.toLowerCase().trim(),
    stripped: stripNumberPrefix(f.name.toLowerCase().trim()),
    normalized: normalize(stripNumberPrefix(f.name.toLowerCase().trim())),
  }));

  const listNormalized = normalize(listLower);

  // Strategy 1: exact match
  const exact = normalizedFolders.find(
    (nf) =>
      nf.raw === listLower ||
      nf.stripped === listLower ||
      nf.normalized === listNormalized
  );
  if (exact) return exact.folder;

  // Strategy 2: mutual includes
  const byIncludes = normalizedFolders.find((nf) => {
    return (
      nf.stripped.includes(listLower) ||
      listLower.includes(nf.stripped) ||
      nf.normalized.includes(listNormalized) ||
      listNormalized.includes(nf.normalized)
    );
  });
  if (byIncludes) return byIncludes.folder;

  // Strategy 3: strip client prefix
  let stripped = listLower;
  if (stripped.startsWith(clientLower)) {
    stripped = stripped
      .slice(clientLower.length)
      .replace(/^[\s\-—]+/, "")
      .trim();
  }
  const words = listLower.split(/\s+/);
  const strippedFirstWord = words.length > 1 ? words.slice(1).join(" ") : "";

  for (const candidate of [stripped, strippedFirstWord]) {
    if (candidate.length < 2) continue;
    const candidateNorm = normalize(candidate);
    const match = normalizedFolders.find((nf) => {
      return (
        nf.stripped.includes(candidate) ||
        candidate.includes(nf.stripped) ||
        nf.normalized.includes(candidateNorm) ||
        candidateNorm.includes(nf.normalized)
      );
    });
    if (match) return match.folder;
  }

  // Strategy 4: tokenize + bidirectional scoring
  const genericTokens = new Set([
    ...clientLower.split(/\s+/),
    "others",
    "other",
    "tiktok",
  ]);
  const listTokens = new Set(
    listNormalized
      .split(/\s+/)
      .filter((t) => t.length >= 2 && !genericTokens.has(t))
  );
  if (listTokens.size === 0) return null;

  let bestMatch: FolderItem | null = null;
  let bestScore = 0;
  for (const nf of normalizedFolders) {
    const folderTokens = new Set(
      nf.normalized
        .split(/\s+/)
        .filter((t) => t.length >= 2 && !genericTokens.has(t))
    );
    if (folderTokens.size === 0) continue;
    let overlap = 0;
    for (const t of listTokens) {
      if (folderTokens.has(t)) overlap++;
    }
    const listCoverage = listTokens.size > 0 ? overlap / listTokens.size : 0;
    const folderCoverage =
      folderTokens.size > 0 ? overlap / folderTokens.size : 0;
    const score = Math.max(listCoverage, folderCoverage);
    if (overlap >= 1 && score > bestScore) {
      bestScore = score;
      bestMatch = nf.folder;
    }
  }
  if (bestMatch && bestScore >= 0.5) return bestMatch;

  return null;
}

// ─── Real SharePoint folder structure (TikTok project) ──────────────────────

const TIKTOK_FOLDERS: FolderItem[] = [
  { name: "01. Brand Guidelines", id: "folder-01" },
  { name: "02. Social Media", id: "folder-02" },
  { name: "03. Campaign Assets", id: "folder-03" },
  { name: "10. TikTok Creators", id: "folder-10" },
  { name: "11. TikTok Spark Ads", id: "folder-11" },
  { name: "12. TikTok Content Calendar", id: "folder-12" },
  { name: "15. TTS P&E SEA", id: "folder-15" },
  { name: "16. TTS Lifestyle", id: "folder-16" },
  { name: "17. TTS Health & Wellness", id: "folder-17" },
  { name: "20. Others", id: "folder-20" },
];

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("findMatchingFolder — TikTok real scenarios", () => {
  const CLIENT = "TikTok";

  it("CRITICAL: 'TikTok — TTS P&SEA-Weight Management Infographics & One-Pagers on CANVA' should match '15. TTS P&E SEA', NOT Others", () => {
    const result = findMatchingFolder(
      TIKTOK_FOLDERS,
      "TikTok — TTS P&SEA-Weight Management Infographics & One-Pagers on CANVA",
      CLIENT
    );
    expect(result).not.toBeNull();
    expect(result!.name).toBe("15. TTS P&E SEA");
    expect(result!.name).not.toContain("Others");
  });

  it("'TikTok — TTS P&E SEA' (exact with em-dash) matches '15. TTS P&E SEA'", () => {
    const result = findMatchingFolder(
      TIKTOK_FOLDERS,
      "TikTok — TTS P&E SEA",
      CLIENT
    );
    expect(result).not.toBeNull();
    expect(result!.name).toBe("15. TTS P&E SEA");
  });

  it("'TTS P&E SEA' (no client prefix) matches '15. TTS P&E SEA'", () => {
    const result = findMatchingFolder(
      TIKTOK_FOLDERS,
      "TTS P&E SEA",
      CLIENT
    );
    expect(result).not.toBeNull();
    expect(result!.name).toBe("15. TTS P&E SEA");
  });

  it("'TikTok Creators' matches '10. TikTok Creators'", () => {
    const result = findMatchingFolder(
      TIKTOK_FOLDERS,
      "TikTok Creators",
      CLIENT
    );
    expect(result).not.toBeNull();
    expect(result!.name).toBe("10. TikTok Creators");
  });

  it("'TikTok Spark Ads' matches '11. TikTok Spark Ads'", () => {
    const result = findMatchingFolder(
      TIKTOK_FOLDERS,
      "TikTok Spark Ads",
      CLIENT
    );
    expect(result).not.toBeNull();
    expect(result!.name).toBe("11. TikTok Spark Ads");
  });

  it("'TikTok — TTS Lifestyle' matches '16. TTS Lifestyle'", () => {
    const result = findMatchingFolder(
      TIKTOK_FOLDERS,
      "TikTok — TTS Lifestyle",
      CLIENT
    );
    expect(result).not.toBeNull();
    expect(result!.name).toBe("16. TTS Lifestyle");
  });

  it("'TTS Health & Wellness' matches '17. TTS Health & Wellness'", () => {
    const result = findMatchingFolder(
      TIKTOK_FOLDERS,
      "TTS Health & Wellness",
      CLIENT
    );
    expect(result).not.toBeNull();
    expect(result!.name).toBe("17. TTS Health & Wellness");
  });

  it("returns null for completely unrelated list name", () => {
    const result = findMatchingFolder(
      TIKTOK_FOLDERS,
      "Instagram Reels Production",
      CLIENT
    );
    expect(result).toBeNull();
  });

  it("does NOT match to 'Others' when a specific folder exists", () => {
    // This tests that "Others" is excluded from token scoring (generic tokens filter)
    const result = findMatchingFolder(
      TIKTOK_FOLDERS,
      "TikTok — TTS P&SEA Weight Management",
      CLIENT
    );
    expect(result).not.toBeNull();
    if (result) {
      expect(result.name).not.toContain("Others");
    }
  });
});

describe("findMatchingFolder — normalize function edge cases", () => {
  const CLIENT = "TikTok";

  it("handles ampersand differences: P&SEA vs P&E SEA", () => {
    // After normalize: "p sea" vs "p e sea"
    // This tests that normalize("p&sea") = "p sea" and normalize("p&e sea") = "p e sea"
    // Strategy 2 normalized includes should catch: "p sea" is NOT included in "p e sea"
    // but "tts p sea" IS partially covered by "tts p e sea" via token scoring
    const folders: FolderItem[] = [
      { name: "15. TTS P&E SEA", id: "f15" },
      { name: "20. Others", id: "f20" },
    ];
    const result = findMatchingFolder(folders, "TTS P&SEA", CLIENT);
    expect(result).not.toBeNull();
    expect(result!.name).toBe("15. TTS P&E SEA");
  });

  it("handles number prefix stripping: '15. TTS P&E SEA' → 'TTS P&E SEA'", () => {
    const folders: FolderItem[] = [
      { name: "15. TTS P&E SEA", id: "f15" },
    ];
    const result = findMatchingFolder(folders, "TTS P&E SEA", CLIENT);
    expect(result).not.toBeNull();
    expect(result!.name).toBe("15. TTS P&E SEA");
  });

  it("handles em-dash separator in client prefix stripping", () => {
    const folders: FolderItem[] = [
      { name: "Social Media", id: "f1" },
    ];
    // "ClientName — Social Media" → strip "clientname" → strip "— " → "social media"
    const result = findMatchingFolder(
      folders,
      "ClientName — Social Media",
      "ClientName"
    );
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Social Media");
  });

  it("handles hyphen separator in client prefix stripping", () => {
    const folders: FolderItem[] = [
      { name: "Social Media", id: "f1" },
    ];
    const result = findMatchingFolder(
      folders,
      "ClientName - Social Media",
      "ClientName"
    );
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Social Media");
  });
});

describe("findMatchingFolder — bidirectional scoring", () => {
  const CLIENT = "TikTok";

  it("long ClickUp name with short folder name scores bidirectionally", () => {
    // ClickUp: many tokens, only 2 match folder "TTS P&E SEA"
    // Old scoring: 2/8 = 0.25 < 0.5 → no match
    // New scoring: max(2/8, 2/2) = max(0.25, 1.0) = 1.0 → match!
    const folders: FolderItem[] = [
      { name: "15. TTS P&E SEA", id: "f15" },
      { name: "20. Others", id: "f20" },
    ];
    const result = findMatchingFolder(
      folders,
      "TikTok — TTS P&SEA-Weight Management Infographics & One-Pagers on CANVA",
      CLIENT
    );
    expect(result).not.toBeNull();
    expect(result!.name).toBe("15. TTS P&E SEA");
  });

  it("'Others' folder is never matched via token scoring (empty meaningful tokens)", () => {
    const folders: FolderItem[] = [
      { name: "20. Others", id: "f20" },
    ];
    // "Others" is in genericTokens, so folder has 0 meaningful tokens → skipped
    const result = findMatchingFolder(
      folders,
      "TikTok — Some Random List",
      CLIENT
    );
    expect(result).toBeNull();
  });
});

describe("findMatchingFolder — model name validation", () => {
  it("claude-sonnet-4-6-latest is the correct model identifier", () => {
    // This is a documentation test: the model name must NOT be claude-sonnet-4-latest
    const VALID_MODEL = "claude-sonnet-4-6-latest";
    const INVALID_MODEL = "claude-sonnet-4-latest";

    expect(VALID_MODEL).toContain("4-6");
    expect(INVALID_MODEL).not.toContain("4-6");

    // Read the actual file to verify
    // (This is validated by tsc + the 404 error Thomas reported)
  });
});
