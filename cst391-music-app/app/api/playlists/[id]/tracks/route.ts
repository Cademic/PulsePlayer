import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { upsertTrackFromAudioDb } from "@/lib/theaudiodb-sync";
import * as playlistService from "@/lib/services/playlist-service";
import { isValidUuid } from "@/lib/uuid";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: playlistId } = await context.params;

  if (!isValidUuid(playlistId)) {
    return NextResponse.json({ error: "Invalid playlist id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const recordingMbidRaw = (body as { recordingMbid?: unknown }).recordingMbid;
  const audioDbTrackIdRaw = (body as { audioDbTrackId?: unknown }).audioDbTrackId;
  const trackIdRaw = (body as { trackId?: unknown }).trackId;

  let trackId: number;
  if (typeof audioDbTrackIdRaw === "string" && audioDbTrackIdRaw.trim() !== "") {
    try {
      trackId = await upsertTrackFromAudioDb(audioDbTrackIdRaw.trim());
    } catch (e) {
      console.error("POST playlist tracks — AudioDB upsert:", e);
      return NextResponse.json(
        { error: "Could not import track from TheAudioDB" },
        { status: 502 }
      );
    }
  } else if (typeof recordingMbidRaw === "string" && recordingMbidRaw.trim() !== "") {
    try {
      trackId = await upsertTrackFromAudioDb(recordingMbidRaw.trim());
    } catch (e) {
      console.error("POST playlist tracks — AudioDB upsert:", e);
      return NextResponse.json(
        { error: "Could not import track from TheAudioDB" },
        { status: 502 }
      );
    }
  } else if (
    trackIdRaw != null &&
    typeof trackIdRaw === "number" &&
    Number.isInteger(trackIdRaw)
  ) {
    trackId = trackIdRaw;
  } else {
    return NextResponse.json(
      {
        error:
          "Missing or invalid body: provide trackId (integer) or audioDbTrackId (string)",
      },
      { status: 400 }
    );
  }

  try {
    const session = await auth();
    const result = await playlistService.addTrackToPlaylist(
      session,
      playlistId,
      trackId
    );
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result.data, { status: 201 });
  } catch (err) {
    console.error("POST /api/playlists/[id]/tracks error:", err);
    return NextResponse.json(
      { error: "Failed to add track to playlist" },
      { status: 500 }
    );
  }
}
