"use client";

import CollectionHero from "@/components/music/CollectionHero";
import CollectionTrackTable, {
  type CollectionTrackRow,
} from "@/components/music/CollectionTrackTable";
import EditAlbum from "@/components/music/EditAlbum";
import SongInfoSidePanel from "@/components/music/SongInfoSidePanel";
import TrackPlaylistAddMenu from "@/components/music/TrackPlaylistAddMenu";
import UniversalSongSearchBar from "@/components/music/UniversalSongSearchBar";
import { deleteAlbum } from "@/components/music/music-api";
import type { Album, Track } from "@/lib/types";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useRef, useState } from "react";

interface OneAlbumProps {
  album: Album | null;
}

export default function OneAlbum({ album }: OneAlbumProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const trackDeepLinkParam = searchParams.get("track");
  const recordingDeepLinkParam = searchParams.get("recording");
  const appliedTrackDeepLinkKeyRef = useRef<string | null>(null);
  const tracks = useMemo(
    () => (Array.isArray(album?.tracks) ? album.tracks : []),
    [album]
  );
  const [selectedTrackId, setSelectedTrackId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [panelOpen, setPanelOpen] = useState(true);
  const [editingOpen, setEditingOpen] = useState(false);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredTracks = useMemo(
    () =>
      tracks.filter((track) =>
        `${track.title} ${track.number ?? ""}`.toLowerCase().includes(normalizedSearch)
      ),
    [tracks, normalizedSearch]
  );

  const selectedTrack = useMemo((): Track | null => {
    if (selectedTrackId == null) {
      return null;
    }
    return tracks.find((t) => t.id === selectedTrackId) ?? null;
  }, [tracks, selectedTrackId]);

  useEffect(() => {
    if (!trackDeepLinkParam && !recordingDeepLinkParam) {
      appliedTrackDeepLinkKeyRef.current = null;
      return;
    }
    const deepKey = `${trackDeepLinkParam ?? ""}|${recordingDeepLinkParam ?? ""}`;
    if (appliedTrackDeepLinkKeyRef.current === deepKey) {
      return;
    }
    if (!album?.tracks?.length) {
      return;
    }

    let resolvedId: number | null = null;
    if (trackDeepLinkParam) {
      const id = Number.parseInt(trackDeepLinkParam, 10);
      if (Number.isFinite(id)) {
        const found = tracks.find((t) => t.id === id);
        if (found?.id != null) {
          resolvedId = found.id;
        }
      }
    } else if (recordingDeepLinkParam) {
      const found = tracks.find((t) => t.recordingMbid === recordingDeepLinkParam);
      if (found?.id != null) {
        resolvedId = found.id;
      }
    }

    if (resolvedId == null) {
      if (tracks.length > 0) {
        appliedTrackDeepLinkKeyRef.current = deepKey;
      }
      return;
    }

    appliedTrackDeepLinkKeyRef.current = deepKey;
    queueMicrotask(() => {
      setSelectedTrackId(resolvedId);
      setPanelOpen(true);
      requestAnimationFrame(() => {
        document
          .getElementById(`album-track-${resolvedId}`)
          ?.scrollIntoView({ block: "center", behavior: "smooth" });
      });
    });
  }, [
    album,
    tracks,
    trackDeepLinkParam,
    recordingDeepLinkParam,
  ]);

  const listSelectedKey = selectedTrackId != null ? String(selectedTrackId) : null;

  const trackNumberOnAlbum = useMemo(() => {
    if (!selectedTrack || selectedTrack.id == null) {
      return 0;
    }
    const idx = tracks.findIndex((t) => t.id === selectedTrack.id);
    return idx >= 0 ? idx + 1 : 0;
  }, [selectedTrack, tracks]);

  function handleRowSelect(row: CollectionTrackRow) {
    const idNum = Number(row.rowKey);
    if (!Number.isFinite(idNum)) {
      return;
    }
    setSelectedTrackId(idNum);
    setPanelOpen(true);
  }

  if (!album) {
    return (
      <div className="wf-route-page">
        <div className="container wf-page-shell py-4">
          <p>Album not found.</p>
        </div>
      </div>
    );
  }

  const metaLine = `${album.artist} • ${album.year} • ${tracks.length} song${tracks.length === 1 ? "" : "s"}`;
  const isAdmin = session?.user?.role === "admin";

  async function handleDeleteAlbum() {
    const currentAlbum = album;
    if (!currentAlbum || currentAlbum.id == null) {
      return;
    }
    if (!window.confirm(`Delete album "${currentAlbum.title}"? This cannot be undone.`)) {
      return;
    }
    try {
      await deleteAlbum(currentAlbum.id);
      router.push("/");
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Could not delete album.");
    }
  }

  const tableRows: CollectionTrackRow[] = filteredTracks
    .filter((t): t is Track & { id: number } => t.id != null)
    .map((t, i) => ({
    rowKey: String(t.id),
    index: t.number ?? i + 1,
    title: t.title,
    artist: album.artist,
    thumbUrl: album.image,
    durationLabel: null,
    menu: (
      <div className="wf-collection-track-actions">
        <TrackPlaylistAddMenu
          trackId={t.id}
          recordingMbid={t.recordingMbid}
          title={t.title}
          artist={album.artist}
        />
      </div>
    ),
  }));

  return (
    <div className="wf-route-page wf-route-page--edge-hero">
      <section className="wf-section" aria-labelledby="album-detail-heading">
        <CollectionHero
          eyebrow="ALBUM"
          title={album.title}
          metaLine={metaLine}
          description={album.description}
          coverUrl={album.image}
          topBar={
            <>
              <Link className="btn btn-link text-white text-decoration-none fw-semibold px-0" href="/">
                ← Home
              </Link>
              <div className="wf-collection-hero-bar-search">
                <UniversalSongSearchBar ariaLabel="Search any song from this album" />
              </div>
              <span className="d-none d-md-block" style={{ width: 72 }} aria-hidden />
            </>
          }
          actions={
            isAdmin ? (
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
                  {album.id != null ? (
                    <li>
                      <button
                        type="button"
                        className="dropdown-item"
                        onClick={() => setEditingOpen(true)}
                      >
                        Edit album
                      </button>
                    </li>
                  ) : null}
                  {album.id != null ? (
                    <li>
                      <button
                        type="button"
                        className="dropdown-item text-danger"
                        onClick={() => void handleDeleteAlbum()}
                      >
                        Delete album
                      </button>
                    </li>
                  ) : null}
                </ul>
              </div>
            ) : null
          }
        />

        <div
          className={`wf-collection-body mt-3${panelOpen ? "" : " wf-collection-body--panel-closed"}`}
        >
          <div className="wf-collection-main-card">
            <h2 id="album-detail-heading" className="visually-hidden">
              {album.title} tracks
            </h2>
            <div className="mb-3">
              <input
                type="search"
                className="form-control"
                placeholder="Search tracks in this album"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                aria-label="Search album tracks"
              />
            </div>
            {tracks.length > 0 && filteredTracks.length === 0 ? (
              <p className="small text-muted mb-0">No tracks match that search.</p>
            ) : null}
            {tracks.length === 0 ? (
              <p className="wf-route-empty mb-0">No tracks on this album.</p>
            ) : (
              <CollectionTrackTable
                rows={tableRows}
                selectedRowKey={listSelectedKey}
                onRowSelect={handleRowSelect}
                emptyDurationDisplay=""
              />
            )}
          </div>

          <SongInfoSidePanel
            isOpen={panelOpen}
            onClose={() => setPanelOpen(false)}
            contextLine={
              selectedTrack && trackNumberOnAlbum
                ? `${album.title} • Track ${trackNumberOnAlbum}`
                : album.title
            }
            track={selectedTrack}
            coverUrl={album.image?.trim() ?? null}
            primaryArtist={album.artist}
            albumArtist={album.artist}
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
        <EditAlbum
          album={album}
          asModal
          onCancel={() => setEditingOpen(false)}
          onEditAlbum={async () => {
            setEditingOpen(false);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
