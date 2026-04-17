import { NextResponse } from "next/server";
import { auth } from "@/auth";
import * as playlistService from "@/lib/services/playlist-service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await auth();
    const result = await playlistService.listAllAdmin(session);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result.data);
  } catch (error) {
    console.error("GET /api/admin/playlists error:", error);
    return NextResponse.json(
      { error: "Failed to fetch playlists" },
      { status: 500 }
    );
  }
}
