"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createPlaylist } from "@/lib/playlist-api";

export default function CreatePlaylistPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const created = await createPlaylist(name);
      router.push(`/library/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create playlist");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="wf-route-page">
      <div className="container p-4 wf-page-shell" style={{ maxWidth: 560 }}>
        <div className="wf-route-hero">
          <h1 className="h3 mb-1">Create playlist</h1>
          <p className="mb-0">Start a new collection and add songs you love.</p>
        </div>
        <form onSubmit={handleSubmit} className="wf-route-card p-4">
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
              onChange={(e) => setName(e.target.value)}
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
              {submitting ? "Creating..." : "Create"}
            </button>
            <Link className="btn btn-outline-secondary wf-route-btn" href="/library">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
