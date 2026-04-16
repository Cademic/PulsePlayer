import { NextResponse } from "next/server";
import { auth } from "@/auth";
import * as playlistService from "@/lib/services/playlist-service";
import { isValidUuid } from "@/lib/uuid";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: playlistId } = await context.params;

  if (!isValidUuid(playlistId)) {
    return NextResponse.json({ error: "Invalid playlist id" }, { status: 400 });
  }

  try {
    const session = await auth();
    const result = await playlistService.deletePlaylistAdmin(session, playlistId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("DELETE /api/admin/playlists/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete playlist" },
      { status: 500 }
    );
  }
}
