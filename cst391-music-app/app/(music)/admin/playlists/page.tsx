"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import type { PlaylistSummary } from "@/lib/types";
import {
  deletePlaylistAdmin,
  fetchAdminPlaylists,
} from "@/lib/playlist-api";
import DeletePlaylistModal from "@/components/music/DeletePlaylistModal";

export default function AdminPlaylistsPage() {
  const { data: session, status } = useSession();
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PlaylistSummary | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchAdminPlaylists();
      setPlaylists(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "admin") {
      void load();
    }
  }, [status, session?.user?.role, load]);

  async function handleDelete() {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setDeletingId(id);
    setError(null);
    try {
      await deletePlaylistAdmin(id);
      setPendingDelete(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  if (status === "loading") {
    return (
      <div className="wf-route-page">
        <div className="container p-4 wf-page-shell">
          <p className="wf-loading-dots">Loading</p>
        </div>
      </div>
    );
  }

  if (session?.user?.role !== "admin") {
    return (
      <div className="wf-route-page">
        <div className="container p-4 wf-page-shell">
          <div className="wf-route-card p-4">
            <p>Access denied.</p>
            <Link href="/">Home</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wf-route-page">
      <div className="container p-4 wf-page-shell">
        <div className="wf-route-hero">
          <h1 className="h3 mb-1">All playlists (admin)</h1>
          <p className="small mb-0">
            Moderation view - delete playlists that violate content rules.
          </p>
        </div>
        <div className="wf-route-card p-3">
          {error ? (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          ) : null}
          {loading ? (
            <p className="wf-loading-dots mb-0">Loading</p>
          ) : playlists.length === 0 ? (
            <p className="wf-route-empty mb-0">No playlists in the database.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-striped table-sm align-middle">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Owner user id</th>
                    <th>Tracks</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {playlists.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <Link href={`/library/${p.id}`}>{p.name}</Link>
                      </td>
                      <td>
                        <code className="small">{p.ownerUserId ?? "-"}</code>
                      </td>
                      <td>{p.trackCount}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger wf-route-btn"
                          disabled={deletingId === p.id}
                          onClick={() => setPendingDelete(p)}
                        >
                          {deletingId === p.id ? "..." : "Delete"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {pendingDelete ? (
        <DeletePlaylistModal
          playlistName={pendingDelete.name}
          isDeleting={deletingId === pendingDelete.id}
          error={error}
          onCancel={() => {
            if (deletingId) return;
            setPendingDelete(null);
          }}
          onConfirm={() => void handleDelete()}
        />
      ) : null}
    </div>
  );
}
