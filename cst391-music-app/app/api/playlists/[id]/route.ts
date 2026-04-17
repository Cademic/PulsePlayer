import { NextRequest, NextResponse } from "next/server";
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

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: playlistId } = await context.params;
    if (!isValidUuid(playlistId)) {
      return NextResponse.json({ error: "Invalid playlist id" }, { status: 400 });
    }
    const body: unknown = await request.json().catch(() => null);
    const name =
      typeof body === "object" &&
      body !== null &&
      "name" in body &&
      typeof (body as { name: unknown }).name === "string"
        ? (body as { name: string }).name
        : "";
    const session = await auth();
    const result = await playlistService.updatePlaylist(session, playlistId, name);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result.data);
  } catch (error) {
    console.error("PATCH /api/playlists/[id] error:", error);
    return NextResponse.json({ error: "Failed to update playlist" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: playlistId } = await context.params;
    if (!isValidUuid(playlistId)) {
      return NextResponse.json({ error: "Invalid playlist id" }, { status: 400 });
    }
    const session = await auth();
    const result = await playlistService.deletePlaylist(session, playlistId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/playlists/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete playlist" }, { status: 500 });
  }
}
