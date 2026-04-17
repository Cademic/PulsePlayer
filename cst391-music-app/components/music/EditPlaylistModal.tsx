"use client";

import { useEffect, useState } from "react";
import {
  fetchPlaylistDetail,
  removeTrackFromPlaylist,
  updatePlaylist,
} from "@/lib/playlist-api";
import type { PlaylistDetailTrack } from "@/lib/types";

interface EditPlaylistModalProps {
  playlistId: string;
  onClose: () => void;
  onSaved?: (nextName: string) => void;
  onChanged?: () => void;
}

export default function EditPlaylistModal({
  playlistId,
  onClose,
  onSaved,
  onChanged,
}: EditPlaylistModalProps) {
  const [name, setName] = useState("");
  const [initialName, setInitialName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [tracks, setTracks] = useState<PlaylistDetailTrack[]>([]);
  const [removingTrackId, setRemovingTrackId] = useState<number | null>(null);

  useEffect(() => {
    document.documentElement.classList.add("wf-modal-open");
    document.body.classList.add("wf-modal-open");
    return () => {
      document.documentElement.classList.remove("wf-modal-open");
      document.body.classList.remove("wf-modal-open");
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchPlaylistDetail(playlistId)
      .then((payload) => {
        if (cancelled) return;
        setName(payload.playlist.name);
        setInitialName(payload.playlist.name);
        setTracks(payload.tracks);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load playlist");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [playlistId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Playlist name is required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await updatePlaylist(playlistId, trimmed);
      onSaved?.(trimmed);
      onChanged?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update playlist");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemoveTrack(trackId: number) {
    setError(null);
    setRemovingTrackId(trackId);
    try {
      await removeTrackFromPlaylist(playlistId, trackId);
      setTracks((prev) => prev.filter((track) => track.trackId !== trackId));
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove track");
    } finally {
      setRemovingTrackId(null);
    }
  }

  return (
    <div className="wf-route-page wf-modal-route-page">
      <div className="container p-4 wf-page-shell wf-modal-route-shell" style={{ maxWidth: 680 }}>
        {loading ? (
          <div className="wf-route-card p-4 wf-modal-route-card">
            <p className="wf-loading-dots mb-0">Loading playlist</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="wf-route-card p-4 wf-modal-route-card">
            <div className="wf-route-hero">
              <h1 className="h3 mb-1">Edit playlist</h1>
              <p className="mb-0">Update your playlist details.</p>
            </div>
            <div className="mb-3">
              <label htmlFor="playlist-name" className="form-label">
                Name
              </label>
              <input
                id="playlist-name"
                type="text"
                className="form-control"
                maxLength={100}
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>
            {error ? (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            ) : null}
            <div className="d-flex gap-2">
              <button type="submit" className="btn btn-primary wf-route-btn" disabled={submitting}>
                {submitting ? "Saving..." : "Save"}
              </button>
              <button type="button" className="btn btn-outline-secondary wf-route-btn" onClick={onClose}>
                Cancel
              </button>
            </div>
            {initialName && initialName !== name.trim() ? (
              <p className="small text-muted mt-3 mb-0">Original name: {initialName}</p>
            ) : null}
            <hr className="my-4" />
            <div>
              <h2 className="h6 mb-2">Songs in this playlist</h2>
              {tracks.length === 0 ? (
                <p className="small text-muted mb-0">This playlist has no songs yet.</p>
              ) : (
                <ul className="list-group">
                  {tracks.map((track) => (
                    <li
                      key={`${track.trackId}-${track.addedAt}`}
                      className="list-group-item d-flex justify-content-between align-items-start gap-2"
                    >
                      <div className="me-2">
                        <div className="fw-semibold">{track.title}</div>
                        <div className="small text-muted">
                          {track.artist} {track.albumTitle ? `• ${track.albumTitle}` : ""}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm"
                        disabled={removingTrackId === track.trackId}
                        onClick={() => void handleRemoveTrack(track.trackId)}
                      >
                        {removingTrackId === track.trackId ? "Removing..." : "Remove"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <p className="small text-muted mt-3 mb-0">
              Tip: you can also add songs from album track lists using the + control.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
