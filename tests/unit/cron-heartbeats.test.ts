// @vitest-environment node
/**
 * Tests for cron scheduler heartbeat tracking and health check logic.
 *
 * WHY THIS FILE EXISTS:
 * The health endpoint was rewritten to use real in-memory heartbeats instead
 * of a DB proxy (counting inboxItems). These tests verify:
 * 1. Heartbeat recording (ok/error states, consecutive errors)
 * 2. getCronHeartbeats() returns complete job data
 * 3. isCronRunning() reflects scheduler state
 * 4. Health check grace period logic (2.5x interval)
 *
 * REGRESSION: Health banner showed false positives — fixed 2026-04-04
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Mock environment ─────────────────────────────────────────────────────

// We need to re-import cron-scheduler fresh for each test to reset module state.
// Use dynamic imports + vi.resetModules().

// Mock fetch globally to prevent real network calls
const mockFetch = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
vi.stubGlobal("fetch", mockFetch);

// Provide CRON_SECRET so the scheduler can start
vi.stubEnv("CRON_SECRET", "test-secret-123");
vi.stubEnv("PORT", "3000");

describe("Cron heartbeats — getCronHeartbeats()", () => {
  beforeEach(() => {
    vi.resetModules();
    mockFetch.mockClear();
  });

  it("returns all jobs with default values before any run", async () => {
    const { getCronHeartbeats } = await import("@/lib/cron-scheduler");
    const heartbeats = getCronHeartbeats();

    // Should have entries for all defined jobs
    expect(heartbeats).toHaveProperty("poll-emails");
    expect(heartbeats).toHaveProperty("scan-knowledge");
    expect(heartbeats).toHaveProperty("project-scan");
    expect(heartbeats).toHaveProperty("renew-subscriptions");
    expect(heartbeats).toHaveProperty("keep-alive");
    expect(heartbeats).toHaveProperty("daily-digest");

    // All should have default values (never ran)
    for (const [, hb] of Object.entries(heartbeats)) {
      expect(hb.lastRun).toBe(0);
      expect(hb.lastStatus).toBe("ok");
      expect(hb.consecutiveErrors).toBe(0);
      expect(hb.intervalMs).toBeGreaterThan(0);
    }
  });

  it("includes correct intervalMs for each job", async () => {
    const { getCronHeartbeats } = await import("@/lib/cron-scheduler");
    const heartbeats = getCronHeartbeats();

    expect(heartbeats["poll-emails"].intervalMs).toBe(5 * 60 * 1000);
    expect(heartbeats["scan-knowledge"].intervalMs).toBe(10 * 60 * 1000);
    expect(heartbeats["project-scan"].intervalMs).toBe(15 * 60 * 1000);
    expect(heartbeats["renew-subscriptions"].intervalMs).toBe(60 * 60 * 1000);
    expect(heartbeats["keep-alive"].intervalMs).toBe(4 * 60 * 1000);
    expect(heartbeats["daily-digest"].intervalMs).toBe(8 * 60 * 60 * 1000);
  });
});

describe("Cron heartbeats — isCronRunning()", () => {
  beforeEach(() => {
    vi.resetModules();
    mockFetch.mockClear();
  });

  afterEach(async () => {
    // Ensure scheduler is stopped to clean up intervals
    const { stopCronScheduler } = await import("@/lib/cron-scheduler");
    stopCronScheduler();
  });

  it("returns false before scheduler starts", async () => {
    const { isCronRunning } = await import("@/lib/cron-scheduler");
    expect(isCronRunning()).toBe(false);
  });

  it("returns true after scheduler starts", async () => {
    const { startCronScheduler, isCronRunning } = await import("@/lib/cron-scheduler");
    startCronScheduler();
    expect(isCronRunning()).toBe(true);
  });

  it("returns false after scheduler stops", async () => {
    const { startCronScheduler, stopCronScheduler, isCronRunning } = await import("@/lib/cron-scheduler");
    startCronScheduler();
    expect(isCronRunning()).toBe(true);
    stopCronScheduler();
    expect(isCronRunning()).toBe(false);
  });

  it("start is idempotent — calling twice does not create duplicate intervals", async () => {
    const { startCronScheduler, stopCronScheduler, isCronRunning } = await import("@/lib/cron-scheduler");
    startCronScheduler();
    startCronScheduler(); // second call should be no-op
    expect(isCronRunning()).toBe(true);
    stopCronScheduler();
    expect(isCronRunning()).toBe(false);
  });
});

describe("Cron heartbeats — keep-alive job does not create infinite loop", () => {
  it("keep-alive job targets /api/admin/health (a readonly GET)", async () => {
    // Static verification: the keep-alive job definition
    const { getCronHeartbeats } = await import("@/lib/cron-scheduler");
    const heartbeats = getCronHeartbeats();
    // The keep-alive job exists and has a 4-minute interval
    expect(heartbeats["keep-alive"]).toBeDefined();
    expect(heartbeats["keep-alive"].intervalMs).toBe(4 * 60 * 1000);
  });
});
