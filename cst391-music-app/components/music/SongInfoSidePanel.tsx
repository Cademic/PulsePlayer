"use client";

import type { Track } from "@/lib/types";
import { useMemo, useState } from "react";
import TrackPlaylistAddMenu from "./TrackPlaylistAddMenu";
import TrackVideo from "./TrackVideo";

interface SongInfoSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  contextLine: string;
  track: Track | null;
  coverUrl: string | null;
  /** Shown under the track title (performing artist). */
  primaryArtist: string;
  /** Used for YouTube search fallback when no embed URL exists. */
  albumArtist: string;
  emptyMessage?: string;
  /** Set on playlist detail pages to show "Remove from this playlist". */
  onRemoveFromCurrentPlaylist?: () => void;
  removeFromPlaylistDisabled?: boolean;
}

export default function SongInfoSidePanel({
  isOpen,
  onClose,
  contextLine,
  track,
  coverUrl,
  primaryArtist,
  albumArtist,
  emptyMessage = "Select a track to see details, lyrics, and video.",
  onRemoveFromCurrentPlaylist,
  removeFromPlaylistDisabled,
}: SongInfoSidePanelProps) {
  const [expandedTrackKey, setExpandedTrackKey] = useState<string | null>(null);
  const currentTrackKey = `${track?.id ?? ""}:${track?.title ?? ""}`;
  const lyricsExpanded = expandedTrackKey === currentTrackKey;

  const lyrics = track?.lyrics?.trim() ?? "";
  const hasTrack = track != null;
  const canAddToPlaylists = hasTrack && track.id != null;

  const lyricsPreviewClass = useMemo(
    () =>
      lyricsExpanded || lyrics.length < 180
        ? "wf-song-panel-lyrics-body"
        : "wf-song-panel-lyrics-body wf-song-panel-lyrics-body--clamped",
    [lyricsExpanded, lyrics.length]
  );

  if (!isOpen) {
    return null;
  }

  return (
    <aside className="wf-song-panel" aria-label="Now playing details">
      <div className="wf-song-panel-top">
        <h2 className="wf-song-panel-main-title mb-0">Song info</h2>
        <button type="button" className="wf-song-panel-close" onClick={onClose} aria-label="Close panel">
          ×
        </button>
      </div>

      <div className="wf-song-panel-body">
        {!hasTrack ? (
          <p className="wf-song-panel-empty mb-0">{emptyMessage}</p>
        ) : (
          <>
            <div className="wf-song-panel-art-wrap">
              {coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- remote art
                <img src={coverUrl} alt="" className="wf-song-panel-art" />
              ) : (
                <div className="wf-song-panel-art wf-song-panel-art--ph" aria-hidden>
                  ♪
                </div>
              )}
            </div>
            <h3 className="wf-song-panel-track-title">{track.title}</h3>
            <p className="wf-song-panel-artist">{primaryArtist || "Unknown artist"}</p>
            <p className="wf-song-panel-context">{contextLine}</p>

            {canAddToPlaylists ? (
              <div className="wf-song-panel-playlist-actions">
                <div className="wf-song-panel-add-column">
                  <div className="wf-song-panel-add-anchor">
                    <TrackPlaylistAddMenu
                      layout="panel"
                      trackId={track.id as number}
                      recordingMbid={track.recordingMbid}
                      title={track.title}
                      artist={primaryArtist}
                    />
                  </div>
                  {/* Reserves vertical space when the playlist menu is open so it does not cover Remove. */}
                  <div className="wf-song-panel-menu-slot" aria-hidden />
                </div>
                {onRemoveFromCurrentPlaylist ? (
                  <button
                    type="button"
                    className="wf-song-panel-remove-btn"
                    disabled={removeFromPlaylistDisabled}
                    onClick={onRemoveFromCurrentPlaylist}
                  >
                    Remove from this playlist
                  </button>
                ) : null}
              </div>
            ) : null}

            <div className="wf-song-panel-scroll">
            <section className="wf-song-panel-section" aria-labelledby="lyrics-heading">
              <div className="wf-song-panel-section-head">
                <h3 id="lyrics-heading" className="wf-song-panel-section-title">
                  LYRICS
                </h3>
                {lyrics.length > 180 ? (
                  <button
                    type="button"
                    className="wf-song-panel-text-btn"
                    onClick={() =>
                      setExpandedTrackKey((previous) =>
                        previous === currentTrackKey ? null : currentTrackKey
                      )
                    }
                  >
                    {lyricsExpanded ? "Show less" : "Show more"}
                  </button>
                ) : null}
              </div>
              {lyrics ? (
                <p className={lyricsPreviewClass}>{lyrics}</p>
              ) : (
                <p className="wf-song-panel-muted mb-0">No lyrics available for this track.</p>
              )}
            </section>

            <section className="wf-song-panel-section" aria-labelledby="yt-heading">
              <h3 id="yt-heading" className="wf-song-panel-section-title">
                ON YOUTUBE
              </h3>
              <div className="wf-song-panel-youtube">
                <TrackVideo track={track} albumArtist={albumArtist} />
              </div>
            </section>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
