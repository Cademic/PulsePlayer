"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { albumPathFromFeaturedSong } from "@/lib/album-navigation";
import UniversalSongSearchBar from "@/components/music/UniversalSongSearchBar";
import { useFeaturedSongs } from "@/hooks/use-featured-songs";

const FEATURED_PAGE_LIMIT = 60;
const DISCOVER_CARD_COLORS = [
  "var(--wf-playlist-1)",
  "var(--wf-playlist-2)",
  "var(--wf-playlist-3)",
];

export default function DiscoverSongsPage() {
  const router = useRouter();
  const {
    items: songs,
    loading: isLoading,
    error: hasError,
  } = useFeaturedSongs({ limit: FEATURED_PAGE_LIMIT });

  const songsHeading = useMemo(() => "Discover", []);
  const [searchTerm, setSearchTerm] = useState("");
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredSongs = useMemo(
    () =>
      songs.filter((song) => {
        return (
          song.title.toLowerCase().includes(normalizedSearch) ||
          song.artist.toLowerCase().includes(normalizedSearch) ||
          (song.album ?? "").toLowerCase().includes(normalizedSearch)
        );
      }),
    [songs, normalizedSearch]
  );

  return (
    <section className="wf-route-page wf-route-page--edge-hero">
      <div className="wf-section">
        <div className="wf-route-hero wf-route-hero--full wf-route-hero--edge">
          <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
            <div>
              <h1 className="h3 mb-1 fw-bold">{songsHeading}</h1>
              <p className="mb-0">Browse the full featured list in one place.</p>
            </div>
            <div className="flex-grow-1 d-flex justify-content-center">
              <Suspense fallback={null}>
                <UniversalSongSearchBar ariaLabel="Search any song from Discover" />
              </Suspense>
            </div>
          </div>
        </div>
        <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
          <Link className="wf-create-btn d-inline-block mb-0 text-decoration-none" href="/">
            Back Home
          </Link>
          <input
            type="search"
            className="form-control"
            style={{ maxWidth: "360px" }}
            placeholder="Search discover songs"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            aria-label="Search discover songs list"
          />
        </div>
        {isLoading ? (
          <>
            <p className="wf-loading-dots mb-2">Loading featured songs</p>
            <div className="wf-playlist-list-grid" aria-hidden>
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={`discover-skeleton-${index}`} className="wf-playlist-card wf-playlist-card--skeleton">
                  <span className="wf-playlist-skeleton-meta" />
                </div>
              ))}
            </div>
          </>
        ) : hasError ? (
          <p className="text-danger mb-0">{hasError}</p>
        ) : songs.length === 0 ? (
          <p className="wf-route-empty mb-0">No featured songs are available right now.</p>
        ) : filteredSongs.length === 0 ? (
          <p className="wf-route-empty mb-0">No featured songs match that search.</p>
        ) : (
          <div className="wf-playlist-list-grid">
            {filteredSongs.map((song, index) => (
              <div
                className="position-relative wf-playlist-item wf-slide-in-ltr"
                style={{ animationDelay: `${index * 65}ms` }}
                key={song.idTrack}
              >
                <button
                  type="button"
                  className="wf-playlist-card"
                  style={{
                    background: DISCOVER_CARD_COLORS[index % DISCOVER_CARD_COLORS.length],
                  }}
                  onClick={() => {
                    const path = albumPathFromFeaturedSong(song);
                    if (path) {
                      router.push(path);
                    }
                  }}
                  aria-disabled={!song.albumId}
                >
                  <div className="wf-playlist-card-inner">
                  {song.coverArtUrl ? (
                    <span className="wf-playlist-cover-single" aria-hidden>
                      {/* eslint-disable-next-line @next/next/no-img-element -- remote cover art */}
                      <img
                        src={song.coverArtUrl}
                        alt=""
                        className="wf-playlist-cover-single-image"
                        loading="lazy"
                        onError={(event) => {
                          (event.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </span>
                  ) : (
                    <span className="wf-playlist-empty-art" aria-hidden>
                      <span className="wf-playlist-empty-glow" />
                    </span>
                  )}
                  <span className="wf-playlist-meta">
                    <span className="wf-playlist-title">{song.title}</span>
                    <span className="wf-playlist-subtitle">
                      {song.artist}
                      {song.album ? ` • ${song.album}` : ""}
                    </span>
                    <span className="wf-playlist-subtitle">
                      {song.trackNumber != null ? `${song.trackNumber}. ` : ""}
                      {song.album ?? "Album not available"}
                    </span>
                  </span>
                  </div>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

