"use client";

import type { Track } from "@/lib/types";
import { useMemo } from "react";

function getYouTubeEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);

    if (
      parsed.hostname.includes("youtube.com") &&
      parsed.pathname.startsWith("/embed/")
    ) {
      return url;
    }

    if (parsed.hostname === "youtu.be") {
      const id = parsed.pathname.replace("/", "").trim();
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }

    if (parsed.hostname.includes("youtube.com")) {
      if (parsed.pathname.startsWith("/shorts/")) {
        const id = parsed.pathname.replace(/^\/shorts\//, "").split("/")[0]?.trim();
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
      const id = parsed.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }

    return null;
  } catch {
    return null;
  }
}

function buildYouTubeSearchUrl(artist: string | undefined, title: string) {
  const query = [artist, title].filter(Boolean).join(" ");
  const encoded = encodeURIComponent(query);
  return `https://www.youtube.com/results?search_query=${encoded}`;
}

interface TrackVideoProps {
  track: Track | null;
  albumArtist: string;
}

export default function TrackVideo({ track, albumArtist }: TrackVideoProps) {
  const embedUrl = useMemo(
    () => getYouTubeEmbedUrl(track?.video),
    [track?.video]
  );

  if (!track) {
    return (
      <p className="card-text mb-0">
        Show the YouTube video of the selected track here.
      </p>
    );
  }

  if (embedUrl) {
    return (
      <div className="ratio ratio-16x9">
        <iframe
          src={embedUrl}
          title={`${track.title} video`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  const rawVideo = track.video?.trim();
  if (rawVideo && /^https?:\/\//i.test(rawVideo)) {
    return (
      <p className="wf-song-panel-muted mb-0">
        <a href={rawVideo} target="_blank" rel="noreferrer">
          Open official music video
        </a>
      </p>
    );
  }

  const searchUrl = buildYouTubeSearchUrl(albumArtist, track.title);

  return (
    <>
      <p className="wf-song-panel-muted mb-2">No embeddable YouTube link for this track.</p>
      <a href={searchUrl} target="_blank" rel="noreferrer">
        Search on YouTube
      </a>
    </>
  );
}
