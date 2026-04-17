"use client";

import OneAlbum from "@/components/music/OneAlbum";
import { fetchAlbumSingle } from "@/components/music/music-api";
import type { Album } from "@/lib/types";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function AlbumDetailPage() {
  const params = useParams();
  const raw = params.id;
  const segment = typeof raw === "string" ? raw : "";
  const [album, setAlbum] = useState<Album | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!segment) {
      setAlbum(null);
      setIsLoading(false);
      setError("Missing album id.");
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    void (async () => {
      try {
        const isNumericSegment = /^\d+$/.test(segment);
        let data: Awaited<ReturnType<typeof fetchAlbumSingle>>;
        if (isNumericSegment) {
          const idNum = Number.parseInt(segment, 10);
          try {
            data = await fetchAlbumSingle({ id: idNum });
          } catch {
            data = await fetchAlbumSingle({ audioDbAlbumId: segment });
          }
        } else {
          throw new Error("Invalid album id.");
        }
        if (!cancelled) {
          setAlbum(data);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setAlbum(null);
          setError(e instanceof Error ? e.message : "Failed to load album.");
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
  }, [segment]);

  if (isLoading) {
    return (
      <div className="wf-route-page">
        <div className="container p-4 wf-page-shell">
          <p className="wf-loading-dots">Loading</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="wf-route-page">
        <div className="container p-4 wf-page-shell">
          <p className="text-danger">{error}</p>
        </div>
      </div>
    );
  }

  return <OneAlbum key={segment} album={album} />;
}
