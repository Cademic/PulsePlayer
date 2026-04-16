"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { MusicSearchItemDto } from "@/lib/theaudiodb-search-map";
import {
  addAudioDbTrackToPlaylist,
  addTrackToPlaylist,
  fetchMyPlaylists,
  fetchPlaylistDetail,
  removeTrackFromPlaylist,
} from "@/lib/playlist-api";
import type { PlaylistSummary } from "@/lib/types";

interface UniversalSongSearchBarProps {
  ariaLabel?: string;
}

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

export default function UniversalSongSearchBar({
  ariaLabel = "Search songs, artists, or albums",
}: UniversalSongSearchBarProps) {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [searchItems, setSearchItems] = useState<MusicSearchItemDto[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [playlistMembership, setPlaylistMembership] = useState<
    Record<string, PlaylistMembershipState>
  >({});
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
  const searchWrapRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchAddTriggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const searchAddCloseTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const windowWithRegistry = window as Window & {
      __wfUniversalSearchCount?: number;
    };
    windowWithRegistry.__wfUniversalSearchCount =
      (windowWithRegistry.__wfUniversalSearchCount ?? 0) + 1;

    return () => {
      windowWithRegistry.__wfUniversalSearchCount = Math.max(
        0,
        (windowWithRegistry.__wfUniversalSearchCount ?? 1) - 1
      );
    };
  }, []);

  useEffect(() => {
    function openUniversalSearch() {
      setSearchOpen(true);
      searchInputRef.current?.focus();
    }

    window.addEventListener("wf-open-universal-search", openUniversalSearch);
    return () => window.removeEventListener("wf-open-universal-search", openUniversalSearch);
  }, []);

  useEffect(() => {
    if (searchParams.get("openUniversalSearch") !== "1") {
      return;
    }

    setSearchOpen(true);
    searchInputRef.current?.focus();
    router.replace(pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSearchItems([]);
      setSearchLoading(false);
      return;
    }

    const handle = window.setTimeout(() => {
      void (async () => {
        setSearchLoading(true);
        try {
          const res = await fetch(
            `/api/music/search?${new URLSearchParams({
              q: trimmed,
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
            setSearchItems((json as { items: MusicSearchItemDto[] }).items);
          } else {
            setSearchItems([]);
          }
        } catch {
          setSearchItems([]);
        } finally {
          setSearchLoading(false);
        }
      })();
    }, 400);

    return () => window.clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    if (status !== "authenticated") {
      setRecentSearches([]);
      setPlaylists([]);
      setPlaylistMembership({});
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/music/recent-searches", { cache: "no-store" });
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
            .filter((item) => typeof item === "string" && item.length > 0);
          setRecentSearches(queries.slice(0, 5));
        }
      } catch {
        setRecentSearches([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated") {
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
    function onPointerDown(event: MouseEvent) {
      if (searchWrapRef.current && !searchWrapRef.current.contains(event.target as Node)) {
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

  async function persistRecentSearch(nextQuery: string) {
    if (status !== "authenticated" || nextQuery.trim().length < 2) {
      return;
    }

    try {
      const res = await fetch("/api/music/recent-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: nextQuery }),
      });
      if (!res.ok) return;
      const json: unknown = await res.json();
      if (
        typeof json === "object" &&
        json !== null &&
        Array.isArray((json as { items?: unknown }).items)
      ) {
        const queries = (json as { items: { query: string }[] }).items
          .map((item) => item.query)
          .filter((item) => typeof item === "string" && item.length > 0);
        setRecentSearches(queries.slice(0, 5));
      }
    } catch {
      // Ignore recent-search persistence failures.
    }
  }

  async function removeRecentSearch(nextQuery: string) {
    if (status !== "authenticated") {
      return;
    }

    try {
      const res = await fetch("/api/music/recent-searches", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: nextQuery }),
      });
      if (!res.ok) return;
      const json: unknown = await res.json();
      if (
        typeof json === "object" &&
        json !== null &&
        Array.isArray((json as { items?: unknown }).items)
      ) {
        const queries = (json as { items: { query: string }[] }).items
          .map((item) => item.query)
          .filter((item) => typeof item === "string" && item.length > 0);
        setRecentSearches(queries.slice(0, 5));
      }
    } catch {
      // Ignore recent-search removal failures.
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

  function isSongAlreadyInPlaylist(item: MusicSearchItemDto, playlistId: string): boolean {
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

  function resolveTrackIdForRemoval(item: MusicSearchItemDto, playlistId: string): number | null {
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

  async function addSearchSongToPlaylist(item: MusicSearchItemDto, playlistId: string) {
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
        key: `${itemKey}::${playlistId}`,
        status: "error",
        message: error instanceof Error ? error.message : "Could not add",
      });
    } finally {
      window.setTimeout(() => setSearchAddState(null), 1600);
    }
  }

  function cancelSearchAddCloseTimer() {
    if (searchAddCloseTimerRef.current != null) {
      window.clearTimeout(searchAddCloseTimerRef.current);
      searchAddCloseTimerRef.current = null;
    }
  }

  function scheduleSearchAddCloseTimer() {
    cancelSearchAddCloseTimer();
    searchAddCloseTimerRef.current = window.setTimeout(() => {
      setActiveSearchAddMenu(null);
    }, 180);
  }

  function openSearchAddMenu(item: MusicSearchItemDto, itemKey: string) {
    const trigger = searchAddTriggerRefs.current[itemKey];
    const container = searchWrapRef.current;
    if (!trigger || !container) return;

    cancelSearchAddCloseTimer();

    const triggerRect = trigger.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const menuWidth = Math.min(250, Math.max(window.innerWidth * 0.7, 0));
    const viewportPadding = 16;
    const preferredLeft = triggerRect.right - containerRect.left + 12;
    const maxLeft = window.innerWidth - containerRect.left - menuWidth - viewportPadding;
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

  function renderSearchAddMenu(item: MusicSearchItemDto, menuKey: string) {
    return (
      <div className="wf-search-add-menu-overlay" role="menu">
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
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return;
    }
    void persistRecentSearch(trimmed);
    setSearchOpen(true);
  }

  return (
    <div className="wf-universal-search" ref={searchWrapRef}>
      <form className="wf-universal-search-form" onSubmit={handleSubmit} role="search">
        <span className="wf-search-icon" aria-hidden>
          🔍
        </span>
        <input
          type="search"
          className="wf-search-input wf-universal-search-input"
          placeholder="Search for your style"
          aria-label={ariaLabel}
          ref={searchInputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setSearchOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && query.trim().length >= 2) {
              void persistRecentSearch(query);
              setSearchOpen(true);
            }
          }}
        />
      </form>
      {searchOpen ? (
        <div className="wf-search-dropdown" role="listbox">
          {query.trim().length < 2 ? (
            recentSearches.length === 0 ? (
              <p className="wf-search-dropdown-empty mb-0">
                Your recent searches will appear here.
              </p>
            ) : (
              <>
                <p className="wf-search-dropdown-label mb-0">Recent searches</p>
                <ul className="wf-search-dropdown-list">
                  {recentSearches.map((recentQuery) => (
                    <li key={recentQuery}>
                      <div className="wf-search-dropdown-item wf-search-dropdown-item--recent">
                        <button
                          type="button"
                          className="wf-search-dropdown-recent-text"
                          onClick={() => setQuery(recentQuery)}
                        >
                          {recentQuery}
                        </button>
                        <button
                          type="button"
                          className="wf-search-dropdown-remove"
                          aria-label={`Remove recent search ${recentQuery}`}
                          onClick={() => void removeRecentSearch(recentQuery)}
                        >
                          ×
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )
          ) : searchLoading ? (
            <div className="wf-search-loading" aria-live="polite">
              <span className="wf-loading-spinner" aria-hidden />
              <p className="wf-search-dropdown-empty mb-0">Searching...</p>
            </div>
          ) : searchItems.length === 0 ? (
            <p className="wf-search-dropdown-empty mb-0">No releases matched that query.</p>
          ) : (
            <ul className="wf-search-dropdown-list">
              {searchItems.slice(0, 20).map((item) => (
                <li key={getSearchItemKey(item)}>
                  {(() => {
                    const menuKey = getSearchItemKey(item);
                    return (
                      <div className="wf-search-dropdown-item wf-stagger-in">
                        <button
                          type="button"
                          className="wf-search-dropdown-main"
                          onClick={() => {
                            void persistRecentSearch(query);
                            setSearchOpen(false);
                            router.push(`/artists/${encodeURIComponent(item.artist)}`);
                          }}
                        >
                          <span className="wf-search-dropdown-media" aria-hidden>
                            {item.coverArtUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element -- remote artwork
                              <img
                                src={item.coverArtUrl}
                                alt=""
                                className="wf-search-dropdown-thumb"
                                loading="lazy"
                              />
                            ) : (
                              <span className="wf-search-dropdown-thumb-fallback">♪</span>
                            )}
                          </span>
                          <span className="wf-search-dropdown-content">
                            <span className="wf-search-dropdown-title">{item.title}</span>
                            <span className="wf-search-dropdown-sub">
                              {item.artist}
                              {item.disambiguation ? ` • ${item.disambiguation}` : ""}
                            </span>
                          </span>
                        </button>
                        {item.audioDbTrackId || item.trackId != null ? (
                          <div
                            className="wf-search-add-wrap"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <button
                              type="button"
                              className="wf-search-add-trigger"
                              aria-label={`Add ${item.title} to playlist`}
                              ref={(node) => {
                                searchAddTriggerRefs.current[menuKey] = node;
                              }}
                              onMouseEnter={() => {
                                cancelSearchAddCloseTimer();
                                openSearchAddMenu(item, menuKey);
                              }}
                              onMouseLeave={() => {
                                scheduleSearchAddCloseTimer();
                              }}
                              onFocus={() => {
                                cancelSearchAddCloseTimer();
                                openSearchAddMenu(item, menuKey);
                              }}
                              onBlur={() => {
                                scheduleSearchAddCloseTimer();
                              }}
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                openSearchAddMenu(item, menuKey);
                              }}
                            >
                              <span className="wf-search-add-glyph" aria-hidden>
                                +
                              </span>
                            </button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })()}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
      {activeSearchAddMenu ? (
        <div
          className="wf-search-add-overlay-anchor"
          style={{
            top: `${activeSearchAddMenu.top}px`,
            left: `${activeSearchAddMenu.left}px`,
          }}
          onMouseEnter={() => cancelSearchAddCloseTimer()}
          onMouseLeave={() => scheduleSearchAddCloseTimer()}
          onClick={(event) => event.stopPropagation()}
        >
          {renderSearchAddMenu(activeSearchAddMenu.item, activeSearchAddMenu.itemKey)}
        </div>
      ) : null}
    </div>
  );
}

