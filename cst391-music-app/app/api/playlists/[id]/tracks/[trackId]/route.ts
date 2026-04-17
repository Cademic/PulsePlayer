import { NextResponse } from "next/server";
import { auth } from "@/auth";
import * as playlistService from "@/lib/services/playlist-service";
import { isValidUuid } from "@/lib/uuid";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; trackId: string }> }
) {
  const { id: playlistId, trackId: trackIdParam } = await context.params;

  if (!isValidUuid(playlistId)) {
    return NextResponse.json({ error: "Invalid playlist id" }, { status: 400 });
  }

  const trackId = parseInt(trackIdParam, 10);
  if (Number.isNaN(trackId)) {
    return NextResponse.json({ error: "Invalid trackId" }, { status: 400 });
  }

  try {
    const session = await auth();
    const result = await playlistService.removeTrackFromPlaylist(
      session,
      playlistId,
      trackId
    );
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("DELETE /api/playlists/[id]/tracks/[trackId] error:", err);
    return NextResponse.json(
      { error: "Failed to remove track from playlist" },
      { status: 500 }
    );
  }
}
