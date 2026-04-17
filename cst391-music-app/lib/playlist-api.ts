import type {
  PlaylistDetailPayload,
  PlaylistSummary,
} from "@/lib/types";

async function parseJson<T>(res: Response): Promise<T> {
  const json: unknown = await res.json();
  return json as T;
}

async function readApiErrorMessage(res: Response): Promise<string | undefined> {
  try {
    const json: unknown = await res.json();
    if (
      typeof json === "object" &&
      json !== null &&
      "error" in json &&
      typeof (json as { error: unknown }).error === "string"
    ) {
      return (json as { error: string }).error;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export async function fetchMyPlaylists(): Promise<PlaylistSummary[]> {
  const res = await fetch("/api/playlists", { credentials: "include", cache: "no-store" });
  if (res.status === 401) {
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const msg =
      (await readApiErrorMessage(res)) ?? `Failed to load playlists (${res.status})`;
    throw new Error(msg);
  }
  return parseJson<PlaylistSummary[]>(res);
}

export async function fetchPlaylistDetail(
  id: string
): Promise<PlaylistDetailPayload> {
  const res = await fetch(`/api/playlists/${id}`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    const msg =
      (await readApiErrorMessage(res)) ?? `Failed to load playlist (${res.status})`;
    throw new Error(msg);
  }
  return parseJson<PlaylistDetailPayload>(res);
}

export async function createPlaylist(name: string): Promise<PlaylistSummary> {
  const res = await fetch("/api/playlists", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const msg =
      (await readApiErrorMessage(res)) ?? `Failed to create playlist (${res.status})`;
    throw new Error(msg);
  }
  return parseJson<PlaylistSummary>(res);
}

export async function addTrackToPlaylist(
  playlistId: string,
  trackId: number
): Promise<void> {
  const res = await fetch(`/api/playlists/${playlistId}/tracks`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trackId }),
  });
  if (!res.ok) {
    const msg =
      (await readApiErrorMessage(res)) ?? `Could not add track (${res.status})`;
    throw new Error(msg);
  }
}

export async function addRecordingToPlaylist(
  playlistId: string,
  recordingMbid: string
): Promise<void> {
  const res = await fetch(`/api/playlists/${playlistId}/tracks`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recordingMbid }),
  });
  if (!res.ok) {
    const msg =
      (await readApiErrorMessage(res)) ?? `Could not add track (${res.status})`;
    throw new Error(msg);
  }
}

export async function addAudioDbTrackToPlaylist(
  playlistId: string,
  audioDbTrackId: string
): Promise<void> {
  const res = await fetch(`/api/playlists/${playlistId}/tracks`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audioDbTrackId }),
  });
  if (!res.ok) {
    const msg =
      (await readApiErrorMessage(res)) ?? `Could not add track (${res.status})`;
    throw new Error(msg);
  }
}

export async function removeTrackFromPlaylist(
  playlistId: string,
  trackId: number
): Promise<void> {
  const res = await fetch(`/api/playlists/${playlistId}/tracks/${trackId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const msg =
      (await readApiErrorMessage(res)) ?? `Could not remove track (${res.status})`;
    throw new Error(msg);
  }
}

export async function fetchAdminPlaylists(): Promise<PlaylistSummary[]> {
  const res = await fetch("/api/admin/playlists", {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    const msg =
      (await readApiErrorMessage(res)) ??
      `Failed to load admin playlists (${res.status})`;
    throw new Error(msg);
  }
  return parseJson<PlaylistSummary[]>(res);
}

export async function deletePlaylistAdmin(playlistId: string): Promise<void> {
  const res = await fetch(`/api/admin/playlists/${playlistId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const msg = (await readApiErrorMessage(res)) ?? `Delete failed (${res.status})`;
    throw new Error(msg);
  }
}

export async function updatePlaylist(playlistId: string, name: string): Promise<PlaylistSummary> {
  const res = await fetch(`/api/playlists/${playlistId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const msg =
      (await readApiErrorMessage(res)) ?? `Could not rename playlist (${res.status})`;
    throw new Error(msg);
  }
  return parseJson<PlaylistSummary>(res);
}

export async function deletePlaylist(playlistId: string): Promise<void> {
  const res = await fetch(`/api/playlists/${playlistId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const msg =
      (await readApiErrorMessage(res)) ?? `Could not delete playlist (${res.status})`;
    throw new Error(msg);
  }
}
