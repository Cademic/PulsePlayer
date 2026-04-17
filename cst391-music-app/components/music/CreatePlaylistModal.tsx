"use client";

import { useState } from "react";
import { createPlaylist } from "@/lib/playlist-api";
import type { PlaylistSummary } from "@/lib/types";

interface CreatePlaylistModalProps {
  onCancel: () => void;
  onCreated: (playlist: PlaylistSummary) => void;
}

export default function CreatePlaylistModal({
  onCancel,
  onCreated,
}: CreatePlaylistModalProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const created = await createPlaylist(name);
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create playlist");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="wf-route-page wf-modal-route-page">
      <div className="container p-4 wf-page-shell wf-modal-route-shell" style={{ maxWidth: 560 }}>
        <form onSubmit={handleSubmit} className="wf-route-card p-4 wf-modal-route-card">
          <div className="wf-route-hero">
            <h1 className="h3 mb-1">Create playlist</h1>
            <p className="mb-0">Start a new collection and add songs you love.</p>
          </div>
          <div className="mb-3 mt-3">
            <label htmlFor="create-playlist-name" className="form-label">
              Title
            </label>
            <input
              id="create-playlist-name"
              type="text"
              className="form-control"
              maxLength={100}
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              autoFocus
            />
          </div>
          {error ? (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          ) : null}
          <div className="d-flex gap-2">
            <button type="button" className="btn btn-outline-secondary wf-route-btn" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary wf-route-btn" disabled={submitting}>
              {submitting ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
