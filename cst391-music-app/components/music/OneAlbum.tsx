"use client";

import type { Album, Track } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import TrackLyrics from "./TrackLyrics";
import TrackVideo from "./TrackVideo";
import TracksList from "./TracksList";

interface OneAlbumProps {
  album: Album | null;
}

export default function OneAlbum({ album }: OneAlbumProps) {
  const router = useRouter();
  const tracks = useMemo(
    () => (Array.isArray(album?.tracks) ? album.tracks : []),
    [album]
  );
  const [selectedTrackId, setSelectedTrackId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const selectedTrack = useMemo((): Track | null => {
    if (!tracks.length) return null;
    if (
      selectedTrackId != null &&
      tracks.some((t) => t.id === selectedTrackId)
    ) {
      return tracks.find((t) => t.id === selectedTrackId) ?? null;
    }
    return tracks[0] ?? null;
  }, [tracks, selectedTrackId]);

  const listSelectedId = selectedTrack?.id ?? null;
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredTracks = useMemo(
    () =>
      tracks.filter((track) =>
        `${track.title} ${track.number ?? ""}`.toLowerCase().includes(normalizedSearch)
      ),
    [tracks, normalizedSearch]
  );

  if (!album) {
    return (
      <div className="wf-route-page">
        <div className="container wf-page-shell py-4">
          <p>Album not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="wf-route-page">
      <div className="container wf-page-shell py-4">
        <div className="wf-route-hero">
          <h2 className="mb-0">Album details for {album.title}</h2>
        </div>
        <div className="row g-3">
          <div className="col-12 col-lg-4">
            <div className="card wf-glass-card wf-route-card">
              {album.image ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element -- remote album art */}
                  <img src={album.image} className="card-img-top" alt={album.title} />
                </>
              ) : (
                <div
                  className="card-img-top bg-secondary text-white d-flex align-items-center justify-content-center"
                  style={{ minHeight: 200 }}
                  aria-hidden
                >
                  🎵
                </div>
              )}
              <div className="card-body">
                <h5 className="card-title">{album.title}</h5>
                <p className="card-text">{album.description}</p>
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
                <TracksList
                  tracks={filteredTracks}
                  selectedTrackId={listSelectedId}
                  onSelectTrack={(track) => setSelectedTrackId(track?.id ?? null)}
                />
                {tracks.length > 0 && filteredTracks.length === 0 ? (
                  <p className="small text-muted mt-2 mb-0">No tracks match that search.</p>
                ) : null}
                <button
                  type="button"
                  className="btn btn-primary rounded-pill wf-route-btn"
                  onClick={() => {
                    if (album.id != null) router.push(`/edit/${album.id}`);
                  }}
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
          <div className="col-12 col-lg-8">
            <div className="card mb-3 wf-glass-card wf-route-card">
              <div className="card-body">
                <TrackLyrics track={selectedTrack} />
              </div>
            </div>
            <div className="card wf-glass-card wf-route-card">
              <div className="card-body">
                <TrackVideo track={selectedTrack} albumArtist={album.artist} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
