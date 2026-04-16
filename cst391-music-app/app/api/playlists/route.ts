import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import * as playlistService from "@/lib/services/playlist-service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await auth();
    const result = await playlistService.listMine(session);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result.data);
  } catch (error) {
    console.error("GET /api/playlists error:", error);
    return NextResponse.json(
      { error: "Failed to fetch playlists" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const body = await request.json();
    const name = body?.name as string | undefined;
    const result = await playlistService.createPlaylist(session, name ?? "");
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    console.error("POST /api/playlists error:", error);
    return NextResponse.json(
      { error: "Failed to create playlist" },
      { status: 500 }
    );
  }
}
