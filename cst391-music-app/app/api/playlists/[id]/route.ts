import { NextResponse } from "next/server";
import { auth } from "@/auth";
import * as playlistService from "@/lib/services/playlist-service";
import { isValidUuid } from "@/lib/uuid";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: playlistId } = await context.params;
    if (!isValidUuid(playlistId)) {
      return NextResponse.json({ error: "Invalid playlist id" }, { status: 400 });
    }
    const session = await auth();
    const result = await playlistService.getPlaylistDetail(session, playlistId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result.data);
  } catch (error) {
    console.error("GET /api/playlists/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to load playlist" },
      { status: 500 }
    );
  }
}
