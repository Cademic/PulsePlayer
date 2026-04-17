"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import type { PlaylistSummary } from "@/lib/types";
import {
  deletePlaylist,
  fetchMyPlaylists,
  fetchPlaylistDetail,
} from "@/lib/playlist-api";
import CreatePlaylistModal from "@/components/music/CreatePlaylistModal";
import DeletePlaylistModal from "@/components/music/DeletePlaylistModal";
import UniversalSongSearchBar from "@/components/music/UniversalSongSearchBar";

const PLAYLIST_CARD_COLORS = [
  "var(--wf-playlist-1)",
  "var(--wf-playlist-2)",
  "var(--wf-playlist-3)",
];

interface PlaylistMembershipState {
  coverImages: string[];
}

function toPlaylistMembershipState(
  tracks: Array<{ albumImage?: string | null }>
): PlaylistMembershipState {
  const coverImages = tracks
    .map((track) => track.albumImage?.trim() ?? "")
    .filter((image): image is string => image.length > 0);

  return { coverImages };
}

export default function PlaylistsPage() {
  const router = useRouter();
  const { status } = useSession();
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [playlistMembership, setPlaylistMembership] = useState<
    Record<string, PlaylistMembershipState>
  >({});
  const [creatingOpen, setCreatingOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PlaylistSummary | null>(null);
  const [deletingPlaylistId, setDeletingPlaylistId] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated") {
      queueMicrotask(() => setHasFetched(false));
      return;
    }
    let cancelled = false;
    void fetchMyPlaylists()
      .then((data) => {
        if (!cancelled) {
          setPlaylists(data);
          setError(null);
          setHasFetched(true);
        }
      })
      .catch((e: Error) => {
        if (!cancelled) {
          setError(e.message);
          setHasFetched(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated" || playlists.length === 0) {
      queueMicrotask(() => setPlaylistMembership({}));
      return;
    }

    let cancelled = false;
    void Promise.all(
      playlists.map(async (playlist) => {
        const detail = await fetchPlaylistDetail(playlist.id);
        return {
          id: playlist.id,
          membership: toPlaylistMembershipState(detail.tracks),
        };
      })
    )
      .then((rows) => {
        if (cancelled) return;
        setPlaylistMembership(
          rows.reduce<Record<string, PlaylistMembershipState>>((acc, row) => {
            acc[row.id] = row.membership;
            return acc;
          }, {})
        );
      })
      .catch(() => {
        if (!cancelled) {
          setPlaylistMembership({});
        }
      });

    return () => {
      cancelled = true;
    };
  }, [playlists, status]);

  const loadingLists = !hasFetched && !error;
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredPlaylists = useMemo(
    () => playlists.filter((playlist) => playlist.name.toLowerCase().includes(normalizedSearch)),
    [playlists, normalizedSearch]
  );

  function handleEditPlaylist(playlist: PlaylistSummary) {
    router.push(`/playlists/${playlist.id}?edit=1`);
  }

  function handleCreatedPlaylist(playlist: PlaylistSummary) {
    setPlaylists((prev) => [playlist, ...prev]);
    setCreatingOpen(false);
  }

  async function handleDeletePlaylist() {
    if (!pendingDelete) return;
    setDeletingPlaylistId(pendingDelete.id);
    setError(null);
    try {
      await deletePlaylist(pendingDelete.id);
      setPlaylists((prev) => prev.filter((row) => row.id !== pendingDelete.id));
      setPlaylistMembership((prev) => {
        const next = { ...prev };
        delete next[pendingDelete.id];
        return next;
      });
      setPendingDelete(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete playlist.");
    } finally {
      setDeletingPlaylistId(null);
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

  if (status === "unauthenticated") {
    return (
      <div className="wf-route-page">
        <div className="container p-4 wf-page-shell">
          <div className="wf-route-card p-4">
            <h1 className="h3 mb-3">Playlists</h1>
            <p className="text-muted">
              Sign in to create playlists and add tracks from the catalog.
            </p>
            <Link className="btn btn-primary wf-route-btn" href="/auth/signin?callbackUrl=/library">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wf-route-page wf-route-page--edge-hero">
      <section className="wf-section" aria-labelledby="playlists-heading">
        <div className="wf-route-hero wf-route-hero--full wf-route-hero--edge">
          <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
            <div>
              <h1 id="playlists-heading" className="h3 mb-1 fw-bold">
                Library
              </h1>
              <p className="mb-0">Your music, all in one place</p>
            </div>
            <div className="flex-grow-1 d-flex justify-content-center">
              <UniversalSongSearchBar ariaLabel="Search any song from Library" />
            </div>
          </div>
        </div>
        <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
          <button
            type="button"
            className="wf-create-btn d-inline-block mb-0 text-decoration-none border-0"
            onClick={() => setCreatingOpen(true)}
          >
            Create New
          </button>
          <input
            type="search"
            className="form-control"
            style={{ maxWidth: "360px" }}
            placeholder="Search playlists"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            aria-label="Search playlists"
          />
        </div>

        {error ? (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        ) : null}
        {loadingLists ? (
          <>
            <p className="wf-loading-dots mb-2">Loading playlists</p>
            <div className="wf-playlist-list-grid" aria-hidden>
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={`playlist-skeleton-${index}`} className="wf-playlist-card wf-playlist-card--skeleton">
                  <span className="wf-playlist-skeleton-meta" />
                </div>
              ))}
            </div>
          </>
        ) : playlists.length === 0 ? (
          <p className="wf-route-empty mb-0">
            You have no playlists yet.{" "}
            <button
              type="button"
              className="btn btn-link p-0 align-baseline"
              onClick={() => setCreatingOpen(true)}
            >
              Create one
            </button>
            .
          </p>
        ) : filteredPlaylists.length === 0 ? (
          <p className="wf-route-empty mb-0">No playlists match that search.</p>
        ) : (
          <div className="wf-playlist-list-grid">
            {filteredPlaylists.map((playlist, index) => {
              return (
                <div
                  key={playlist.id}
                  className="position-relative wf-playlist-item wf-slide-in-ltr"
                  style={{ animationDelay: `${index * 65}ms` }}
                >
                  {(() => {
                    const isMembershipLoading =
                      playlist.trackCount > 0 && playlistMembership[playlist.id] == null;
                    return (
                  <Link
                    href={`/library/${playlist.id}`}
                    className={`wf-playlist-card ${
                      isMembershipLoading ? "wf-playlist-card--loading" : ""
                    }`}
                    style={{
                      background: PLAYLIST_CARD_COLORS[index % PLAYLIST_CARD_COLORS.length],
                    }}
                    aria-label={`Open playlist ${playlist.name}`}
                  >
                    <div className="wf-playlist-card-inner">
                      {playlistMembership[playlist.id]?.coverImages.length >= 4 ? (
                        <span className="wf-playlist-collage" aria-hidden>
                          {playlistMembership[playlist.id].coverImages
                            .slice(0, 4)
                            .map((image, imageIdx) => (
                              // eslint-disable-next-line @next/next/no-img-element -- remote album art URLs
                              <img
                                key={`${playlist.id}-cover-${imageIdx}`}
                                src={image}
                                alt=""
                                className="wf-playlist-collage-image"
                              />
                            ))}
                        </span>
                      ) : playlistMembership[playlist.id]?.coverImages.length ? (
                        <span className="wf-playlist-cover-single" aria-hidden>
                          {/* eslint-disable-next-line @next/next/no-img-element -- remote album art URLs */}
                          <img
                            src={playlistMembership[playlist.id].coverImages[0]}
                            alt=""
                            className="wf-playlist-cover-single-image"
                          />
                        </span>
                      ) : (
                        <span className="wf-playlist-empty-art" aria-hidden>
                          <span className="wf-playlist-empty-glow" />
                        </span>
                      )}
                      <span className="wf-playlist-meta">
                        <span className="wf-playlist-title">{playlist.name}</span>
                        <span className="wf-playlist-subtitle">
                          {playlist.trackCount} {playlist.trackCount === 1 ? "song" : "songs"}
                        </span>
                      </span>
                    </div>
                  </Link>
                    );
                  })()}
                  <div className="dropdown wf-dropdown-animated position-absolute top-0 end-0 m-2">
                    <button
                      type="button"
                      className="wf-song-card-menu"
                      data-bs-toggle="dropdown"
                      aria-label={`Playlist options for ${playlist.name}`}
                    >
                      <span className="wf-playlist-card-menu-icon" aria-hidden>
                        <span className="wf-playlist-card-menu-dot" />
                        <span className="wf-playlist-card-menu-dot" />
                        <span className="wf-playlist-card-menu-dot" />
                      </span>
                    </button>
                    <ul className="dropdown-menu dropdown-menu-end">
                      <li>
                        <button
                          type="button"
                          className="dropdown-item"
                          onClick={() => handleEditPlaylist(playlist)}
                        >
                          Edit
                        </button>
                      </li>
                      <li>
                        <Link className="dropdown-item" href={`/library/${playlist.id}`}>
                          Open
                        </Link>
                      </li>
                      <li>
                        <button
                          type="button"
                          className="dropdown-item text-danger"
                          onClick={() => setPendingDelete(playlist)}
                        >
                          Delete
                        </button>
                      </li>
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
      {pendingDelete ? (
        <DeletePlaylistModal
          playlistName={pendingDelete.name}
          isDeleting={deletingPlaylistId === pendingDelete.id}
          error={error}
          onCancel={() => {
            if (deletingPlaylistId) return;
            setPendingDelete(null);
          }}
          onConfirm={() => void handleDeletePlaylist()}
        />
      ) : null}
      {creatingOpen ? (
        <CreatePlaylistModal
          onCancel={() => setCreatingOpen(false)}
          onCreated={handleCreatedPlaylist}
        />
      ) : null}
    </div>
  );
}
