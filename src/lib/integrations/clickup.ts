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
  value?: string | number | string[] | ClickUpUserField[] | null;
}

export interface ClickUpUserField {
  id: number;
  username: string;
  email: string;
  profilePicture: string | null;
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

  while (!lastPage) {
    const result = await getTasksForList(listId, { page });
    allTasks.push(...result.tasks);
    lastPage = result.last_page;
    page++;
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
 * Set a custom field value on a task.
 * Uses the clickupFetch wrapper for retry logic.
 */
export async function setCustomFieldValue(
  taskId: string,
  fieldId: string,
  value: string | number
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
