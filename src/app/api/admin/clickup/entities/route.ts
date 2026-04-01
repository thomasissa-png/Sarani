import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromSession } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { getFoldersForSpace, getListsForSpace } from "@/lib/integrations/clickup";

const QuerySchema = z.object({
  spaceId: z.string().min(1),
});

/**
 * GET /api/admin/clickup/entities?spaceId=XXX
 * Returns folders + lists within a ClickUp Space = entity/subsidiary options.
 * Used by the entity dropdown in CreateBriefModal.
 */
export async function GET(request: NextRequest) {
  const session = await getUserFromSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!checkRateLimit("clickup-entities", 30, 60_000)) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const spaceId = request.nextUrl.searchParams.get("spaceId");
  const parsed = QuerySchema.safeParse({ spaceId });
  if (!parsed.success) {
    return NextResponse.json({ error: "spaceId is required" }, { status: 400 });
  }

  try {
    // Fetch both folders and folderless lists — either can represent entities
    const [folders, lists] = await Promise.all([
      getFoldersForSpace(parsed.data.spaceId),
      getListsForSpace(parsed.data.spaceId),
    ]);

    const entities = [
      ...folders.map((f) => ({ id: f.id, name: f.name, type: "folder" as const })),
      ...lists.map((l) => ({ id: l.id, name: l.name, type: "list" as const })),
    ].sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ entities });
  } catch (error) {
    console.warn("[ClickUp Entities] Error:", error);
    return NextResponse.json({ entities: [] });
  }
}
