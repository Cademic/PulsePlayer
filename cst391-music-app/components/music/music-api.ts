import type {
  Album,
  AlbumCreatePayload,
  AlbumUpdatePayload,
} from "@/lib/types";

/** Ensures we never treat an error object `{ error: string }` as album data. */
export function parseAlbumsJson(json: unknown): Album[] | null {
  if (Array.isArray(json)) {
    return json as Album[];
  }
  return null;
}

export function parseSingleAlbumJson(json: unknown): Album | null {
  if (Array.isArray(json) && json.length === 1) {
    return json[0] as Album;
  }
  return null;
}

export async function fetchAlbumSingle(params: {
  id?: number;
  releaseMbid?: string;
  audioDbAlbumId?: string;
}): Promise<Album> {
  const sp = new URLSearchParams();
  if (params.id != null) {
    sp.set("id", String(params.id));
  }
  if (params.releaseMbid) {
    sp.set("releaseMbid", params.releaseMbid);
  }
  if (params.audioDbAlbumId) {
    sp.set("audioDbAlbumId", params.audioDbAlbumId);
  }
  const res = await fetch(`/api/albums?${sp.toString()}`, { cache: "no-store" });
  const json: unknown = await res.json();
  if (!res.ok) {
    throw new Error(`Failed to load album: ${res.status}`);
  }
  const album = parseSingleAlbumJson(json);
  if (!album) {
    throw new Error("Invalid album response: expected one album");
  }
  return album;
}

export async function postAlbum(
  body: AlbumCreatePayload
): Promise<{ id: number }> {
  const res = await fetch("/api/albums", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      typeof err === "object" && err && "error" in err
        ? String((err as { error: string }).error)
        : res.statusText
    );
  }
  return res.json() as Promise<{ id: number }>;
}

export async function putAlbum(
  body: AlbumUpdatePayload
): Promise<{ id: number }> {
  const res = await fetch("/api/albums", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      typeof err === "object" && err && "error" in err
        ? String((err as { error: string }).error)
        : res.statusText
    );
  }
  return res.json() as Promise<{ id: number }>;
}
