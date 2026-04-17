"use client";

import type { ReactNode } from "react";

export interface CollectionTrackRow {
  rowKey: string;
  index: number;
  title: string;
  artist: string;
  thumbUrl?: string | null;
  durationLabel?: string | null;
  menu?: ReactNode;
}

interface CollectionTrackTableProps {
  rows: CollectionTrackRow[];
  selectedRowKey: string | null;
  onRowSelect: (row: CollectionTrackRow) => void;
  /** Shown when `durationLabel` is empty (default "—"). Pass "" on album pages to hide the placeholder. */
  emptyDurationDisplay?: string;
}

export default function CollectionTrackTable({
  rows,
  selectedRowKey,
  onRowSelect,
  emptyDurationDisplay = "—",
}: CollectionTrackTableProps) {
  return (
    <div className="wf-collection-track-wrap">
      <div className="wf-collection-track-head" role="row">
        <span className="wf-collection-track-col wf-collection-track-col--idx">#</span>
        <span className="wf-collection-track-col wf-collection-track-col--title">TITLE</span>
        <span className="wf-collection-track-col wf-collection-track-col--artist">ARTIST</span>
        <span className="wf-collection-track-col wf-collection-track-col--dur" aria-label="Duration">
          <span className="wf-collection-track-clock" aria-hidden>
            🕐
          </span>
        </span>
        <span className="wf-collection-track-col wf-collection-track-col--menu" aria-hidden />
      </div>
      <ul className="wf-collection-track-list list-unstyled mb-0" role="list">
        {rows.map((row) => {
          const isActive = row.rowKey === selectedRowKey;
          return (
            <li
              key={row.rowKey}
              id={`album-track-${row.rowKey}`}
              className="wf-collection-track-li"
              role="listitem"
            >
              <div className={`wf-collection-track-row${isActive ? " is-active" : ""}`}>
                <button
                  type="button"
                  className="wf-collection-track-main"
                  onClick={() => onRowSelect(row)}
                >
                  <span className="wf-collection-track-col wf-collection-track-col--idx">
                    <span className="wf-collection-track-idx-num">{row.index}</span>
                  </span>
                  <span className="wf-collection-track-col wf-collection-track-col--title">
                    <span className="wf-collection-track-title-stack">
                      {row.thumbUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- remote art
                        <img src={row.thumbUrl} alt="" className="wf-collection-track-thumb" />
                      ) : (
                        <span className="wf-collection-track-thumb wf-collection-track-thumb--ph" />
                      )}
                      <span className="wf-collection-track-title-text">
                        <span className="wf-collection-track-song">{row.title}</span>
                        <span className="wf-collection-track-sub d-md-none">{row.artist}</span>
                      </span>
                    </span>
                  </span>
                  <span className="wf-collection-track-col wf-collection-track-col--artist d-none d-md-inline">
                    {row.artist}
                  </span>
                  <span className="wf-collection-track-col wf-collection-track-col--dur d-none d-sm-inline">
                    {row.durationLabel?.trim() ? row.durationLabel : emptyDurationDisplay}
                  </span>
                </button>
                <div className="wf-collection-track-col wf-collection-track-col--menu">{row.menu}</div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
