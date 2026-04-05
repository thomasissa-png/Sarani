/**
 * Anti-regression tests — Session 18
 *
 * Each test below guards against a specific bug that occurred during S18.
 * Tests verify source code by static analysis (fs.readFileSync + regex).
 * If a bug is reintroduced, the corresponding test MUST fail.
 *
 * Convention: // REGRESSION: [description] -- fixed 2026-04-04
 */
import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "../..");
const read = (rel: string) =>
  fs.readFileSync(path.join(ROOT, rel), "utf-8");

/** Recursively find files matching a pattern under a directory */
function findFiles(dir: string, ext: string): string[] {
  const results: string[] = [];
  const absDir = path.join(ROOT, dir);
  if (!fs.existsSync(absDir)) return results;
  const walk = (d: string) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(ext)) results.push(path.relative(ROOT, full));
    }
  };
  walk(absDir);
  return results;
}

// ────────────────────────────────────────────────────────────────────────────
// 1. Server Component event handlers (2 consecutive crashes)
// REGRESSION: <video onError>, <a onClick> etc. in a Server Component crashes
//             at runtime. Event handlers on native HTML elements are forbidden
//             in files without "use client". -- fixed 2026-04-04
// ────────────────────────────────────────────────────────────────────────────
describe("Bug #1 — No event handlers on HTML elements in Server Components", () => {
  const filePath = "src/app/project/[clientSlug]/[projectSlug]/page.tsx";

  it("should NOT have 'use client' directive (it is a Server Component)", () => {
    const src = read(filePath);
    // The file must remain a Server Component
    expect(src.startsWith('"use client"') || src.startsWith("'use client'")).toBe(false);
  });

  it("should NOT have event handlers on native HTML elements", () => {
    const src = read(filePath);
    // Match on[A-Z] on native HTML tags: <tagname ... onSomething
    // Native HTML tags start with lowercase letter
    const htmlEventHandlerRegex = /<([a-z][a-zA-Z0-9]*)\b[^>]*\bon[A-Z][a-zA-Z]*=/g;
    const matches: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = htmlEventHandlerRegex.exec(src)) !== null) {
      matches.push(m[0]);
    }
    expect(matches).toEqual([]);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 2. Fetch with AbortSignal/timeout in admin frontend
// REGRESSION: AbortSignal.timeout in client-side fetch kills requests when
//             user switches tabs on mobile. -- fixed 2026-04-04
// ────────────────────────────────────────────────────────────────────────────
describe("Bug #2 — No AbortSignal.timeout in admin frontend files", () => {
  const adminTsxFiles = findFiles("src/app/admin", ".tsx");

  it("should find admin tsx files to test", () => {
    expect(adminTsxFiles.length).toBeGreaterThan(0);
  });

  it.each(adminTsxFiles)("%s must NOT contain AbortSignal.timeout", (file) => {
    const src = read(file);
    expect(src).not.toMatch(/AbortSignal\.timeout/);
  });

  it.each(adminTsxFiles)("%s must NOT contain signal: in a fetch call", (file) => {
    const src = read(file);
    // Match fetch(..., { ... signal: ... })
    // We look for "signal:" near a "fetch(" — simple heuristic via multiline scan
    const lines = src.split("\n");
    const violations: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (/\bsignal\s*:/.test(lines[i])) {
        // Check surrounding context (20 lines up) for fetch(
        const context = lines.slice(Math.max(0, i - 20), i + 1).join("\n");
        if (/\bfetch\s*\(/.test(context)) {
          violations.push(`Line ${i + 1}: ${lines[i].trim()}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 3. window.confirm / window.alert in admin
// REGRESSION: Native browser dialogs are not styled, block the thread,
//             and break mobile UX. Use ConfirmDialog instead. -- fixed 2026-04-04
// ────────────────────────────────────────────────────────────────────────────
describe("Bug #3 — No window.confirm / window.alert in admin", () => {
  const adminTsxFiles = findFiles("src/app/admin", ".tsx");

  it.each(adminTsxFiles)("%s must NOT contain window.confirm or window.alert or bare alert(", (file) => {
    const src = read(file);
    // Strip comments before checking
    const noComments = src
      .replace(/\/\/.*$/gm, "")       // single-line comments
      .replace(/\/\*[\s\S]*?\*\//g, ""); // multi-line comments
    expect(noComments).not.toMatch(/window\.confirm\s*\(/);
    expect(noComments).not.toMatch(/window\.alert\s*\(/);
    // alert( but not alertDialog, alertVariant, etc.
    // Match standalone alert( with word boundary
    const alertMatches = noComments.match(/(?<![.\w])alert\s*\(/g);
    expect(alertMatches ?? []).toEqual([]);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 4. LinkedIn visual base64 key mismatch
// REGRESSION: Using "base64" instead of "base64Png" caused the LinkedIn
//             visual to not be stored/rendered correctly. -- fixed 2026-04-04
// ────────────────────────────────────────────────────────────────────────────
describe("Bug #4 — LinkedIn visual uses base64Png key (not base64)", () => {
  const filePath = "src/app/api/admin/case-studies/candidates/[id]/generate/route.ts";

  it("should use base64Png key for LinkedIn visual storage", () => {
    const src = read(filePath);
    // There must be at least one occurrence of base64Png
    expect(src).toMatch(/base64Png/);
  });

  it("should NOT use bare 'base64:' key (without Png suffix) in object literals", () => {
    const src = read(filePath);
    // Match "base64:" or "base64 :" as an object key — but NOT "base64Png"
    // Look for base64 followed by colon, NOT followed by Png
    const violations = src.match(/\bbase64\s*:(?!.*Png)/g);
    // Filter out things like .toString("base64") which is fine
    const realViolations = (violations ?? []).filter(
      (v) => !v.includes("toString")
    );
    expect(realViolations).toEqual([]);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 5. Share link isActive check blocks access
// REGRESSION: Checking !preview.isActive blocked old/all versions of share
//             links. All versions must remain accessible. -- fixed 2026-04-04
// ────────────────────────────────────────────────────────────────────────────
describe("Bug #5 — Share links have no isActive gating", () => {
  const filePath = "src/app/project/[clientSlug]/[projectSlug]/page.tsx";

  it("must NOT check isActive to block access", () => {
    const src = read(filePath);
    expect(src).not.toMatch(/!preview\.isActive/);
    expect(src).not.toMatch(/isActive\s*===\s*false/);
    expect(src).not.toMatch(/isActive\s*!==\s*true/);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 6. Pipeline stuck — auto-recovery for "generating" status
// REGRESSION: Returning 409 immediately when status === "generating" left
//             the pipeline permanently stuck with no recovery. -- fixed 2026-04-04
// ────────────────────────────────────────────────────────────────────────────
describe("Bug #6 — Pipeline auto-recovery for stuck generating status", () => {
  const filePath = "src/app/api/admin/case-studies/candidates/[id]/generate/route.ts";

  it("must contain auto-recovery logic (not just a 409 block)", () => {
    const src = read(filePath);
    // Must detect "generating" status
    expect(src).toMatch(/status\s*===\s*["']generating["']/);
    // Must have a time-based threshold for recovery (not just immediate 409)
    expect(src).toMatch(/stuckThreshold|threshold|recovery|auto.?recover/i);
  });

  it("must NOT return 409 unconditionally for generating status", () => {
    const src = read(filePath);
    // Find the block around status === "generating"
    const genIndex = src.indexOf('"generating"');
    expect(genIndex).toBeGreaterThan(-1);
    // In the 500 chars after "generating", there should be a time check before 409
    const block = src.slice(genIndex, genIndex + 800);
    // Must have a conditional (Date.now, timestamp, updatedAt) before the 409
    expect(block).toMatch(/Date\.now|updatedAt|updated_at|timestamp/);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 7. Case studies on /work (not just /case-studies)
// REGRESSION: /work page did not query DB for pipeline-generated case studies,
//             only showed static ones. -- fixed 2026-04-04
// ────────────────────────────────────────────────────────────────────────────
describe("Bug #7 — /work page queries DB for published case studies", () => {
  const filePath = "src/app/work/page.tsx";

  it("must import from @/lib/db", () => {
    const src = read(filePath);
    expect(src).toMatch(/from\s+["']@\/lib\/db["']/);
  });

  it("must import caseStudyOutputs from schema", () => {
    const src = read(filePath);
    expect(src).toMatch(/caseStudyOutputs/);
  });

  it("must use isNotNull (for publishedAt filter)", () => {
    const src = read(filePath);
    expect(src).toMatch(/isNotNull/);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 8. VideoPlayer is a Client Component with proxy URL
// REGRESSION: VideoPlayer without "use client" crashed in Server Component
//             context. resolve=1 pattern failed (CORS on downloadUrl).
//             Fixed with stream=1 proxy passthrough. -- fixed 2026-04-05
// ────────────────────────────────────────────────────────────────────────────
describe("Bug #8 — VideoPlayer is a Client Component with proxy URL", () => {
  const filePath = "src/components/ui/VideoPlayer.tsx";

  it("must start with 'use client' directive", () => {
    const src = read(filePath);
    const firstLine = src.split("\n")[0].trim();
    expect(firstLine).toMatch(/^["']use client["']/);
  });

  it("must use stream=1 proxy URL pattern (NOT resolve=1 — see 15+ failed iterations)", () => {
    const src = read(filePath);
    expect(src).toMatch(/stream=1/);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 9. ConfirmDialog and useConfirm exist and work correctly
// REGRESSION: Without ConfirmDialog, the codebase used window.confirm
//             which breaks mobile UX. The hook must resolve false on cancel
//             (not leave Promise pending). -- fixed 2026-04-04
// ────────────────────────────────────────────────────────────────────────────
describe("Bug #9 — ConfirmDialog + useConfirm exist and are correct", () => {
  it("ConfirmDialog.tsx must exist", () => {
    const fullPath = path.join(ROOT, "src/components/ui/ConfirmDialog.tsx");
    expect(fs.existsSync(fullPath)).toBe(true);
  });

  it("useConfirm.ts must exist", () => {
    const fullPath = path.join(ROOT, "src/hooks/useConfirm.ts");
    expect(fs.existsSync(fullPath)).toBe(true);
  });

  it("useConfirm must resolve false on cancel (no pending Promise)", () => {
    const src = read("src/hooks/useConfirm.ts");
    // The onCancel handler must call resolve(false)
    expect(src).toMatch(/resolve\(\s*false\s*\)/);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 10. Auto-select visuals scans ALL sub-folders
// REGRESSION: Only scanning preferred folders missed images stored in
//             non-standard sub-folder names. -- fixed 2026-04-04
// ────────────────────────────────────────────────────────────────────────────
describe("Bug #10 — Auto-select visuals scans all sub-folders", () => {
  const filePath = "src/lib/case-studies/auto-select-visuals.ts";

  it("scans sub-folders from most recent to oldest", () => {
    const src = read(filePath);
    // Must sort by recency and scan multiple sub-folders
    expect(src).toMatch(/sortByRecent|most recent|lastModifiedDateTime/i);
    expect(src).toMatch(/for.*folder.*of.*subFolders|subFolders\.forEach/i);
  });

  it("skips supporting files, source, brief, archive folders", () => {
    const src = read(filePath);
    expect(src).toMatch(/SKIP_FOLDERS|shouldSkip|supporting files/i);
  });

  it("assigns all 3 roles: heroImage, linkedInImage, emailHeader", () => {
    const src = read(filePath);
    expect(src).toContain("heroImage:");
    expect(src).toContain("linkedInImage:");
    expect(src).toContain("emailHeader:");
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 11. Text length constraints in CaseStudyOutputSchema
// REGRESSION: Without .max() constraints, LLM outputs exceeded display
//             limits and broke card layouts. -- fixed 2026-04-04
// ────────────────────────────────────────────────────────────────────────────
describe("Bug #11 — CaseStudyOutputSchema has .max() constraints", () => {
  const filePath = "src/lib/case-studies/schemas.ts";

  const fieldsRequiringMax = ["headline", "brief", "result", "keyMetric", "outcome"];

  it.each(fieldsRequiringMax)("field '%s' must have a .max() constraint", (field) => {
    const src = read(filePath);
    // Find the field definition and check it has .max(
    // Pattern: field: z.string()...max(N)
    const fieldRegex = new RegExp(`${field}\\s*:\\s*z\\.string\\([^)]*\\)[^,}]*\\.max\\(`);
    expect(src).toMatch(fieldRegex);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 12. /work/[slug] supports heroImage fallback
// REGRESSION: Pipeline-generated case studies use heroImage (not the static
//             image field). The detail page must support both. -- fixed 2026-04-04
// ────────────────────────────────────────────────────────────────────────────
describe("Bug #12 — /work/[slug] supports heroImage", () => {
  const filePath = "src/app/work/[slug]/page.tsx";

  it("must reference heroImage for fallback image rendering", () => {
    const src = read(filePath);
    expect(src).toMatch(/heroImage/);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 13. force-dynamic on public case study pages
// REGRESSION: Without force-dynamic, ISR caching served stale pages that
//             did not show newly published case studies. -- fixed 2026-04-04
// ────────────────────────────────────────────────────────────────────────────
describe("Bug #13 — force-dynamic on public case study pages", () => {
  const pages = [
    "src/app/work/page.tsx",
    "src/app/case-studies/page.tsx",
  ];

  it.each(pages)("%s must export dynamic = 'force-dynamic'", (file) => {
    const src = read(file);
    expect(src).toMatch(/export\s+const\s+dynamic\s*=\s*["']force-dynamic["']/);
  });
});
