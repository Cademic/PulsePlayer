"use client";

import {
  addAudioDbTrackToPlaylist,
  addTrackToPlaylist,
  fetchMyPlaylists,
  fetchPlaylistDetail,
  removeTrackFromPlaylist,
} from "@/lib/playlist-api";
import type { MusicSearchItemDto } from "@/lib/theaudiodb-search-map";
import type { PlaylistSummary } from "@/lib/types";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useRef, useState } from "react";

interface PlaylistMembershipState {
  trackIds: number[];
  recordingMap: Record<string, number>;
}

function toPlaylistMembershipState(
  tracks: Array<{ trackId: number; recordingMbid?: string | null }>
): PlaylistMembershipState {
  return {
    trackIds: tracks.map((track) => track.trackId),
    recordingMap: tracks.reduce<Record<string, number>>((acc, track) => {
      if (typeof track.recordingMbid === "string" && track.recordingMbid.length > 0) {
        acc[track.recordingMbid] = track.trackId;
      }
      return acc;
    }, {}),
  };
}

function getSearchItemKey(item: MusicSearchItemDto): string {
  return [
    item.mbid,
    item.title,
    item.artist,
    item.audioDbTrackId ?? "",
    item.trackId != null ? String(item.trackId) : "",
  ].join("::");
}

interface TrackPlaylistAddMenuProps {
  trackId: number;
  recordingMbid?: string | null;
  title: string;
  artist: string;
  /** Full-width "Add to Playlists" control for song info panel vs compact + in track rows. */
  layout?: "icon" | "panel";
}

export default function TrackPlaylistAddMenu({
  trackId,
  recordingMbid,
  title,
  artist,
  layout = "icon",
}: TrackPlaylistAddMenuProps) {
  const { status } = useSession();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [playlistMembership, setPlaylistMembership] = useState<
    Record<string, PlaylistMembershipState>
  >({});
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchAddState, setSearchAddState] = useState<{
    key: string;
    status: "success" | "error";
    message: string;
  } | null>(null);

  const item = useMemo((): MusicSearchItemDto => {
    const mbid =
      typeof recordingMbid === "string" && recordingMbid.length > 0
        ? recordingMbid
        : `local-track-${trackId}`;
    return {
      mbid,
      title,
      artist,
      trackId,
      audioDbTrackId:
        typeof recordingMbid === "string" && recordingMbid.length > 0 ? recordingMbid : undefined,
    };
  }, [artist, recordingMbid, title, trackId]);

  const itemKey = useMemo(() => getSearchItemKey(item), [item]);

  useEffect(() => {
    if (status !== "authenticated") {
      setPlaylists([]);
      setPlaylistMembership({});
      return;
    }

    let cancelled = false;
    void fetchMyPlaylists()
      .then((data) => {
        if (!cancelled) {
          setPlaylists(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPlaylists([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated" || playlists.length === 0) {
      return;
    }

    let cancelled = false;
    void (async () => {
      const details = await Promise.allSettled(
        playlists.map((playlist) => fetchPlaylistDetail(playlist.id))
      );
      if (cancelled) {
        return;
      }
      const nextMembership: Record<string, PlaylistMembershipState> = {};
      for (let index = 0; index < playlists.length; index += 1) {
        const playlist = playlists[index];
        const detail = details[index];
        if (!playlist || !detail || detail.status !== "fulfilled") {
          continue;
        }
        nextMembership[playlist.id] = toPlaylistMembershipState(detail.value.tracks);
      }
      setPlaylistMembership(nextMembership);
    })();

    return () => {
      cancelled = true;
    };
  }, [playlists, status]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    function onPointerDown(event: PointerEvent) {
      const root = wrapRef.current;
      if (!root) {
        return;
      }
      if (event.composedPath().includes(root)) {
        return;
      }
      setMenuOpen(false);
    }

    function closeMenu() {
      setMenuOpen(false);
    }

    /** Close on outer scroll / resize only — not when scrolling inside the dropdown (overflow-y: auto). */
    function onScrollCapture(event: Event) {
      const root = wrapRef.current;
      const t = event.target;
      if (root && t instanceof Node && root.contains(t)) {
        return;
      }
      closeMenu();
    }

    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", onScrollCapture, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", onScrollCapture, true);
    };
  }, [menuOpen]);

  function cancelCloseTimer() {
    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function scheduleCloseTimer() {
    cancelCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setMenuOpen(false);
    }, 180);
  }

  function isSongAlreadyInPlaylist(playlistId: string): boolean {
    const membership = playlistMembership[playlistId];
    if (!membership) {
      return false;
    }
    if (item.trackId != null && membership.trackIds.includes(item.trackId)) {
      return true;
    }
    if (item.audioDbTrackId && membership.recordingMap[item.audioDbTrackId] != null) {
      return true;
    }
    return false;
  }

  function resolveTrackIdForRemoval(playlistId: string): number | null {
    const membership = playlistMembership[playlistId];
    if (!membership) {
      return item.trackId ?? null;
    }
    if (item.trackId != null && membership.trackIds.includes(item.trackId)) {
      return item.trackId;
    }
    if (item.audioDbTrackId && membership.recordingMap[item.audioDbTrackId] != null) {
      return membership.recordingMap[item.audioDbTrackId];
    }
    return item.trackId ?? null;
  }

  async function addSongToPlaylist(playlistId: string) {
    const alreadyAdded = isSongAlreadyInPlaylist(playlistId);
    const trackIdForRemoval = resolveTrackIdForRemoval(playlistId);
    const stateKey = `${itemKey}::${playlistId}`;

    if (!item.audioDbTrackId && item.trackId == null) {
      setSearchAddState({
        key: stateKey,
        status: "error",
        message: "Track id unavailable",
      });
      return;
    }

    try {
      if (alreadyAdded) {
        if (trackIdForRemoval == null) {
          throw new Error("Could not determine track id to remove");
        }
        await removeTrackFromPlaylist(playlistId, trackIdForRemoval);
      } else if (item.trackId != null) {
        await addTrackToPlaylist(playlistId, item.trackId);
      } else if (item.audioDbTrackId) {
        await addAudioDbTrackToPlaylist(playlistId, item.audioDbTrackId);
      }

      setSearchAddState({
        key: stateKey,
        status: "success",
        message: alreadyAdded ? "Removed" : "Added",
      });

      void fetchPlaylistDetail(playlistId)
        .then((detail) => {
          setPlaylistMembership((prev) => ({
            ...prev,
            [playlistId]: toPlaylistMembershipState(detail.tracks),
          }));
        })
        .catch(() => {
          // Ignore refresh failures.
        });
    } catch (error) {
      setSearchAddState({
        key: stateKey,
        status: "error",
        message: error instanceof Error ? error.message : "Could not add",
      });
    } finally {
      window.setTimeout(() => setSearchAddState(null), 1600);
    }
  }

  function openMenu() {
    cancelCloseTimer();
    setMenuOpen(true);
  }

  const isPanel = layout === "panel";

  return (
    <div
      ref={wrapRef}
      className={`wf-search-add-wrap wf-track-playlist-add-wrap${isPanel ? " wf-track-playlist-add-wrap--panel" : ""}`}
      onMouseEnter={cancelCloseTimer}
      onMouseLeave={() => scheduleCloseTimer()}
    >
      <button
        type="button"
        className={isPanel ? "wf-song-panel-add-trigger" : "wf-search-add-trigger"}
        aria-label={isPanel ? "Add to playlists" : `Add ${title} to playlist`}
        onMouseEnter={() => {
          cancelCloseTimer();
          openMenu();
        }}
        onFocus={() => {
          cancelCloseTimer();
          openMenu();
        }}
        onBlur={(event) => {
          const next = event.relatedTarget as Node | null;
          if (wrapRef.current && next && wrapRef.current.contains(next)) {
            return;
          }
          scheduleCloseTimer();
        }}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          cancelCloseTimer();
          setMenuOpen((open) => !open);
        }}
      >
        {isPanel ? (
          "Add to Playlists"
        ) : (
          <span className="wf-search-add-glyph" aria-hidden>
            +
          </span>
        )}
      </button>

      {menuOpen ? (
        <div
          className={`wf-search-add-menu-overlay wf-track-playlist-add-menu${isPanel ? " wf-track-playlist-add-menu--panel" : ""}`}
          role="menu"
          onMouseEnter={cancelCloseTimer}
          onWheel={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <p className="wf-search-add-heading mb-0">Playlists</p>
          {status !== "authenticated" ? (
            <span className="wf-search-add-item">
              <span className="wf-search-add-item-main">
                <span className="wf-search-add-item-icon" aria-hidden>
                  🔐
                </span>
                <span>Sign in to add songs</span>
              </span>
            </span>
          ) : playlists.length === 0 ? (
            <span className="wf-search-add-item">
              <span className="wf-search-add-item-main">
                <span className="wf-search-add-item-icon" aria-hidden>
                  ＋
                </span>
                <span>Create a playlist first</span>
              </span>
            </span>
          ) : (
            playlists.map((playlist) => {
              const stateKey = `${itemKey}::${playlist.id}`;
              const alreadyAdded = isSongAlreadyInPlaylist(playlist.id);
              return (
                <button
                  key={playlist.id}
                  type="button"
                  className="wf-search-add-item"
                  role="menuitem"
                  aria-label={`${alreadyAdded ? "Remove" : "Add"} ${title} ${
                    alreadyAdded ? "from" : "to"
                  } ${playlist.name}`}
                  onClick={() => void addSongToPlaylist(playlist.id)}
                >
                  <span className="wf-search-add-item-main">
                    <span className="wf-search-add-item-icon" aria-hidden>
                      ♪
                    </span>
                    <span className="wf-search-add-item-name">{playlist.name}</span>
                  </span>
                  <span className="wf-search-add-item-meta">
                    {alreadyAdded ? (
                      <span className="wf-search-add-check" aria-label="Already in playlist" title="Already in playlist">
                        ✓
                      </span>
                    ) : null}
                    {searchAddState?.key === stateKey ? (
                      <span className={`wf-search-add-note wf-search-add-note--${searchAddState.status}`}>
                        {searchAddState.message}
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
