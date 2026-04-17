"use client";

import type { Album } from "@/lib/types";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function ArtistDiscographyPage() {
  const params = useParams();
  const rawName = params.name;
  const artistName = typeof rawName === "string" ? decodeURIComponent(rawName) : "";
  const [albums, setAlbums] = useState<Album[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!artistName) {
      setIsLoading(false);
      setError("Missing artist name.");
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    void (async () => {
      try {
        const res = await fetch(
          `/api/music/artist-discography?${new URLSearchParams({ artist: artistName })}`,
          { cache: "no-store" }
        );
        const json: unknown = await res.json();
        if (
          !res.ok ||
          typeof json !== "object" ||
          json === null ||
          !Array.isArray((json as { items?: unknown }).items)
        ) {
          throw new Error("Could not load artist discography.");
        }
        if (!cancelled) {
          setAlbums((json as { items: Album[] }).items);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load artist discography.");
          setAlbums([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [artistName]);

  const totalTracks = useMemo(
    () => albums.reduce((sum, album) => sum + (album.tracks?.length ?? 0), 0),
    [albums]
  );

  return (
    <div className="wf-route-page">
      <div className="container py-4 wf-page-shell">
        <div className="wf-route-hero d-flex justify-content-between align-items-start gap-3 flex-wrap">
          <div>
            <h1 className="h3 mb-1">{artistName || "Artist"}</h1>
            <p className="mb-0">
              {albums.length} albums • {totalTracks} tracks
            </p>
          </div>
          <Link href="/" className="btn btn-light btn-sm wf-route-btn">
            Back to home
          </Link>
        </div>
      </div>

      <div className="container pb-4 wf-page-shell">
        {isLoading ? <p className="wf-loading-dots">Loading discography</p> : null}
        {!isLoading && error ? <p className="text-danger">{error}</p> : null}

        {!isLoading && !error && albums.length === 0 ? (
          <p className="wf-route-empty">No albums found for this artist.</p>
        ) : null}

        <div className="row g-3">
          {albums.map((album) => (
            <div key={album.id ?? `${album.title}-${album.year}`} className="col-12 col-xl-6">
              <div className="card h-100 wf-route-card">
                <div className="row g-0">
                  <div className="col-12 col-md-4">
                    {album.image ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element -- remote cover art */}
                        <img
                          src={album.image}
                          alt={`${album.title} cover`}
                          className="img-fluid rounded-start h-100 w-100"
                          style={{ objectFit: "cover", maxHeight: 220 }}
                        />
                      </>
                    ) : (
                      <div className="h-100 d-flex align-items-center justify-content-center bg-light text-muted">
                        No cover
                      </div>
                    )}
                  </div>
                  <div className="col-12 col-md-8">
                    <div className="card-body">
                      <h2 className="h6 mb-1">{album.title}</h2>
                      <p className="small text-muted mb-2">{album.year}</p>
                      <p className="small fw-semibold mb-1">Tracks</p>
                      {album.tracks && album.tracks.length > 0 ? (
                        <ol className="small mb-0 ps-3">
                          {album.tracks.map((track) => (
                            <li key={track.id ?? `${track.number}-${track.title}`}>{track.title}</li>
                          ))}
                        </ol>
                      ) : (
                        <p className="small text-muted mb-0">No tracks available.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
