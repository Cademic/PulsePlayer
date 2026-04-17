"use client";

import type { Track } from "@/lib/types";
import AddTrackToPlaylistButton from "./AddTrackToPlaylistButton";

interface TrackTitleProps {
  track: Track;
  isSelected: boolean;
  onSelect: (track: Track) => void;
}

export default function TrackTitle({
  track,
  isSelected,
  onSelect,
}: TrackTitleProps) {
  const handleClick = () => {
    onSelect(track);
  };

  return (
    <div
      className={`list-group-item d-flex align-items-center justify-content-between gap-2 ${
        isSelected ? "active" : ""
      }`}
    >
      <button
        type="button"
        className={`flex-grow-1 text-start border-0 bg-transparent p-0 ${
          isSelected ? "text-white" : ""
        }`}
        onClick={handleClick}
      >
        {track.number != null ? `${track.number}. ` : ""}
        {track.title ?? "Untitled track"}
      </button>
      <AddTrackToPlaylistButton trackId={track.id} />
    </div>
  );
}
