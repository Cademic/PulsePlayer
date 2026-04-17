import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  deleteRecentSearchForUser,
  listRecentSearchesForUser,
  upsertRecentSearchForUser,
} from "@/lib/recent-search-repository";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ items: [] });
    }

    const items = await listRecentSearchesForUser(userId);
    return NextResponse.json({ items });
  } catch (error) {
    console.error("GET /api/music/recent-searches error:", error);
    return NextResponse.json(
      { error: "Failed to load recent searches" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { query?: string };
    const query = body?.query?.trim() ?? "";
    if (query.length < 2) {
      return NextResponse.json(
        { error: "Query must be at least 2 characters." },
        { status: 400 }
      );
    }

    await upsertRecentSearchForUser(userId, query);
    const items = await listRecentSearchesForUser(userId);
    return NextResponse.json({ items }, { status: 201 });
  } catch (error) {
    console.error("POST /api/music/recent-searches error:", error);
    return NextResponse.json(
      { error: "Failed to save recent search" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { query?: string };
    const query = body?.query?.trim() ?? "";
    if (!query) {
      return NextResponse.json(
        { error: "Query is required." },
        { status: 400 }
      );
    }

    await deleteRecentSearchForUser(userId, query);
    const items = await listRecentSearchesForUser(userId);
    return NextResponse.json({ items });
  } catch (error) {
    console.error("DELETE /api/music/recent-searches error:", error);
    return NextResponse.json(
      { error: "Failed to delete recent search" },
      { status: 500 }
    );
  }
}
