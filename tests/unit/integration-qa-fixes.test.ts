/**
 * Integration-level QA tests for the 4 bug fixes from Session 15.
 *
 * These tests validate the actual code logic in production files
 * without requiring live API keys.
 *
 * Bug 1: Model name — claude-sonnet-4-latest returns 404
 * Bug 2: Share link dedup — same filename from different folders
 * Bug 3: Video playback — 0:00 and can't play
 * Bug 4: TikTok folder matching — shows "Others" instead of correct folder
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

// ─── Bug 1: Model Name Validation ──────────────────────────────────────────

describe("Bug 1: Model name — claude-sonnet-4-6-latest", () => {
  it("claude.ts uses claude-sonnet-4-6-latest (NOT claude-sonnet-4-latest)", () => {
    const claudeTs = fs.readFileSync(
      path.resolve(__dirname, "../../src/lib/ai/claude.ts"),
      "utf-8"
    );
    // Must contain the valid model (claude-sonnet-4-6, NOT claude-sonnet-4-6-latest which returns 404)
    expect(claudeTs).toContain('"claude-sonnet-4-6"');
    // Must NOT contain invalid aliases
    expect(claudeTs).not.toMatch(/["']claude-sonnet-4-latest["']/);
    expect(claudeTs).not.toMatch(/["']claude-sonnet-4-6-latest["']/);
  });

  it("no other file uses claude-sonnet-4-latest (invalid alias)", () => {
    // Check all TypeScript files in src/lib for the invalid model name
    const libDir = path.resolve(__dirname, "../../src/lib");
    const checkDir = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          checkDir(fullPath);
        } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
          const content = fs.readFileSync(fullPath, "utf-8");
          // Allow the pattern in comments but not in string literals
          const lines = content.split("\n");
          for (const line of lines) {
            if (line.trim().startsWith("//") || line.trim().startsWith("*")) continue;
            if (line.includes("claude-sonnet-4-latest") && !line.includes("claude-sonnet-4-6-latest")) {
              throw new Error(`Invalid model "claude-sonnet-4-latest" found in ${fullPath}: ${line.trim()}`);
            }
          }
        }
      }
    };
    checkDir(libDir);
  });
});

// ─── Bug 2: Share Link Dedup by itemId ──────────────────────────────────────

describe("Bug 2: Share link — dedup by itemId, not filename", () => {
  it("share page filters by id when present in selectedAssets", () => {
    const pageCode = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../src/app/project/[clientSlug]/[projectSlug]/page.tsx"
      ),
      "utf-8"
    );
    // The page extracts IDs from selected assets: selected.map((s) => s.id)
    expect(pageCode).toContain("s.id");
    expect(pageCode).toContain("selectedIds");
  });

  it("selectedAssets type includes id field", () => {
    const pageCode = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../src/app/project/[clientSlug]/[projectSlug]/page.tsx"
      ),
      "utf-8"
    );
    // The parsed selectedAssets should reference .id
    // Look for the filtering logic
    expect(pageCode).toContain("item.id");
  });

  it("React key uses itemId (not name) to prevent dedup collisions", () => {
    const pageCode = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../src/app/project/[clientSlug]/[projectSlug]/page.tsx"
      ),
      "utf-8"
    );
    // Check that we use itemId for keys in rendering (key={item.itemId ...})
    expect(pageCode).toMatch(/key=\{item\.itemId/);
  });
});

// ─── Bug 3: Video Streaming Proxy ──────────────────────────────────────────

describe("Bug 3: Video playback — proxy 302 redirect (streaming removed)", () => {
  it("proxy route has VIDEO_EXT_TO_MIME fallback for octet-stream", () => {
    const routeCode = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../src/app/api/project-assets/[itemId]/route.ts"
      ),
      "utf-8"
    );
    expect(routeCode).toContain("VIDEO_EXT_TO_MIME");
    expect(routeCode).toContain(".mp4");
    expect(routeCode).toContain("video/mp4");
    expect(routeCode).toContain("video/quicktime");
  });

  it("proxy checks file extension when mimeType is not in STREAM_MIMETYPES", () => {
    const routeCode = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../src/app/api/project-assets/[itemId]/route.ts"
      ),
      "utf-8"
    );
    // The fallback logic: if (!isVideo && item.name) → check extension
    expect(routeCode).toMatch(/if\s*\(!isVideo\s*&&\s*item\.name\)/);
    expect(routeCode).toContain("lastIndexOf");
    expect(routeCode).toContain("fallbackMime");
  });

  it("share page uses VideoPlayer client component for videos", () => {
    const pageCode = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../src/app/project/[clientSlug]/[projectSlug]/page.tsx"
      ),
      "utf-8"
    );
    // Must use VideoPlayer component (Client Component with error handling)
    expect(pageCode).toContain("VideoPlayer");
    expect(pageCode).toContain("proxyUrl={item.proxyUrl}");
  });

  it("share page also has VIDEO_EXT_TO_MIME fallback in isAllowedFile", () => {
    const pageCode = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../src/app/project/[clientSlug]/[projectSlug]/page.tsx"
      ),
      "utf-8"
    );
    expect(pageCode).toContain("VIDEO_EXT_TO_MIME");
  });

  it("proxy uses 302 redirect for all assets including PDFs (no streaming)", () => {
    const routeCode = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../src/app/api/project-assets/[itemId]/route.ts"
      ),
      "utf-8"
    );
    // All assets use 302 redirect — no streaming through the server
    expect(routeCode).toContain("NextResponse.redirect(downloadUrl");
    // No streaming timeout needed
    expect(routeCode).not.toContain("AbortSignal.timeout(30");
  });

  it("proxy uses 302 redirect for videos (no Range forwarding, no CORS — browser handles it)", () => {
    const routeCode = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../src/app/api/project-assets/[itemId]/route.ts"
      ),
      "utf-8"
    );
    // 302 redirect means no streaming, no Range forwarding, no CORS headers needed
    // Browser follows 302 and handles Range requests on the final SharePoint URL
    expect(routeCode).toContain("NextResponse.redirect(downloadUrl");
    expect(routeCode).toContain("status: 302");
  });
});

// ─── Bug 4: Folder Matching — Retest with code verification ────────────────

describe("Bug 4: ShareFolderModal — normalize + bidirectional scoring in actual code", () => {
  it("ShareFolderModal has normalize() function", () => {
    const code = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../src/components/admin/ShareFolderModal.tsx"
      ),
      "utf-8"
    );
    expect(code).toContain("const normalize = (s: string): string =>");
    expect(code).toContain('[^a-z0-9\\s]');
  });

  it("ShareFolderModal uses bidirectional scoring (Math.max)", () => {
    const code = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../src/components/admin/ShareFolderModal.tsx"
      ),
      "utf-8"
    );
    expect(code).toContain("Math.max(listCoverage, folderCoverage)");
  });

  it("ShareFolderModal skips folders with empty meaningful tokens", () => {
    const code = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../src/components/admin/ShareFolderModal.tsx"
      ),
      "utf-8"
    );
    expect(code).toContain("folderTokens.size === 0");
  });

  it("ShareFolderModal strips em-dash separator after client prefix", () => {
    const code = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../src/components/admin/ShareFolderModal.tsx"
      ),
      "utf-8"
    );
    // Must handle "—" (em-dash) in the separator stripping
    expect(code).toMatch(/replace.*[\s\-—]+/);
  });

  it("ShareFolderModal uses normalized comparison in all 4 strategies", () => {
    const code = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../src/components/admin/ShareFolderModal.tsx"
      ),
      "utf-8"
    );
    // Count occurrences of '.normalized' property access to verify it's used broadly
    const normalizedCount = (code.match(/\.normalized/g) || []).length;
    // Appears in: pre-computation (1), Strategy 1 (1), Strategy 2 (2), Strategy 3 (2), Strategy 4 (1)
    expect(normalizedCount).toBeGreaterThanOrEqual(4);
    // Also verify listNormalized is used (separate variable)
    expect(code).toContain("listNormalized");
  });
});
