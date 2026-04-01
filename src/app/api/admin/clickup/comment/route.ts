import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromSession } from "@/lib/auth";
import { addTaskComment } from "@/lib/integrations/clickup";
import { checkRateLimit } from "@/lib/rate-limit";

const CommentSchema = z.object({
  taskId: z.string().min(1),
  comment: z.string().min(1).max(10000),
});

export async function POST(request: NextRequest) {
  const session = await getUserFromSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!checkRateLimit("clickup-comment", 20, 60_000)) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  let body: z.infer<typeof CommentSchema>;
  try {
    const rawBody = await request.json();
    body = CommentSchema.parse(rawBody);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    await addTaskComment(body.taskId, body.comment);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ClickUp Comment] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to post comment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
