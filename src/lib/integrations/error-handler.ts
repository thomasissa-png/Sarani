// ─── Integration Error Handler ──────────────────────────────────────────────
// M-01: Centralized error handling for integration API routes.
// Replaces duplicated try/catch patterns across all route files.

import { NextResponse } from "next/server";
import { ClickUpApiError } from "@/lib/integrations/clickup";
import { SharePointApiError } from "@/lib/integrations/sharepoint";
import { EvolizApiError } from "@/lib/integrations/evoliz";

interface ErrorResponseOptions {
  /** The integration source name for logging context */
  source: "clickup" | "sharepoint" | "evoliz" | "integration";
  /** Optional: custom message for the "unavailable" state */
  unavailableMessage?: string;
}

/**
 * Convert an integration error into the appropriate NextResponse.
 * Handles:
 * - Missing env vars (environment variable not set) -> 200 with "unavailable"
 * - API-specific errors (ClickUp, SharePoint, Evoliz) -> appropriate status
 * - Generic errors -> 500
 */
export function handleIntegrationError(
  error: unknown,
  options: ErrorResponseOptions
): NextResponse {
  const { source, unavailableMessage } = options;

  // Environment variable not configured
  if (
    error instanceof Error &&
    error.message.includes("environment variable is not set")
  ) {
    return NextResponse.json(
      {
        status: "unavailable",
        cached: false,
        error:
          unavailableMessage ??
          `${source.charAt(0).toUpperCase() + source.slice(1)} integration is not configured.`,
        data: null,
      },
      { status: 200 }
    );
  }

  // ClickUp API error
  if (error instanceof ClickUpApiError) {
    console.error(`ClickUp API error [${error.statusCode}]:`, error.message);
    return NextResponse.json(
      {
        status: "unavailable",
        cached: false,
        error: `ClickUp API error: ${error.statusCode}`,
        data: null,
      },
      { status: 200 }
    );
  }

  // SharePoint API error
  if (error instanceof SharePointApiError) {
    const isNotFound = error.statusCode === 404;
    console.error(
      `SharePoint API error [${error.statusCode}]:`,
      error.message
    );
    return NextResponse.json(
      {
        status: "unavailable",
        cached: false,
        error: isNotFound
          ? "Resource not found. Check SharePoint configuration."
          : `SharePoint API error: ${error.statusCode}`,
        data: null,
      },
      { status: isNotFound ? 404 : 200 }
    );
  }

  // Evoliz API error
  if (error instanceof EvolizApiError) {
    console.error(`Evoliz API error [${error.statusCode}]:`, error.message);
    return NextResponse.json(
      {
        status: "unavailable",
        cached: false,
        error: `Evoliz API error: ${error.statusCode}`,
        data: null,
      },
      { status: 200 }
    );
  }

  // Generic error
  console.error(`${source} error:`, error);
  return NextResponse.json(
    {
      status: "unavailable",
      cached: false,
      error: `Unexpected error in ${source} integration.`,
      data: null,
    },
    { status: 200 }
  );
}
