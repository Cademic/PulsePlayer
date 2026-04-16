"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import type { PlaylistSummary } from "@/lib/types";
import { addTrackToPlaylist, fetchMyPlaylists } from "@/lib/playlist-api";

interface AddTrackToPlaylistButtonProps {
  trackId: number | undefined;
}

export default function AddTrackToPlaylistButton({
  trackId,
}: AddTrackToPlaylistButtonProps) {
  const { status } = useSession();
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status !== "authenticated" || trackId == null) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchMyPlaylists();
        if (!cancelled) {
          setPlaylists(list);
          if (list[0]) {
            setSelectedId(list[0].id);
          }
        }
      } catch {
        if (!cancelled) {
          setPlaylists([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, trackId]);

  if (status !== "authenticated" || trackId == null) {
    return null;
  }

  if (playlists.length === 0) {
    return (
      <span className="small text-muted ms-2" title="Create a playlist first">
        No playlists
      </span>
    );
  }

  async function handleAdd() {
    if (!selectedId || trackId == null) return;
    setLoading(true);
    setMessage(null);
    try {
      await addTrackToPlaylist(selectedId, trackId);
      setMessage("Added");
      setTimeout(() => setMessage(null), 2000);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="d-flex align-items-center gap-1 ms-2"
      onClick={(e) => e.stopPropagation()}
    >
      <select
        className="form-select form-select-sm"
        style={{ width: "auto", maxWidth: 140 }}
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        aria-label="Playlist"
      >
        {playlists.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        disabled={loading || !selectedId}
        onClick={handleAdd}
      >
        {loading ? "…" : "Add"}
      </button>
      {message ? (
        <span className="small text-muted text-nowrap">{message}</span>
      ) : null}
    </div>
  );
}
