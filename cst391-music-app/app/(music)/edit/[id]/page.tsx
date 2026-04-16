"use client";

import EditAlbum from "@/components/music/EditAlbum";
import { fetchAlbumSingle } from "@/components/music/music-api";
import type { Album } from "@/lib/types";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function EditAlbumContent() {
  const params = useParams();
  const raw = params.id;
  const id = typeof raw === "string" ? Number(raw) : NaN;
  const router = useRouter();
  const [album, setAlbum] = useState<Album | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (Number.isNaN(id)) {
      setAlbum(null);
      setIsLoading(false);
      setError("Invalid album id.");
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    void (async () => {
      try {
        const data = await fetchAlbumSingle({ id });
        if (!cancelled) {
          setAlbum(data);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setAlbum(null);
          setError(e instanceof Error ? e.message : "Album not found.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (isLoading) {
    return (
      <div className="wf-route-page">
        <div className="container p-4 wf-page-shell">
          <p className="wf-loading-dots">Loading</p>
        </div>
      </div>
    );
  }

  if (error || !album) {
    return (
      <div className="wf-route-page">
        <div className="container p-4 wf-page-shell">
          <p>{error ?? "Album not found."}</p>
        </div>
      </div>
    );
  }

  return (
    <EditAlbum
      album={album}
      onEditAlbum={async () => {
        router.push("/");
      }}
    />
  );
}

export default function EditAlbumPage() {
  return <EditAlbumContent />;
}
