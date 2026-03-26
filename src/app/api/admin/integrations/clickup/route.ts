import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import { getSpaces, getListsForSpace } from "@/lib/integrations/clickup";
import { fetchWithCache, logSync } from "@/lib/integrations/cache";
import { CACHE_TTL } from "@/lib/integrations/config";
import { handleIntegrationError } from "@/lib/integrations/error-handler";

interface SpaceWithLists {
  id: string;
  name: string;
  lists: Array<{
    id: string;
    name: string;
    taskCount: number;
  }>;
}

export async function GET() {
  try {
    // Auth check
    const session = await getUserFromSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch spaces with cache
    const result = await fetchWithCache<SpaceWithLists[]>({
      cacheKey: "clickup:spaces_with_lists",
      source: "clickup",
      ttlSeconds: CACHE_TTL.clickup,
      fetcher: async () => {
        const spaces = await getSpaces();

        // Fetch lists for each space in parallel (bounded)
        const spacesWithLists: SpaceWithLists[] = await Promise.all(
          spaces.map(async (space) => {
            const lists = await getListsForSpace(space.id);
            return {
              id: space.id,
              name: space.name,
              lists: lists.map((list) => ({
                id: list.id,
                name: list.name,
                taskCount: list.task_count,
              })),
            };
          })
        );

        await logSync({
          source: "clickup",
          action: "fetch_spaces_with_lists",
          payload: { spaceCount: spaces.length },
        });

        return spacesWithLists;
      },
    });

    return NextResponse.json({
      status: result.stale ? "stale" : "live",
      cached: result.cached,
      fetchedAt: result.fetchedAt.toISOString(),
      data: result.data,
    });
  } catch (error) {
    // A-03: Log before delegating to centralized error handler
    await logSync({
      source: "clickup",
      action: "fetch_spaces_with_lists",
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    }).catch(() => {
      // Don't let logging failure mask the original error
    });

    return handleIntegrationError(error, { source: "clickup" });
  }
}
