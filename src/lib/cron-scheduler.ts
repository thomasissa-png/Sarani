// ─── Internal Cron Scheduler ────────────────────────────────────────────────
// Self-contained cron that runs inside the Next.js server process.
// No external cron service needed — starts automatically on first request.
// Each job calls its own API route internally with the CRON_SECRET.

const CRON_SECRET = process.env.CRON_SECRET;
// Use localhost for internal calls (avoids round-trip through external network)
const PORT = process.env.PORT || "3000";
const INTERNAL_URL = `http://localhost:${PORT}`;

// ─── Job definitions ────────────────────────────────────────────────────────

interface CronJob {
  name: string;
  path: string;
  intervalMs: number;
  lastRun: number;
  running: boolean;
}

const jobs: CronJob[] = [
  {
    name: "poll-emails",
    path: "/api/admin/cron/poll-emails",
    intervalMs: 5 * 60 * 1000, // every 5 minutes
    lastRun: 0,
    running: false,
  },
  {
    name: "scan-knowledge",
    path: "/api/admin/cron/scan-knowledge",
    intervalMs: 10 * 60 * 1000, // every 10 minutes
    lastRun: 0,
    running: false,
  },
  {
    name: "project-scan",
    path: "/api/admin/cron/project-scan",
    intervalMs: 15 * 60 * 1000, // every 15 minutes
    lastRun: 0,
    running: false,
  },
  {
    name: "renew-subscriptions",
    path: "/api/admin/cron/renew-subscriptions",
    intervalMs: 60 * 60 * 1000, // every 1 hour
    lastRun: 0,
    running: false,
  },
  {
    name: "tracker-cache-warm",
    path: "/api/admin/integrations/tracker",
    intervalMs: 25 * 60 * 1000, // every 25 min — keeps cache warm (TTL is 30 min)
    lastRun: 0,
    running: false,
  },
  {
    name: "keep-alive",
    path: "/api/admin/health",
    intervalMs: 4 * 60 * 1000, // every 4 minutes — prevents Replit sleep (5min idle threshold)
    lastRun: 0,
    running: false,
  },
  // deadline-alerts REMOVED — DueTodayBanner already shows due projects.
  // Thomas explicitly asked to remove these individual alerts from the inbox (regression).
  {
    name: "daily-digest",
    path: "/api/admin/cron/daily-digest",
    intervalMs: 8 * 60 * 60 * 1000, // every 8 hours (route self-deduplicates to 1/day)
    lastRun: 0,
    running: false,
  },
];

// ─── Heartbeat recorder ────────────────────────────────────────────────────

function recordHeartbeat(name: string, status: "ok" | "error"): void {
  const prev = heartbeats[name];
  heartbeats[name] = {
    lastRun: Date.now(),
    lastStatus: status,
    consecutiveErrors: status === "error" ? (prev?.consecutiveErrors ?? 0) + 1 : 0,
  };
}

// ─── Runner ─────────────────────────────────────────────────────────────────

async function runJob(job: CronJob): Promise<void> {
  if (job.running) return; // prevent overlap
  if (!CRON_SECRET || !INTERNAL_URL) return;

  const now = Date.now();
  if (now - job.lastRun < job.intervalMs) return; // not yet time

  job.running = true;
  job.lastRun = now;

  try {
    const url = `${INTERNAL_URL}${job.path}`;
    const response = await fetch(url, {
      method: "GET",
      headers: { "x-cron-secret": CRON_SECRET },
      signal: AbortSignal.timeout(55_000), // 55s timeout (under Replit's 60s)
    });

    if (!response.ok) {
      console.error(`[Cron] ${job.name} failed: ${response.status}`);
      recordHeartbeat(job.name, "error");
    } else {
      const data = await response.json().catch(() => ({}));
      console.log(`[Cron] ${job.name} OK:`, JSON.stringify(data).slice(0, 200));
      recordHeartbeat(job.name, "ok");
    }
  } catch (error) {
    console.error(
      `[Cron] ${job.name} error:`,
      error instanceof Error ? error.message : "Unknown"
    );
    recordHeartbeat(job.name, "error");
  } finally {
    job.running = false;
  }
}

// ─── Scheduler loop ─────────────────────────────────────────────────────────

let started = false;
let intervalId: ReturnType<typeof setInterval> | null = null;

// ─── Heartbeat (in-memory) ─────────────────────────────────────────────────
// Exposed to health check via getCronHeartbeats().

interface CronHeartbeat {
  lastRun: number;       // timestamp ms
  lastStatus: "ok" | "error";
  consecutiveErrors: number;
}

const heartbeats: Record<string, CronHeartbeat> = {};

/** Returns heartbeat data for all jobs. Used by /api/admin/health. */
export function getCronHeartbeats(): Record<string, CronHeartbeat & { intervalMs: number }> {
  const result: Record<string, CronHeartbeat & { intervalMs: number }> = {};
  for (const job of jobs) {
    result[job.name] = {
      lastRun: heartbeats[job.name]?.lastRun ?? 0,
      lastStatus: heartbeats[job.name]?.lastStatus ?? "ok",
      consecutiveErrors: heartbeats[job.name]?.consecutiveErrors ?? 0,
      intervalMs: job.intervalMs,
    };
  }
  return result;
}

/** Returns true if the scheduler loop is alive. */
export function isCronRunning(): boolean {
  return started;
}

export function startCronScheduler(): void {
  if (started) return;
  if (!CRON_SECRET) {
    console.warn("[Cron] CRON_SECRET not set — internal cron disabled");
    return;
  }

  started = true;
  console.log("[Cron] Internal scheduler started");
  console.log(
    `[Cron] Jobs: ${jobs.map((j) => `${j.name} (every ${j.intervalMs / 60000}min)`).join(", ")}`
  );

  // Check every 30 seconds if any job needs to run
  intervalId = setInterval(() => {
    for (const job of jobs) {
      void runJob(job);
    }
  }, 30_000);

  // Run poll-emails immediately on startup (don't wait 5min)
  setTimeout(() => void runJob(jobs[0]), 5_000);
}

export function stopCronScheduler(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  started = false;
}
