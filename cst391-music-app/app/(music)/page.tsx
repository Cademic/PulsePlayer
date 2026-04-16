"use client";

import type {
  FeaturedSongDto,
  MusicSearchItemDto,
} from "@/lib/theaudiodb-search-map";
import { useHomeSearch } from "@/contexts/home-search-context";
import {
  addAudioDbTrackToPlaylist,
  addTrackToPlaylist,
  fetchPlaylistDetail,
  fetchMyPlaylists,
  removeTrackFromPlaylist,
} from "@/lib/playlist-api";
import UniversalSongSearchBar from "@/components/music/UniversalSongSearchBar";
import type { PlaylistSummary } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useMemo, useRef, useState } from "react";

const PLAYLIST_CARD_COLORS = [
  "var(--wf-playlist-1)",
  "var(--wf-playlist-2)",
  "var(--wf-playlist-3)",
];

interface PlaylistMembershipState {
  trackIds: number[];
  recordingMap: Record<string, number>;
  coverImages: string[];
}

function toPlaylistMembershipState(
  tracks: Array<{ trackId: number; recordingMbid?: string | null; albumImage?: string | null }>
): PlaylistMembershipState {
  const coverImages = tracks
    .map((track) => track.albumImage?.trim() ?? "")
    .filter((image): image is string => image.length > 0);

  return {
    trackIds: tracks.map((track) => track.trackId),
    recordingMap: tracks.reduce<Record<string, number>>((acc, track) => {
      if (typeof track.recordingMbid === "string" && track.recordingMbid.length > 0) {
        acc[track.recordingMbid] = track.trackId;
      }
      return acc;
    }, {}),
    coverImages,
  };
}

export default function Page() {
  const { searchPhrase } = useHomeSearch();
  const router = useRouter();
  const { status } = useSession();
  const [searchItems, setSearchItems] = useState<MusicSearchItemDto[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [featuredSongs, setFeaturedSongs] = useState<FeaturedSongDto[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [songLoadNote, setSongLoadNote] = useState<string | null>(null);
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [playlistError, setPlaylistError] = useState<string | null>(null);
  const songCarouselRef = useRef<HTMLDivElement | null>(null);
  const playlistCarouselRef = useRef<HTMLDivElement | null>(null);
  const searchWrapRef = useRef<HTMLDivElement | null>(null);
  const searchAddTriggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const searchAddCloseTimerRef = useRef<number | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [searchAddState, setSearchAddState] = useState<{
    key: string;
    status: "success" | "error";
    message: string;
  } | null>(null);
  const [activeSearchAddMenu, setActiveSearchAddMenu] = useState<{
    item: MusicSearchItemDto;
    itemKey: string;
    top: number;
    left: number;
  } | null>(null);
  const songCarouselPointerIdRef = useRef<number | null>(null);
  const songCarouselPointerStartXRef = useRef<number | null>(null);
  const songCarouselScrollStartRef = useRef(0);
  const songCarouselIsSwipingRef = useRef(false);
  const [playlistMembership, setPlaylistMembership] = useState<
    Record<string, PlaylistMembershipState>
  >({});
  const [isSongCarouselDragging, setIsSongCarouselDragging] = useState(false);

  useEffect(() => {
    setFeaturedLoading(true);
    void (async () => {
      try {
        const res = await fetch("/api/music/featured-songs", {
          cache: "no-store",
        });
        const json: unknown = await res.json();
        if (
          !res.ok ||
          typeof json !== "object" ||
          json === null ||
          !Array.isArray((json as { items?: unknown }).items)
        ) {
          setFeaturedSongs([]);
          setSongLoadNote("Featured songs could not load from TheAudioDB.");
          return;
        }
        setFeaturedSongs((json as { items: FeaturedSongDto[] }).items);
        setSongLoadNote(null);
      } catch (e) {
        console.error(e);
        setFeaturedSongs([]);
        setSongLoadNote("Featured songs could not load from TheAudioDB.");
      } finally {
        setFeaturedLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const q = searchPhrase.trim();
    if (q.length < 2) {
      setSearchItems([]);
      setSearchLoading(false);
      return;
    }

    const handle = setTimeout(() => {
      void (async () => {
        setSearchLoading(true);
        try {
          const res = await fetch(
            `/api/music/search?${new URLSearchParams({
              q,
              type: "release",
              limit: "20",
              offset: "0",
            })}`,
            { cache: "no-store" }
          );
          const json: unknown = await res.json();
          if (
            res.ok &&
            typeof json === "object" &&
            json !== null &&
            Array.isArray((json as { items?: unknown }).items)
          ) {
            setSearchItems(
              (json as { items: MusicSearchItemDto[] }).items
            );
          } else {
            setSearchItems([]);
          }
        } catch (e) {
          console.error(e);
          setSearchItems([]);
        } finally {
          setSearchLoading(false);
        }
      })();
    }, 400);

    return () => clearTimeout(handle);
  }, [searchPhrase]);

  useEffect(() => {
    if (status !== "authenticated") {
      setRecentSearches([]);
      setPlaylistMembership({});
      return;
    }
    let cancelled = false;
    fetchMyPlaylists()
      .then((data) => {
        if (!cancelled) {
          setPlaylists(data);
          setPlaylistError(null);
        }
      })
      .catch((e: Error) => {
        if (!cancelled) {
          setPlaylistError(e.message);
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
      for (let i = 0; i < playlists.length; i += 1) {
        const playlist = playlists[i];
        const detail = details[i];
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
  }, [status, playlists]);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/music/recent-searches", {
          cache: "no-store",
        });
        const json: unknown = await res.json();
        if (
          !cancelled &&
          res.ok &&
          typeof json === "object" &&
          json !== null &&
          Array.isArray((json as { items?: unknown }).items)
        ) {
          const queries = (json as { items: { query: string }[] }).items
            .map((item) => item.query)
            .filter((query) => typeof query === "string" && query.length > 0);
          setRecentSearches(queries.slice(0, 5));
        }
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status]);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (
        searchWrapRef.current &&
        !searchWrapRef.current.contains(e.target as Node)
      ) {
        setSearchOpen(false);
        setActiveSearchAddMenu(null);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    function closeSearchAddMenu() {
      setActiveSearchAddMenu(null);
    }

    window.addEventListener("resize", closeSearchAddMenu);
    window.addEventListener("scroll", closeSearchAddMenu, true);
    return () => {
      window.removeEventListener("resize", closeSearchAddMenu);
      window.removeEventListener("scroll", closeSearchAddMenu, true);
    };
  }, []);

  const previewPlaylists = playlists.slice(0, 10);
  const songCarouselItems = useMemo(
    () =>
      featuredSongs.map((song) => ({
        id: song.idTrack,
        title: song.title,
        artist: song.artist,
        coverArtUrl: song.coverArtUrl,
        albumId: song.albumId,
        album: song.album,
        trackNumber: song.trackNumber,
      })),
    [featuredSongs]
  );
  const greetingLabel = useMemo(() => {
    const currentHour = new Date().getHours();
    if (currentHour < 12) {
      return "Good Morning";
    }
    if (currentHour < 18) {
      return "Good Afternoon";
    }
    return "Good Evening";
  }, []);

  function goGetStarted() {
    if (status === "authenticated") {
      router.push("/library/create");
      return;
    }
    router.push("/auth/signin?callbackUrl=/library/create");
  }

  function scrollSongCarousel(direction: "left" | "right") {
    const container = songCarouselRef.current;
    if (!container) return;
    const amount = Math.max(240, Math.floor(container.clientWidth * 0.75));
    container.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  }

  function scrollPlaylistCarousel(direction: "left" | "right") {
    const container = playlistCarouselRef.current;
    if (!container) return;
    const amount = Math.max(240, Math.floor(container.clientWidth * 0.75));
    container.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  }

  function onSongCarouselPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === "mouse" && e.button !== 0) {
      return;
    }
    songCarouselPointerIdRef.current = e.pointerId;
    songCarouselPointerStartXRef.current = e.clientX;
    songCarouselScrollStartRef.current = e.currentTarget.scrollLeft;
    songCarouselIsSwipingRef.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsSongCarouselDragging(true);
  }

  function onSongCarouselPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (
      songCarouselPointerIdRef.current !== e.pointerId ||
      songCarouselPointerStartXRef.current === null
    ) {
      return;
    }
    const deltaX = e.clientX - songCarouselPointerStartXRef.current;
    if (Math.abs(deltaX) > 6) {
      songCarouselIsSwipingRef.current = true;
    }
    e.currentTarget.scrollLeft = songCarouselScrollStartRef.current - deltaX;
    e.preventDefault();
  }

  function onSongCarouselPointerEnd(e: React.PointerEvent<HTMLDivElement>) {
    if (songCarouselPointerIdRef.current !== e.pointerId) {
      return;
    }
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    songCarouselPointerIdRef.current = null;
    songCarouselPointerStartXRef.current = null;
    setIsSongCarouselDragging(false);
    window.setTimeout(() => {
      songCarouselIsSwipingRef.current = false;
    }, 120);
  }

  async function persistRecentSearch(query: string) {
    if (status !== "authenticated" || query.trim().length < 2) {
      return;
    }
    try {
      const res = await fetch("/api/music/recent-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      if (!res.ok) {
        console.warn("Failed to store recent search.");
        return;
      }
      const json: unknown = await res.json();
      if (
        typeof json === "object" &&
        json !== null &&
        Array.isArray((json as { items?: unknown }).items)
      ) {
        const queries = (json as { items: { query: string }[] }).items
          .map((item) => item.query)
          .filter((value) => typeof value === "string" && value.length > 0);
        setRecentSearches(queries.slice(0, 5));
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function removeRecentSearch(query: string) {
    if (status !== "authenticated") {
      return;
    }
    try {
      const res = await fetch("/api/music/recent-searches", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      if (!res.ok) {
        console.warn("Failed to remove recent search.");
        return;
      }
      const json: unknown = await res.json();
      if (
        typeof json === "object" &&
        json !== null &&
        Array.isArray((json as { items?: unknown }).items)
      ) {
        const queries = (json as { items: { query: string }[] }).items
          .map((item) => item.query)
          .filter((value) => typeof value === "string" && value.length > 0);
        setRecentSearches(queries.slice(0, 5));
      }
    } catch (e) {
      console.error(e);
    }
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

  async function addSearchSongToPlaylist(
    item: MusicSearchItemDto,
    playlistId: string
  ) {
    const itemKey = getSearchItemKey(item);
    const alreadyAdded = isSongAlreadyInPlaylist(item, playlistId);
    const trackIdForRemoval = resolveTrackIdForRemoval(item, playlistId);
    if (!item.audioDbTrackId && item.trackId == null) {
      setSearchAddState({
        key: `${itemKey}::${playlistId}`,
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
        key: `${itemKey}::${playlistId}`,
        status: "success",
        message: alreadyAdded ? "Removed" : "Added",
      });
      setPlaylistMembership((prev) => {
        const existing = prev[playlistId] ?? {
          trackIds: [],
          recordingMap: {},
          coverImages: [],
        };
        const nextTrackIds = [...existing.trackIds];
        const nextRecordingMap = { ...existing.recordingMap };

        if (alreadyAdded) {
          const removalTrackId = trackIdForRemoval;
          if (removalTrackId != null) {
            const idx = nextTrackIds.indexOf(removalTrackId);
            if (idx >= 0) {
              nextTrackIds.splice(idx, 1);
            }
            if (item.audioDbTrackId && nextRecordingMap[item.audioDbTrackId] != null) {
              delete nextRecordingMap[item.audioDbTrackId];
            }
          }
        } else {
          const addedTrackId = item.trackId ?? trackIdForRemoval;
          if (addedTrackId != null && !nextTrackIds.includes(addedTrackId)) {
            nextTrackIds.push(addedTrackId);
          }
          if (item.audioDbTrackId && addedTrackId != null) {
            nextRecordingMap[item.audioDbTrackId] = addedTrackId;
          }
        }

        return {
          ...prev,
          [playlistId]: {
            trackIds: nextTrackIds,
            recordingMap: nextRecordingMap,
            coverImages: existing.coverImages,
          },
        };
      });
      void fetchPlaylistDetail(playlistId)
        .then((detail) => {
          setPlaylistMembership((prev) => ({
            ...prev,
            [playlistId]: toPlaylistMembershipState(detail.tracks),
          }));
        })
        .catch(() => {
          // Ignore refresh failures; optimistic membership state is already applied.
        });
    } catch (e) {
      setSearchAddState({
        key: `${itemKey}::${playlistId}`,
        status: "error",
        message: e instanceof Error ? e.message : "Could not add",
      });
    } finally {
      window.setTimeout(() => setSearchAddState(null), 1600);
    }
  }

  function isSongAlreadyInPlaylist(
    item: MusicSearchItemDto,
    playlistId: string
  ): boolean {
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

  function resolveTrackIdForRemoval(
    item: MusicSearchItemDto,
    playlistId: string
  ): number | null {
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

  function cancelSearchAddCloseTimer(): void {
    if (searchAddCloseTimerRef.current != null) {
      window.clearTimeout(searchAddCloseTimerRef.current);
      searchAddCloseTimerRef.current = null;
    }
  }

  function scheduleSearchAddCloseTimer(): void {
    cancelSearchAddCloseTimer();
    searchAddCloseTimerRef.current = window.setTimeout(() => {
      setActiveSearchAddMenu(null);
    }, 180);
  }

  function openSearchAddMenu(item: MusicSearchItemDto, itemKey: string): void {
    const trigger = searchAddTriggerRefs.current[itemKey];
    const container = searchWrapRef.current;
    if (!trigger || !container) return;

    cancelSearchAddCloseTimer();

    const triggerRect = trigger.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const menuWidth = Math.min(250, Math.max(window.innerWidth * 0.7, 0));
    const viewportPadding = 16;
    const preferredLeft = triggerRect.right - containerRect.left + 12;
    const maxLeft =
      window.innerWidth - containerRect.left - menuWidth - viewportPadding;
    const left = Math.max(
      0,
      Math.min(preferredLeft, maxLeft, containerRect.width - viewportPadding)
    );
    const top = Math.max(triggerRect.top - containerRect.top - 6, 44);

    setActiveSearchAddMenu({
      item,
      itemKey,
      top,
      left,
    });
  }

  function toggleSearchAddMenu(item: MusicSearchItemDto, itemKey: string): void {
    if (activeSearchAddMenu?.itemKey === itemKey) {
      setActiveSearchAddMenu(null);
      return;
    }
    openSearchAddMenu(item, itemKey);
  }

  function renderSearchAddMenu(item: MusicSearchItemDto, menuKey: string) {
    return (
      <div className="wf-search-add-menu-overlay" role="menu">
        <p className="wf-search-add-heading mb-0">Playlists</p>
        {status !== "authenticated" ? (
          <Link
            href="/auth/signin?callbackUrl=/"
            className="wf-search-add-item wf-search-add-link"
            role="menuitem"
            onClick={() => setActiveSearchAddMenu(null)}
          >
            <span className="wf-search-add-item-icon" aria-hidden>
              🔐
            </span>
            <span>Sign in to add songs</span>
          </Link>
        ) : playlists.length === 0 ? (
          <Link
            href="/library/create"
            className="wf-search-add-item wf-search-add-link"
            role="menuitem"
            onClick={() => setActiveSearchAddMenu(null)}
          >
            <span className="wf-search-add-item-icon" aria-hidden>
              ＋
            </span>
            <span>Create a playlist first</span>
          </Link>
        ) : (
          playlists.map((playlist) => {
            const stateKey = `${menuKey}::${playlist.id}`;
            const alreadyAdded = isSongAlreadyInPlaylist(item, playlist.id);
            return (
              <button
                key={playlist.id}
                type="button"
                className="wf-search-add-item"
                role="menuitem"
                aria-label={`${
                  alreadyAdded ? "Remove" : "Add"
                } ${item.title} ${alreadyAdded ? "from" : "to"} ${playlist.name}`}
                onClick={() => void addSearchSongToPlaylist(item, playlist.id)}
              >
                <span className="wf-search-add-item-main">
                  <span className="wf-search-add-item-icon" aria-hidden>
                    ♪
                  </span>
                  <span className="wf-search-add-item-name">{playlist.name}</span>
                </span>
                <span className="wf-search-add-item-meta">
                  {alreadyAdded ? (
                    <span
                      className="wf-search-add-check"
                      aria-label="Already in playlist"
                      title="Already in playlist"
                    >
                      ✓
                    </span>
                  ) : null}
                  {searchAddState?.key === stateKey ? (
                    <span
                      className={`wf-search-add-note wf-search-add-note--${searchAddState.status}`}
                    >
                      {searchAddState.message}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })
        )}
      </div>
    );
  }

  return (
    <>
          <section className="wf-hero" aria-label="Welcome">
            <div className="wf-hero-inner">
              <div className="wf-hero-topbar">
                <div className="wf-hero-search">
                  <UniversalSongSearchBar ariaLabel="Search all songs" />
                </div>
                {status === "authenticated" ? (
                  <button
                    type="button"
                    className="wf-pill wf-pill--auth"
                    onClick={() => signOut({ callbackUrl: "/" })}
                  >
                    LOG OUT
                  </button>
                ) : (
                  <Link className="wf-pill wf-pill--auth" href="/auth/signin">
                    SIGN IN
                  </Link>
                )}
              </div>
              <div className="wf-hero-content">
                <div className="wf-hero-copy">
                  <h1 className="wf-hero-title">{greetingLabel}</h1>
                  <p className="wf-hero-line1">Start your day with music</p>
                </div>
                <div className="d-flex flex-wrap gap-2 wf-hero-actions">
                  <button type="button" className="wf-btn-cta" onClick={goGetStarted}>
                    Library
                  </button>
                  <button
                    type="button"
                    className="btn btn-light rounded-pill px-4"
                    onClick={() => router.push("/discover")}
                  >
                    Browse discover
                  </button>
                </div>
              </div>
            </div>
          </section>

      <section
        id="featured-songs"
        className="wf-section"
        aria-labelledby="songs-heading"
      >
        <div className="wf-section-head">
          <h2 id="songs-heading" className="wf-section-title">
            Featured songs
          </h2>
          <div className="wf-section-rule" aria-hidden />
        </div>
        {songLoadNote ? <p className="text-muted mb-0">{songLoadNote}</p> : null}
        {featuredLoading ? (
          <div className="wf-featured-scroll" aria-hidden>
            {Array.from({ length: 6 }).map((_, idx) => (
              <span
                key={`song-skeleton-${idx}`}
                className="wf-song-pill-card wf-song-pill-card--skeleton wf-stagger-in"
                style={{ animationDelay: `${idx * 70}ms` }}
              />
            ))}
          </div>
        ) : songCarouselItems.length === 0 ? (
          <p className="text-muted mb-0">
            Song highlights appear here once top tracks are available.
          </p>
        ) : (
          <div className="wf-carousel-shell">
            <button
              type="button"
              className="wf-carousel-arrow wf-carousel-arrow-left"
              aria-label="Scroll featured songs left"
              onClick={() => scrollSongCarousel("left")}
            >
              {"<"}
            </button>
            <div
              ref={songCarouselRef}
              className={`wf-featured-scroll ${isSongCarouselDragging ? "is-dragging" : ""}`}
              onPointerDown={onSongCarouselPointerDown}
              onPointerMove={onSongCarouselPointerMove}
              onPointerUp={onSongCarouselPointerEnd}
              onPointerCancel={onSongCarouselPointerEnd}
            >
            {songCarouselItems.map((song, idx) => (
                <button
                  key={song.id}
                  type="button"
                  className={`wf-song-pill-card wf-stagger-in ${
                    !song.albumId ? "wf-song-pill-card--unavailable" : ""
                  }`}
                  style={{ animationDelay: `${idx * 55}ms` }}
                  onClick={() => {
                    if (songCarouselIsSwipingRef.current) {
                      return;
                    }
                    if (song.albumId) {
                      router.push(`/albums/${song.albumId}`);
                    }
                  }}
                  aria-disabled={!song.albumId}
                >
                  {song.coverArtUrl ? (
                    <span className="wf-song-pill-media" aria-hidden>
                      {/* eslint-disable-next-line @next/next/no-img-element -- remote cover art */}
                      <img
                        src={song.coverArtUrl}
                        alt={`${song.title} cover`}
                        className="wf-song-pill-cover"
                        loading="lazy"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </span>
                  ) : (
                    <span className="wf-song-pill-icon" aria-hidden>
                      ♪
                    </span>
                  )}
                  <span className="wf-song-pill-content">
                    <span className="wf-song-pill-title">{song.title}</span>
                    <span className="wf-song-pill-subtitle">
                      {song.trackNumber != null ? `${song.trackNumber}. ` : ""}
                      {song.artist}
                      {song.album ? ` • ${song.album}` : ""}
                    </span>
                  </span>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="wf-carousel-arrow wf-carousel-arrow-right"
              aria-label="Scroll featured songs right"
              onClick={() => scrollSongCarousel("right")}
            >
              {">"}
            </button>
          </div>
        )}
      </section>

      {status === "authenticated" ? (
        <section className="wf-section" aria-labelledby="playlists-heading">
          <div className="wf-section-head">
            <h2 id="playlists-heading" className="wf-section-title">
              Playlists
            </h2>
            <div className="wf-section-rule" aria-hidden />
          </div>

          <Link
            className="wf-create-btn d-inline-block mb-3 text-decoration-none"
            href="/library/create"
          >
            Create New
          </Link>

          {playlistError ? (
            <p className="text-danger small">{playlistError}</p>
          ) : previewPlaylists.length === 0 ? (
            <p className="text-muted mb-0">
              Start with a name, drop in songs you love, and keep building until it feels
              like you. Use <strong>Create New</strong> or open{" "}
              <Link href="/library">Playlists</Link> to begin.
            </p>
          ) : (
            <div className="wf-carousel-shell">
              <button
                type="button"
                className="wf-carousel-arrow wf-carousel-arrow-left"
                aria-label="Scroll playlists left"
                onClick={() => scrollPlaylistCarousel("left")}
              >
                {"<"}
              </button>
              <div ref={playlistCarouselRef} className="wf-playlist-row">
                {previewPlaylists.map((p, i) => (
                  <div
                    key={p.id}
                    className="position-relative wf-playlist-item wf-slide-in-ltr"
                    style={{ animationDelay: `${i * 65}ms` }}
                  >
                    {(() => {
                      const isMembershipLoading =
                        p.trackCount > 0 && playlistMembership[p.id] == null;
                      return (
                    <Link
                      href={`/library/${p.id}`}
                      className={`wf-playlist-card ${
                        isMembershipLoading ? "wf-playlist-card--loading" : ""
                      }`}
                      style={{ background: PLAYLIST_CARD_COLORS[i % PLAYLIST_CARD_COLORS.length] }}
                    >
                      <div className="wf-playlist-card-inner">
                        {playlistMembership[p.id]?.coverImages.length >= 4 ? (
                          <span className="wf-playlist-collage" aria-hidden>
                            {playlistMembership[p.id]?.coverImages.slice(0, 4).map((image, imageIdx) => (
                              // eslint-disable-next-line @next/next/no-img-element -- remote album art URLs
                              <img
                                key={`${p.id}-cover-${imageIdx}`}
                                src={image}
                                alt=""
                                className="wf-playlist-collage-image"
                              />
                            ))}
                          </span>
                        ) : playlistMembership[p.id]?.coverImages.length ? (
                          <span className="wf-playlist-cover-single" aria-hidden>
                            {/* eslint-disable-next-line @next/next/no-img-element -- remote album art URLs */}
                            <img
                              src={playlistMembership[p.id].coverImages[0]}
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
                          <span className="wf-playlist-title">{p.name}</span>
                          <span className="wf-playlist-subtitle">
                          {p.trackCount > 0
                            ? `${p.trackCount} ${p.trackCount === 1 ? "song" : "songs"}`
                            : "Add songs to get started"}
                          </span>
                        </span>
                      </div>
                    </Link>
                      );
                    })()}
                    <div className="dropdown position-absolute top-0 end-0 m-2">
                      <button
                        type="button"
                        className="wf-song-card-menu"
                        data-bs-toggle="dropdown"
                        aria-label={`Playlist options for ${p.name}`}
                      >
                        ⋮
                      </button>
                      <ul className="dropdown-menu dropdown-menu-end">
                        <li>
                          <span className="dropdown-item-text text-muted small">
                            Rename (coming soon)
                          </span>
                        </li>
                        <li>
                          <Link className="dropdown-item" href={`/library/${p.id}`}>
                            Add Songs
                          </Link>
                        </li>
                        <li>
                          <span className="dropdown-item-text text-muted small">
                            Share (coming soon)
                          </span>
                        </li>
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="wf-carousel-arrow wf-carousel-arrow-right"
                aria-label="Scroll playlists right"
                onClick={() => scrollPlaylistCarousel("right")}
              >
                {">"}
              </button>
            </div>
          )}
        </section>
      ) : null}

      {status !== "authenticated" ? (
        <section className="wf-guest-cta" aria-label="Sign in prompt">
          <p className="wf-guest-cta-title">Unlock your personal sound world.</p>
          <p className="wf-guest-cta-copy">
            Sign in to save playlists, discover tailored picks, and keep every vibe one tap away.
          </p>
          <Link className="wf-guest-cta-link" href="/auth/signin?callbackUrl=/">
            Sign in and start listening
          </Link>
        </section>
      ) : null}

    </>
  );
}
