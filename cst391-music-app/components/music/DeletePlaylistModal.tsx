"use client";

interface DeletePlaylistModalProps {
  playlistName: string;
  onCancel: () => void;
  onConfirm: () => void;
  isDeleting?: boolean;
  error?: string | null;
}

export default function DeletePlaylistModal({
  playlistName,
  onCancel,
  onConfirm,
  isDeleting = false,
  error = null,
}: DeletePlaylistModalProps) {
  return (
    <div className="wf-route-page wf-modal-route-page">
      <div className="container p-4 wf-page-shell wf-modal-route-shell" style={{ maxWidth: 560 }}>
        <div className="wf-route-card p-4 wf-modal-route-card">
          <div className="wf-route-hero">
            <h1 className="h3 mb-1">Delete playlist</h1>
            <p className="mb-0">
              Delete <strong>{playlistName}</strong>? This action cannot be undone.
            </p>
          </div>
          {error ? (
            <div className="alert alert-danger mt-3 mb-0" role="alert">
              {error}
            </div>
          ) : null}
          <div className="d-flex gap-2 mt-3">
            <button
              type="button"
              className="btn btn-outline-secondary wf-route-btn"
              onClick={onCancel}
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger wf-route-btn"
              onClick={onConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
