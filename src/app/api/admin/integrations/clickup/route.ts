import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import { getSpaces, getListsForSpace, ClickUpApiError } from "@/lib/integrations/clickup";
import { fetchWithCache, logSync } from "@/lib/integrations/cache";
import { CACHE_TTL } from "@/lib/integrations/config";

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
    // Check if ClickUp is not configured
    if (
      error instanceof Error &&
      error.message.includes("environment variable is not set")
    ) {
      return NextResponse.json(
        {
          status: "unavailable",
          cached: false,
          error: "ClickUp integration is not configured.",
          data: null,
        },
        { status: 200 }
      );
    }

    if (error instanceof ClickUpApiError) {
      await logSync({
        source: "clickup",
        action: "fetch_spaces_with_lists",
        status: "error",
        error: error.message,
      }).catch(() => {
        // Don't let logging failure mask the original error
      });

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

    console.error("ClickUp integration error:", error);
    return NextResponse.json(
      {
        status: "unavailable",
        cached: false,
        error: "Unexpected error fetching ClickUp data.",
        data: null,
      },
      { status: 200 }
    );
  }
}
