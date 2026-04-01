// Next.js Instrumentation — runs once when the server starts.
// Used to start the internal cron scheduler.

export async function register() {
  // Only run on the server (not during build or edge runtime)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startCronScheduler } = await import("@/lib/cron-scheduler");
    startCronScheduler();
  }
}
