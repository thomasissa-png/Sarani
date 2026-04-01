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
];

// ─── Runner ─────────────────────────────────────────────────────────────────

async function runJob(job: CronJob): Promise<void> {
  if (job.running) return; // prevent overlap
  if (!CRON_SECRET || !BASE_URL) return;

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
    } else {
      const data = await response.json().catch(() => ({}));
      console.log(`[Cron] ${job.name} OK:`, JSON.stringify(data).slice(0, 200));
    }
  } catch (error) {
    console.error(
      `[Cron] ${job.name} error:`,
      error instanceof Error ? error.message : "Unknown"
    );
  } finally {
    job.running = false;
  }
}

// ─── Scheduler loop ─────────────────────────────────────────────────────────

let started = false;
let intervalId: ReturnType<typeof setInterval> | null = null;

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
