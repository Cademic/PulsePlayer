"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { PlaylistDetailPayload } from "@/lib/types";
import {
  fetchPlaylistDetail,
  removeTrackFromPlaylist,
} from "@/lib/playlist-api";

export default function PlaylistDetailPage() {
  const params = useParams();
  const { status } = useSession();
  const rawId = params.id;
  const id = typeof rawId === "string" ? rawId : "";

  const [data, setData] = useState<PlaylistDetailPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const tracks = data?.tracks ?? [];
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredTracks = useMemo(
    () =>
      tracks.filter((track) => {
        const haystack = `${track.title} ${track.artist} ${track.albumTitle}`.toLowerCase();
        return haystack.includes(normalizedSearch);
      }),
    [tracks, normalizedSearch]
  );

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchPlaylistDetail(id);
      setData(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load playlist");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (status === "authenticated" && id) {
      void load();
    }
  }, [status, id, load]);

  async function handleRemove(trackId: number) {
    if (!id) return;
    setRemovingId(trackId);
    setError(null);
    try {
      await removeTrackFromPlaylist(id, trackId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Remove failed");
    } finally {
      setRemovingId(null);
    }
  }

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="wf-route-page">
        <div className="container p-4 wf-page-shell">
          <p className="wf-loading-dots">Loading</p>
        </div>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="wf-route-page">
        <div className="container p-4 wf-page-shell">
          <p className="wf-loading-dots">Loading playlist</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="wf-route-page">
        <div className="container p-4 wf-page-shell">
          <div className="wf-route-card p-3">
            <div className="alert alert-danger">{error}</div>
            <Link href="/library">← Back to playlists</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { playlist } = data;

  return (
    <div className="wf-route-page">
      <div className="container p-4 wf-page-shell">
        <div className="wf-route-hero d-flex justify-content-between align-items-start flex-wrap gap-2">
          <div>
            <h1 className="h3 mb-1">{playlist.name}</h1>
            <p className="small mb-0">
              {playlist.trackCount} track{playlist.trackCount === 1 ? "" : "s"}
            </p>
          </div>
          <div className="d-flex gap-2">
            <Link className="btn btn-light btn-sm wf-route-btn" href="/">
              Browse albums
            </Link>
            <Link className="btn btn-outline-light btn-sm wf-route-btn" href="/library">
              All playlists
            </Link>
          </div>
        </div>
      </div>
      <div className="container pb-4 wf-page-shell">
        <div className="wf-route-card p-3">
          <div className="mb-3">
            <input
              type="search"
              className="form-control"
              placeholder="Search tracks in this playlist"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              aria-label="Search playlist tracks"
            />
          </div>
          {error ? (
            <div className="alert alert-warning" role="alert">
              {error}
            </div>
          ) : null}
          {tracks.length === 0 ? (
            <p className="wf-route-empty mb-0">
              No tracks yet. Open an <Link href="/">album</Link> and use &quot;Add&quot; next to a
              track.
            </p>
          ) : filteredTracks.length === 0 ? (
            <p className="wf-route-empty mb-0">No tracks match that search.</p>
          ) : (
            <div className="wf-track-cards">
              {filteredTracks.map((t) => (
                <article key={`${t.trackId}-${t.addedAt}`} className="wf-track-card wf-route-card">
                  <div>
                    <h2 className="h6 mb-1">{t.title}</h2>
                    <p className="mb-0 small text-muted">
                      <Link href={`/albums/${t.albumId}`}>{t.albumTitle}</Link> • {t.artist}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger wf-route-btn"
                    disabled={removingId === t.trackId}
                    onClick={() => handleRemove(t.trackId)}
                  >
                    {removingId === t.trackId ? "..." : "Remove"}
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
