// ─── ClickUp API v2 Client ──────────────────────────────────────────────────
// Server-side only. Uses personal API key authentication.
// Docs: https://clickup.com/api/

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ClickUpSpace {
  id: string;
  name: string;
  private: boolean;
  statuses: ClickUpStatus[];
}

export interface ClickUpStatus {
  id: string;
  status: string;
  type: string;
  color: string;
  orderindex: number;
}

export interface ClickUpList {
  id: string;
  name: string;
  space: { id: string; name: string };
  task_count: number;
  statuses: ClickUpStatus[];
}

export interface ClickUpCustomField {
  id: string;
  name: string;
  type: string;
  // ClickUp URL fields can return { url: "..." } objects — allow Record<string, unknown>
  value?: string | number | string[] | ClickUpUserField[] | Record<string, unknown> | null;
}

export interface ClickUpUserField {
  id: number;
  username: string;
  email: string;
  profilePicture: string | null;
}

export interface ClickUpTag {
  name: string;
  tag_fg: string;
  tag_bg: string;
}

export interface ClickUpTask {
  id: string;
  name: string;
  description: string | null;
  status: ClickUpStatus;
  date_created: string;
  date_updated: string;
  date_closed: string | null;
  due_date: string | null;
  start_date: string | null;
  assignees: ClickUpAssignee[];
  custom_fields: ClickUpCustomField[];
  tags?: ClickUpTag[];
  url: string;
  list: { id: string; name: string };
  space: { id: string };
  subtasks?: ClickUpTask[];
}

export interface ClickUpAssignee {
  id: number;
  username: string;
  email: string;
  profilePicture: string | null;
}

export interface ClickUpCreateTaskData {
  name: string;
  description?: string;
  assignees?: number[];
  status?: string;
  due_date?: number; // unix ms
  custom_fields?: Array<{ id: string; value: string | number }>;
}

// ─── Error types ────────────────────────────────────────────────────────────

export class ClickUpApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly response: unknown
  ) {
    super(message);
    this.name = "ClickUpApiError";
  }
}

// ─── Configuration ──────────────────────────────────────────────────────────

function getApiKey(): string {
  const key = process.env.CLICKUP_API_KEY;
  if (!key) throw new Error("CLICKUP_API_KEY environment variable is not set");
  return key;
}

function getWorkspaceId(): string {
  const id = process.env.CLICKUP_WORKSPACE_ID;
  if (!id)
    throw new Error("CLICKUP_WORKSPACE_ID environment variable is not set");
  return id;
}

const CLICKUP_BASE_URL = "https://api.clickup.com/api/v2";
const RETRY_DELAY_MS = 1000;

// ─── Internal fetch with retry ──────────────────────────────────────────────

async function clickupFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const apiKey = getApiKey();
  const url = `${CLICKUP_BASE_URL}${path}`;

  const headers: Record<string, string> = {
    Authorization: apiKey,
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  const fetchWithRetry = async (attempt: number): Promise<T> => {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Rate limit — retry once after delay
    if (response.status === 429 && attempt === 0) {
      const retryAfter = response.headers.get("retry-after");
      const delayMs = retryAfter
        ? parseInt(retryAfter, 10) * 1000
        : RETRY_DELAY_MS;
      await sleep(delayMs);
      return fetchWithRetry(1);
    }

    if (!response.ok) {
      // Retry once on server errors
      if (response.status >= 500 && attempt === 0) {
        await sleep(RETRY_DELAY_MS);
        return fetchWithRetry(1);
      }

      let body: unknown;
      try {
        body = await response.json();
      } catch {
        body = await response.text().catch(() => null);
      }

      throw new ClickUpApiError(
        `ClickUp API error: ${response.status} ${response.statusText} on ${path}`,
        response.status,
        body
      );
    }

    return response.json() as Promise<T>;
  };

  return fetchWithRetry(0);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Public API Functions ───────────────────────────────────────────────────

/**
 * Fetch all Spaces in the workspace.
 * Each Space corresponds to a client (see Addendum A.1).
 */
export async function getSpaces(): Promise<ClickUpSpace[]> {
  const workspaceId = getWorkspaceId();
  const data = await clickupFetch<{ spaces: ClickUpSpace[] }>(
    `/team/${workspaceId}/space?archived=false`
  );
  return data.spaces;
}

/**
 * Fetch Folders within a Space.
 * Folders represent entities/subsidiaries (e.g., "Sony France", "Sony Music UK").
 */
export async function getFoldersForSpace(spaceId: string): Promise<Array<{ id: string; name: string }>> {
  try {
    const data = await clickupFetch<{ folders: Array<{ id: string; name: string }> }>(
      `/space/${spaceId}/folder?archived=false`
    );
    return data.folders;
  } catch {
    // Some spaces may not have folders — return empty
    return [];
  }
}

/**
 * Fetch all folderless Lists for a given Space.
 * Lists represent divisions/regions within a client Space.
 */
export async function getListsForSpace(spaceId: string): Promise<ClickUpList[]> {
  const data = await clickupFetch<{ lists: ClickUpList[] }>(
    `/space/${spaceId}/list?archived=false`
  );
  return data.lists;
}

/**
 * Fetch tasks for a given List, with pagination.
 * Returns up to 100 tasks per page (ClickUp limit).
 * Set `page` to fetch subsequent pages (0-indexed).
 */
export async function getTasksForList(
  listId: string,
  options?: { page?: number; includeSubtasks?: boolean }
): Promise<{ tasks: ClickUpTask[]; last_page: boolean }> {
  const page = options?.page ?? 0;
  const subtasks = options?.includeSubtasks ? "true" : "false";
  const data = await clickupFetch<{
    tasks: ClickUpTask[];
    last_page: boolean;
  }>(
    `/list/${listId}/task?page=${page}&subtasks=${subtasks}&include_closed=true`
  );
  return data;
}

/**
 * Fetch all tasks for a list, handling pagination automatically.
 * Use with caution on large lists — respects ClickUp rate limits via retry.
 */
export async function getAllTasksForList(
  listId: string
): Promise<ClickUpTask[]> {
  const allTasks: ClickUpTask[] = [];
  let page = 0;
  let lastPage = false;
  const MAX_PAGES = 50;

  while (!lastPage) {
    const result = await getTasksForList(listId, { page });
    allTasks.push(...result.tasks);
    lastPage = result.last_page;
    page++;

    // R-02: Safety limit to prevent unbounded pagination on misconfigured lists
    if (page >= MAX_PAGES && !lastPage) {
      console.warn(
        `[ClickUp] getAllTasksForList hit ${MAX_PAGES}-page safety limit for list ${listId}. ` +
        `${allTasks.length} tasks fetched so far. Remaining tasks will be truncated.`
      );
      break;
    }
  }

  return allTasks;
}

/**
 * Fetch a single task by ID.
 */
export async function getTask(taskId: string): Promise<ClickUpTask> {
  return clickupFetch<ClickUpTask>(
    `/task/${taskId}?include_subtasks=true`
  );
}

/**
 * Create a new task in a List.
 */
export async function createTask(
  listId: string,
  data: ClickUpCreateTaskData
): Promise<ClickUpTask> {
  return clickupFetch<ClickUpTask>(`/list/${listId}/task`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Update a task's status.
 */
export async function updateTaskStatus(
  taskId: string,
  status: string
): Promise<ClickUpTask> {
  return clickupFetch<ClickUpTask>(`/task/${taskId}`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}

/**
 * Post a comment on a task.
 * Uses plain text format (comment_text).
 */
export interface ClickUpComment {
  id: string;
  comment_text: string;
  date: string; // unix ms timestamp
  user: { id: number; username: string; email: string };
}

/**
 * Get comments on a ClickUp task, ordered by date DESC (newest first).
 */
export async function getTaskComments(
  taskId: string
): Promise<ClickUpComment[]> {
  const data = await clickupFetch<{ comments: ClickUpComment[] }>(
    `/task/${taskId}/comment`
  );
  return (data.comments ?? []).sort(
    (a, b) => parseInt(b.date) - parseInt(a.date)
  );
}

export async function addTaskComment(
  taskId: string,
  commentText: string
): Promise<void> {
  await clickupFetch<Record<string, unknown>>(`/task/${taskId}/comment`, {
    method: "POST",
    body: JSON.stringify({ comment_text: commentText }),
  });
}

/**
 * Extract a custom field value from a task by field name.
 * Returns the raw value or null if the field is not found / has no value.
 */
export function getCustomFieldValue(
  task: ClickUpTask,
  fieldName: string
): string | null {
  const field = task.custom_fields.find(
    (f) => f.name.toLowerCase() === fieldName.toLowerCase()
  );
  if (!field || field.value === null || field.value === undefined) return null;

  // URL and short_text fields return string values directly
  if (typeof field.value === "string") return field.value;

  // Users fields return an array of user objects
  // Q-03: Verify first element has `username` before casting
  if (Array.isArray(field.value)) {
    if (
      field.value.length > 0 &&
      typeof field.value[0] === "object" &&
      field.value[0] !== null &&
      "username" in field.value[0]
    ) {
      const users = field.value as ClickUpUserField[];
      return users.map((u) => u.username).join(", ");
    }
    // string[] or unknown array — join as strings
    return field.value.map(String).join(", ");
  }

  return String(field.value);
}

/**
 * Extract a SharePoint URL from a ClickUp task's custom fields.
 * Searches all fields for URLs containing sharepoint.com or 1drv.ms.
 * Also checks fields named "sharepoint" (case-insensitive) for any URL value.
 */
export function extractSharePointUrlFromTask(task: ClickUpTask): string | null {
  if (!task.custom_fields) return null;

  for (const field of task.custom_fields) {
    if (!field.value) continue;

    // String value — check if it's a SharePoint URL
    if (typeof field.value === "string") {
      const val = field.value.trim();
      if (val.includes("sharepoint.com") || val.includes("1drv.ms")) return val;
      continue;
    }

    // Object value — ClickUp URL fields return { url: "..." }
    if (typeof field.value === "object" && !Array.isArray(field.value) && field.value !== null) {
      const obj = field.value as Record<string, unknown>;
      for (const key of ["url", "value", "link", "href"]) {
        const nested = obj[key];
        if (typeof nested === "string") {
          const val = nested.trim();
          if (val.includes("sharepoint.com") || val.includes("1drv.ms")) return val;
        }
      }
    }

    // Stringify as last resort
    const str = JSON.stringify(field.value);
    if (str.includes("sharepoint.com") || str.includes("1drv.ms")) {
      const urlMatch = str.match(/(https?:\/\/[^\s"',}]+(?:sharepoint\.com|1drv\.ms)[^\s"',}]*)/i);
      if (urlMatch) return urlMatch[1];
    }
  }

  // Phase 2: Check fields named "sharepoint" for any URL-like value
  const SP_FIELD_RE = /sharepoint|sp[\s_-]?link|sp[\s_-]?folder|sp[\s_-]?url/i;
  for (const field of task.custom_fields) {
    if (!field.value || !field.name || !SP_FIELD_RE.test(field.name)) continue;

    if (typeof field.value === "string" && field.value.trim().startsWith("http")) {
      return field.value.trim();
    }
    if (typeof field.value === "object" && !Array.isArray(field.value) && field.value !== null) {
      const obj = field.value as Record<string, unknown>;
      for (const key of ["url", "value", "link", "href"]) {
        if (typeof obj[key] === "string" && (obj[key] as string).startsWith("http")) {
          return (obj[key] as string).trim();
        }
      }
    }
  }

  return null;
}

/**
 * Set a custom field value on a task.
 * Uses the clickupFetch wrapper for retry logic.
 */
export async function setCustomFieldValue(
  taskId: string,
  fieldId: string,
  value: string | number | Record<string, unknown>
): Promise<void> {
  await clickupFetch<Record<string, unknown>>(
    `/task/${taskId}/field/${fieldId}`,
    {
      method: "POST",
      body: JSON.stringify({ value }),
    }
  );
}

/**
 * Score how well a query matches a task name using word-level overlap.
 * Returns a value between 0 and 1 (proportion of query words matched).
 */
export function matchScore(query: string, taskName: string): number {
  const queryWords = query.toLowerCase().split(/[\s\-\/,]+/).filter((w) => w.length > 2);
  const nameWords = taskName.toLowerCase().split(/[\s\-\/,]+/).filter((w) => w.length > 2);
  if (queryWords.length === 0) return 0;
  const matched = queryWords.filter((qw) =>
    nameWords.some((nw) => nw.includes(qw) || qw.includes(nw))
  );
  return matched.length / queryWords.length;
}

/**
 * Search tasks by name in the workspace. Returns the best matching task or null.
 * Uses a two-tier strategy:
 *   1. Exact substring match (bidirectional includes) — instant return on first hit
 *   2. Word-level scoring across all pages — returns the best score >= 0.6
 * Graceful degradation: returns null if ClickUp is not configured or API fails.
 */
export async function searchTaskByName(
  query: string
): Promise<{ taskId: string; taskUrl: string; taskName: string } | null> {
  const apiKey = process.env.CLICKUP_API_KEY;
  const teamId = process.env.CLICKUP_WORKSPACE_ID;
  if (!apiKey || !teamId) return null;

  try {
    const queryLower = query.toLowerCase();
    const maxPages = 5; // Cap to avoid excessive API calls
    const MATCH_THRESHOLD = 0.6;

    let bestCandidate: { taskId: string; taskUrl: string; taskName: string; score: number } | null = null;

    for (let page = 0; page < maxPages; page++) {
      const searchUrl = `https://api.clickup.com/api/v2/team/${teamId}/task?page=${page}&include_closed=false&custom_task_ids=false&subtasks=false`;
      const res = await fetch(searchUrl, {
        method: "GET",
        headers: { Authorization: apiKey, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(5_000),
      });

      if (!res.ok) {
        console.warn(`[ClickUp Search] API returned ${res.status} on page ${page}`);
        return bestCandidate;
      }

      const data = (await res.json()) as {
        tasks: Array<{ id: string; name: string; url: string }>;
      };

      // No more tasks — stop pagination
      if (data.tasks.length === 0) break;

      for (const task of data.tasks) {
        const nameLower = task.name.toLowerCase();

        // Tier 1: exact substring match (bidirectional) — immediate return
        if (nameLower.includes(queryLower) || queryLower.includes(nameLower)) {
          return { taskId: task.id, taskUrl: task.url, taskName: task.name };
        }

        // Tier 2: word-level scoring — collect best candidate
        const score = matchScore(query, task.name);
        if (score >= MATCH_THRESHOLD && (!bestCandidate || score > bestCandidate.score)) {
          bestCandidate = { taskId: task.id, taskUrl: task.url, taskName: task.name, score };
        }
      }
    }

    if (bestCandidate) {
      console.log(
        `[ClickUp Search] Best word match: "${bestCandidate.taskName}" (score: ${bestCandidate.score.toFixed(2)}) for query: "${query}"`
      );
      return { taskId: bestCandidate.taskId, taskUrl: bestCandidate.taskUrl, taskName: bestCandidate.taskName };
    }

    return null;
  } catch (error) {
    console.warn("[ClickUp Search] Error:", error);
    return null;
  }
}

/**
 * Search tasks by name, returning up to `maxResults` matches (best first).
 * Used by the manual mapping UI to let the PM pick from multiple candidates.
 */
export async function searchTasksByName(
  query: string,
  maxResults = 5
): Promise<Array<{ taskId: string; taskUrl: string; taskName: string }>> {
  const apiKey = process.env.CLICKUP_API_KEY;
  const teamId = process.env.CLICKUP_WORKSPACE_ID;
  if (!apiKey || !teamId) return [];

  try {
    const queryLower = query.toLowerCase();
    const maxPages = 5;
    const MATCH_THRESHOLD = 0.4; // Lower threshold for multi-result — show more options

    const exactMatches: Array<{ taskId: string; taskUrl: string; taskName: string }> = [];
    const scoredCandidates: Array<{ taskId: string; taskUrl: string; taskName: string; score: number }> = [];

    for (let page = 0; page < maxPages; page++) {
      const searchUrl = `https://api.clickup.com/api/v2/team/${teamId}/task?page=${page}&include_closed=false&custom_task_ids=false&subtasks=false`;
      const res = await fetch(searchUrl, {
        method: "GET",
        headers: { Authorization: apiKey, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(5_000),
      });

      if (!res.ok) break;

      const data = (await res.json()) as {
        tasks: Array<{ id: string; name: string; url: string }>;
      };

      if (data.tasks.length === 0) break;

      for (const task of data.tasks) {
        const nameLower = task.name.toLowerCase();

        if (nameLower.includes(queryLower) || queryLower.includes(nameLower)) {
          exactMatches.push({ taskId: task.id, taskUrl: task.url, taskName: task.name });
          if (exactMatches.length >= maxResults) break;
        } else {
          const score = matchScore(query, task.name);
          if (score >= MATCH_THRESHOLD) {
            scoredCandidates.push({ taskId: task.id, taskUrl: task.url, taskName: task.name, score });
          }
        }
      }

      if (exactMatches.length >= maxResults) break;
    }

    // Combine: exact matches first, then scored candidates sorted by score desc
    scoredCandidates.sort((a, b) => b.score - a.score);
    const combined = [
      ...exactMatches,
      ...scoredCandidates.map(({ taskId, taskUrl, taskName }) => ({ taskId, taskUrl, taskName })),
    ];

    // Deduplicate by taskId
    const seen = new Set<string>();
    const unique: Array<{ taskId: string; taskUrl: string; taskName: string }> = [];
    for (const item of combined) {
      if (!seen.has(item.taskId)) {
        seen.add(item.taskId);
        unique.push(item);
      }
      if (unique.length >= maxResults) break;
    }

    return unique;
  } catch (error) {
    console.warn("[ClickUp Search Multi] Error:", error);
    return [];
  }
}

/**
 * Check if the ClickUp API is reachable and credentials are valid.
 * Returns "not_configured" if env vars are missing (not an error -- expected state).
 */
export async function checkHealth(): Promise<{
  status: "connected" | "not_configured" | "error";
  error?: string;
}> {
  // Check if env vars are present before attempting connection
  const apiKey = process.env.CLICKUP_API_KEY;
  const workspaceId = process.env.CLICKUP_WORKSPACE_ID;

  if (!apiKey || !workspaceId) {
    return {
      status: "not_configured",
      error: "ClickUp credentials not set. ClickUp integration is disabled.",
    };
  }

  try {
    await getSpaces();
    return { status: "connected" };
  } catch (e) {
    return {
      status: "error",
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}
