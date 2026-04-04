// @vitest-environment node
/**
 * Tests for ClickUp folder-lists feature: getAllListsForSpace().
 *
 * WHY THIS FILE EXISTS:
 * ClickUp Spaces can contain both folderless lists AND folders with nested lists.
 * Previously only folderless lists were fetched, causing projects in folders
 * (e.g. TikTok divisions organized as Folders) to be invisible in the tracker.
 * getAllListsForSpace() now fetches both. These tests verify the merge logic
 * and error handling.
 *
 * REGRESSION: Missing ClickUp tasks for folder-organized spaces — fixed 2026-04-04
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock clickupFetch at the module level ──────────────────────────────────

const mockClickupFetch = vi.fn();

vi.mock("@/lib/integrations/clickup", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/integrations/clickup")>();
  return {
    ...original,
    // We'll test the public functions which internally call clickupFetch.
    // Instead, let's mock at the fetch level.
  };
});

// Since clickupFetch is private, we test by mocking global fetch
// and providing the required env vars.

vi.stubEnv("CLICKUP_API_KEY", "test-api-key");
vi.stubEnv("CLICKUP_WORKSPACE_ID", "test-workspace");

let fetchSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  fetchSpy = vi.spyOn(globalThis, "fetch");
});

import {
  getListsForSpace,
  getListsForFolder,
  getAllListsForSpace,
  getFoldersForSpace,
} from "@/lib/integrations/clickup";

describe("getAllListsForSpace — combines folderless + folder lists", () => {
  it("returns folderless lists when there are no folders", async () => {
    const folderlessLists = [
      { id: "list1", name: "Main List", space: { id: "s1", name: "Test" }, task_count: 5, statuses: [] },
    ];

    // Call 1: getListsForSpace → /space/s1/list
    // Call 2: getFoldersForSpace → /space/s1/folder
    fetchSpy
      .mockResolvedValueOnce(new Response(JSON.stringify({ lists: folderlessLists }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ folders: [] }), { status: 200 }));

    const result = await getAllListsForSpace("s1");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Main List");
  });

  it("returns both folderless and folder lists", async () => {
    const folderlessLists = [
      { id: "list1", name: "Folderless List", space: { id: "s1", name: "Test" }, task_count: 3, statuses: [] },
    ];
    const folders = [
      { id: "folder1", name: "TikTok France" },
    ];
    const folderLists = [
      { id: "list2", name: "France Tasks", space: { id: "s1", name: "Test" }, task_count: 10, statuses: [] },
    ];

    fetchSpy
      .mockResolvedValueOnce(new Response(JSON.stringify({ lists: folderlessLists }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ folders }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ lists: folderLists }), { status: 200 }));

    const result = await getAllListsForSpace("s1");
    expect(result).toHaveLength(2);
    expect(result.map(l => l.name)).toContain("Folderless List");
    expect(result.map(l => l.name)).toContain("France Tasks");
  });

  it("handles folder list fetch failure gracefully (Promise.allSettled)", async () => {
    const folderlessLists = [
      { id: "list1", name: "Folderless", space: { id: "s1", name: "Test" }, task_count: 1, statuses: [] },
    ];
    const folders = [
      { id: "folder1", name: "Broken Folder" },
      { id: "folder2", name: "Good Folder" },
    ];
    const goodFolderLists = [
      { id: "list3", name: "Good List", space: { id: "s1", name: "Test" }, task_count: 5, statuses: [] },
    ];

    // clickupFetch retries once on 500 with 1s delay, then on second 500 also retries.
    // For the broken folder: 2 calls (original 500 + retry 500) → rejects
    // For the good folder: 1 call → resolves
    // Order: folderless lists, folders, then folder1 + folder2 in parallel via allSettled
    fetchSpy
      .mockResolvedValueOnce(new Response(JSON.stringify({ lists: folderlessLists }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ folders }), { status: 200 }))
      // folder1: 404 (no retry for 4xx)
      .mockResolvedValueOnce(new Response("Not Found", { status: 404 }))
      // folder2 succeeds
      .mockResolvedValueOnce(new Response(JSON.stringify({ lists: goodFolderLists }), { status: 200 }));

    const result = await getAllListsForSpace("s1");
    // Should have folderless + good folder lists (broken folder is rejected but not thrown)
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.map(l => l.name)).toContain("Folderless");
  });

  it("returns no duplicates — lists are in either folderless or a folder, never both", async () => {
    const folderlessLists = [
      { id: "list1", name: "A", space: { id: "s1", name: "Test" }, task_count: 1, statuses: [] },
      { id: "list2", name: "B", space: { id: "s1", name: "Test" }, task_count: 2, statuses: [] },
    ];
    const folders = [
      { id: "folder1", name: "F1" },
    ];
    const folderLists = [
      { id: "list3", name: "C", space: { id: "s1", name: "Test" }, task_count: 3, statuses: [] },
    ];

    fetchSpy
      .mockResolvedValueOnce(new Response(JSON.stringify({ lists: folderlessLists }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ folders }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ lists: folderLists }), { status: 200 }));

    const result = await getAllListsForSpace("s1");
    const ids = result.map(l => l.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size); // No duplicates
    expect(result).toHaveLength(3);
  });
});
