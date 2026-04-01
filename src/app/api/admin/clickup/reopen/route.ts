import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromSession } from "@/lib/auth";
import { updateTaskStatus } from "@/lib/integrations/clickup";
import { checkRateLimit } from "@/lib/rate-limit";

const ReopenSchema = z.object({
  taskId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const session = await getUserFromSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!checkRateLimit("clickup-reopen", 20, 60_000)) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  let body: z.infer<typeof ReopenSchema>;
  try {
    const rawBody = await request.json();
    body = ReopenSchema.parse(rawBody);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    await updateTaskStatus(body.taskId, "Open");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ClickUp Reopen] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to reopen task";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
