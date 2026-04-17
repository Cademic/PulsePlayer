"use client";

import { useEffect, useState } from "react";
import type { FeaturedSongDto } from "@/lib/theaudiodb-search-map";

export function useFeaturedSongs(options?: { limit?: number }) {
  const limit = options?.limit;
  const [items, setItems] = useState<FeaturedSongDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const url =
      limit != null
        ? `/api/music/featured-songs?limit=${limit}`
        : "/api/music/featured-songs";

    void (async () => {
      try {
        const res = await fetch(url, { cache: "no-store" });
        const json: unknown = await res.json();
        if (cancelled) {
          return;
        }
        if (
          !res.ok ||
          typeof json !== "object" ||
          json === null ||
          !Array.isArray((json as { items?: unknown }).items)
        ) {
          setItems([]);
          setError("Featured songs could not load from TheAudioDB.");
          return;
        }
        setItems((json as { items: FeaturedSongDto[] }).items);
        setError(null);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setItems([]);
          setError("Featured songs could not load from TheAudioDB.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [limit]);

  return { items, loading, error };
}
