import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import { checkHealth as checkClickUp } from "@/lib/integrations/clickup";
import { checkHealth as checkSharePoint } from "@/lib/integrations/sharepoint";
import { checkHealth as checkEvoliz } from "@/lib/integrations/evoliz";

interface IntegrationStatus {
  name: string;
  status: "connected" | "not_configured" | "error";
  error?: string;
}

export async function GET() {
  try {
    // Auth check
    const session = await getUserFromSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Run all health checks in parallel
    const [clickupResult, sharepointResult, evolizResult] = await Promise.all([
      checkClickUp().catch(
        (e: Error): { status: "error"; error: string } => ({
          status: "error",
          error: e.message,
        })
      ),
      checkSharePoint().catch(
        (e: Error): { status: "error"; error: string } => ({
          status: "error",
          error: e.message,
        })
      ),
      checkEvoliz().catch(
        (e: Error): { status: "error"; error: string } => ({
          status: "error",
          error: e.message,
        })
      ),
    ]);

    const integrations: IntegrationStatus[] = [
      {
        name: "ClickUp",
        status: clickupResult.status === "connected" ? "connected" : "error",
        ...(clickupResult.error ? { error: clickupResult.error } : {}),
      },
      {
        name: "SharePoint",
        status:
          sharepointResult.status === "connected" ? "connected" : "error",
        ...(sharepointResult.error ? { error: sharepointResult.error } : {}),
      },
      {
        name: "Evoliz",
        status: evolizResult.status as "connected" | "not_configured" | "error",
        ...(evolizResult.error ? { error: evolizResult.error } : {}),
      },
    ];

    const allConnected = integrations.every(
      (i) => i.status === "connected" || i.status === "not_configured"
    );

    return NextResponse.json({
      overall: allConnected ? "healthy" : "degraded",
      integrations,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Integration status check error:", error);
    return NextResponse.json(
      {
        overall: "error",
        integrations: [],
        checkedAt: new Date().toISOString(),
        error: "Failed to check integration status.",
      },
      { status: 500 }
    );
  }
}
