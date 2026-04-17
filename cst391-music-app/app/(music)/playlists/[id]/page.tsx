"use client";

import CollectionHero from "@/components/music/CollectionHero";
import CollectionTrackTable, {
  type CollectionTrackRow,
} from "@/components/music/CollectionTrackTable";
import EditPlaylistModal from "@/components/music/EditPlaylistModal";
import DeletePlaylistModal from "@/components/music/DeletePlaylistModal";
import SongInfoSidePanel from "@/components/music/SongInfoSidePanel";
import TrackPlaylistAddMenu from "@/components/music/TrackPlaylistAddMenu";
import UniversalSongSearchBar from "@/components/music/UniversalSongSearchBar";
import { fetchAlbumSingle } from "@/components/music/music-api";
import {
  deletePlaylist,
  fetchPlaylistDetail,
  removeTrackFromPlaylist,
} from "@/lib/playlist-api";
import type { PlaylistDetailPayload, PlaylistDetailTrack, Track } from "@/lib/types";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";

function getPlaylistCoverImages(tracks: PlaylistDetailTrack[]): string[] {
  return tracks
    .map((track) => track.albumImage?.trim() ?? "")
    .filter((image): image is string => image.length > 0);
}

export default function PlaylistDetailPage() {
  const params = useParams();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { status } = useSession();
  const rawId = params.id;
  const id = typeof rawId === "string" ? rawId : "";

  const [data, setData] = useState<PlaylistDetailPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [resolvedTrack, setResolvedTrack] = useState<Track | null>(null);
  const [resolving, setResolving] = useState(false);
  const [editingOpen, setEditingOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deletingPlaylist, setDeletingPlaylist] = useState(false);
  const editFromQuery = searchParams.get("edit") === "1";

  const tracks = useMemo(() => data?.tracks ?? [], [data?.tracks]);
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredTracks = useMemo(
    () =>
      tracks.filter((track) => {
        const haystack = `${track.title} ${track.artist} ${track.albumTitle}`.toLowerCase();
        return haystack.includes(normalizedSearch);
      }),
    [tracks, normalizedSearch]
  );

  const selectedPlaylistTrack = useMemo(
    () => filteredTracks.find((t) => String(t.trackId) === selectedKey) ?? null,
    [filteredTracks, selectedKey]
  );

  useEffect(() => {
    if (!selectedPlaylistTrack) {
      setResolvedTrack(null);
      return;
    }
    let cancelled = false;
    setResolving(true);
    void fetchAlbumSingle({ id: selectedPlaylistTrack.albumId })
      .then((album) => {
        if (cancelled) return;
        const match =
          album.tracks?.find((tr) => tr.id === selectedPlaylistTrack.trackId) ?? null;
        setResolvedTrack(match);
      })
      .catch(() => {
        if (!cancelled) {
          setResolvedTrack(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setResolving(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedPlaylistTrack]);

  const panelTrack: Track | null = useMemo(() => {
    if (!selectedPlaylistTrack) {
      return null;
    }
    if (resolvedTrack) {
      return resolvedTrack;
    }
    return {
      id: selectedPlaylistTrack.trackId,
      number: 0,
      title: selectedPlaylistTrack.title,
      lyrics: null,
      video: null,
      recordingMbid: selectedPlaylistTrack.recordingMbid,
    };
  }, [resolvedTrack, selectedPlaylistTrack]);

  const trackNumberInPlaylist = useMemo(() => {
    if (!selectedPlaylistTrack) {
      return 0;
    }
    const idx = tracks.findIndex((t) => t.trackId === selectedPlaylistTrack.trackId);
    return idx >= 0 ? idx + 1 : 0;
  }, [selectedPlaylistTrack, tracks]);

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

  useEffect(() => {
    if (editFromQuery) {
      setEditingOpen(true);
    }
  }, [editFromQuery]);

  async function handleRemove(trackId: number) {
    if (!id) return;
    setRemovingId(trackId);
    setError(null);
    try {
      await removeTrackFromPlaylist(id, trackId);
      if (String(trackId) === selectedKey) {
        setSelectedKey(null);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Remove failed");
    } finally {
      setRemovingId(null);
    }
  }

  function handleRowSelect(row: CollectionTrackRow) {
    setSelectedKey(row.rowKey);
    setPanelOpen(true);
  }

  async function handleDeletePlaylist() {
    if (!data) return;
    setDeletingPlaylist(true);
    setError(null);
    try {
      await deletePlaylist(data.playlist.id);
      router.push("/library");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete playlist.");
    } finally {
      setDeletingPlaylist(false);
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
  const coverImages = getPlaylistCoverImages(tracks);
  const metaLine = `${playlist.trackCount} song${playlist.trackCount === 1 ? "" : "s"}`;

  const tableRows: CollectionTrackRow[] = filteredTracks.map((t, i) => ({
    rowKey: String(t.trackId),
    index: i + 1,
    title: t.title,
    artist: t.artist,
    thumbUrl: t.albumImage,
    durationLabel: null,
    menu: (
      <div className="wf-collection-track-actions">
        <TrackPlaylistAddMenu
          trackId={t.trackId}
          recordingMbid={t.recordingMbid}
          title={t.title}
          artist={t.artist}
        />
        <button
          type="button"
          className="wf-search-add-trigger wf-search-add-trigger--dash"
          disabled={removingId === t.trackId}
          onClick={(event) => {
            event.stopPropagation();
            void handleRemove(t.trackId);
          }}
          aria-label={`Remove ${t.title} from this playlist`}
        >
          <span className="wf-search-add-glyph" aria-hidden>
            −
          </span>
        </button>
        <div className="dropdown wf-dropdown-animated">
          <button
            type="button"
            className="wf-track-menu-btn"
            data-bs-toggle="dropdown"
            aria-expanded="false"
            aria-label={`More for ${t.title}`}
          >
            ⋮
          </button>
          <ul className="dropdown-menu dropdown-menu-end">
            <li>
              <Link className="dropdown-item" href={`/albums/${t.albumId}`}>
                Go to album
              </Link>
            </li>
          </ul>
        </div>
      </div>
    ),
  }));

  return (
    <div className="wf-route-page wf-route-page--edge-hero">
      <section className="wf-section" aria-labelledby="playlist-detail-heading">
        <CollectionHero
          eyebrow="PLAYLIST"
          title={playlist.name}
          metaLine={metaLine}
          description={null}
          coverCollageUrls={coverImages.length >= 4 ? coverImages.slice(0, 4) : undefined}
          coverUrl={coverImages.length > 0 && coverImages.length < 4 ? coverImages[0] : null}
          topBar={
            <>
              <Link className="btn btn-link text-white text-decoration-none fw-semibold px-0" href="/library">
                ← Library
              </Link>
              <div className="wf-collection-hero-bar-search">
                <UniversalSongSearchBar ariaLabel="Search any song from this playlist" />
              </div>
              <span className="d-none d-md-block" style={{ width: 72 }} aria-hidden />
            </>
          }
          actions={
            <div className="dropdown wf-dropdown-animated">
              <button
                type="button"
                className="wf-collection-hero-icon-btn"
                data-bs-toggle="dropdown"
                aria-expanded="false"
                aria-label="More options"
              >
                ⋮
              </button>
              <ul className="dropdown-menu dropdown-menu-end">
                <li>
                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={() => setEditingOpen(true)}
                  >
                    Edit
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="dropdown-item text-danger"
                    onClick={() => setConfirmDeleteOpen(true)}
                  >
                    Delete playlist
                  </button>
                </li>
              </ul>
            </div>
          }
        />

        <div
          className={`wf-collection-body mt-3${panelOpen ? "" : " wf-collection-body--panel-closed"}`}
        >
          <div className="wf-collection-main-card">
            <h2 id="playlist-detail-heading" className="visually-hidden">
              {playlist.name} tracks
            </h2>
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
            {resolving && selectedPlaylistTrack && !resolvedTrack ? (
              <p className="small text-muted mb-2">Loading lyrics and video for this track…</p>
            ) : null}
            {tracks.length === 0 ? (
              <p className="wf-route-empty mb-0">
                No tracks yet. Open an <Link href="/">album</Link> and use &quot;Add&quot; next to a track.
              </p>
            ) : filteredTracks.length === 0 ? (
              <p className="wf-route-empty mb-0">No tracks match that search.</p>
            ) : (
              <CollectionTrackTable
                rows={tableRows}
                selectedRowKey={selectedKey}
                onRowSelect={handleRowSelect}
              />
            )}
          </div>

          <SongInfoSidePanel
            isOpen={panelOpen}
            onClose={() => setPanelOpen(false)}
            contextLine={
              selectedPlaylistTrack && trackNumberInPlaylist
                ? `${playlist.name} • Track ${trackNumberInPlaylist}`
                : playlist.name
            }
            track={panelTrack}
            coverUrl={selectedPlaylistTrack?.albumImage?.trim() ?? null}
            primaryArtist={selectedPlaylistTrack?.artist ?? ""}
            albumArtist={selectedPlaylistTrack?.artist ?? ""}
            onRemoveFromCurrentPlaylist={
              selectedPlaylistTrack
                ? () => void handleRemove(selectedPlaylistTrack.trackId)
                : undefined
            }
            removeFromPlaylistDisabled={removingId === selectedPlaylistTrack?.trackId}
          />
        </div>
      </section>

      {!panelOpen ? (
        <button
          type="button"
          className="wf-song-panel-reopen"
          onClick={() => setPanelOpen(true)}
          aria-label="Show song info"
        >
          ♪
        </button>
      ) : null}
      {editingOpen ? (
        <EditPlaylistModal
          playlistId={playlist.id}
          onClose={() => {
            setEditingOpen(false);
            if (editFromQuery) {
              router.replace(pathname, { scroll: false });
            }
          }}
          onSaved={(nextName) => {
            setData((prev) =>
              prev ? { ...prev, playlist: { ...prev.playlist, name: nextName } } : prev
            );
          }}
          onChanged={() => {
            void load();
          }}
        />
      ) : null}
      {confirmDeleteOpen ? (
        <DeletePlaylistModal
          playlistName={playlist.name}
          isDeleting={deletingPlaylist}
          error={error}
          onCancel={() => {
            if (deletingPlaylist) return;
            setConfirmDeleteOpen(false);
          }}
          onConfirm={() => void handleDeletePlaylist()}
        />
      ) : null}
    </div>
  );
}
