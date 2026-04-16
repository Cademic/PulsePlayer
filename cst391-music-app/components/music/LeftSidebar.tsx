"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { fetchMyPlaylists } from "@/lib/playlist-api";
import type { PlaylistSummary } from "@/lib/types";

export default function LeftSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { status, data: session } = useSession();
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);

  useEffect(() => {
    if (status !== "authenticated") {
      setPlaylists([]);
      return;
    }

    let cancelled = false;
    void fetchMyPlaylists()
      .then((data) => {
        if (!cancelled) {
          setPlaylists(data.slice(0, 4));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPlaylists([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [status]);

  const isAdmin = session?.user?.role === "admin";
  const navItems = useMemo(
    () => [
      { href: "/", label: "Home" },
      { href: "/library", label: "Library" },
      { href: "/discover", label: "Discover" },
    ],
    []
  );

  function handleSearchClick() {
    const windowWithRegistry = window as Window & {
      __wfUniversalSearchCount?: number;
    };
    const hasUniversalSearch = (windowWithRegistry.__wfUniversalSearchCount ?? 0) > 0;
    if (hasUniversalSearch) {
      window.dispatchEvent(new Event("wf-open-universal-search"));
      return;
    }
    router.push("/?openUniversalSearch=1");
  }

  return (
    <aside className="wf-left-rail" aria-label="Sidebar navigation">
      <div className="wf-brand">
        {/* eslint-disable-next-line @next/next/no-img-element -- static logo in public */}
        <img src="/pulse-player-logo.png" alt="PulsePlayer" className="wf-brand-logo" />
      </div>

      <nav className="wf-left-nav">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`wf-left-item text-decoration-none ${
              item.label === "Home" && pathname === "/"
                ? "wf-left-item--active"
                : item.label === "Library" && pathname.startsWith("/library")
                  ? "wf-left-item--active"
                : item.label === "Discover" && pathname.startsWith("/discover")
                  ? "wf-left-item--active"
                  : ""
            }`}
          >
            {item.label}
          </Link>
        ))}
        <button type="button" className="wf-left-item" onClick={handleSearchClick}>
          Search
        </button>
        {isAdmin ? (
          <Link
            href="/admin/playlists"
            className={`wf-left-item text-decoration-none ${
              pathname.startsWith("/admin") ? "wf-left-item--active" : ""
            }`}
          >
            Admin
          </Link>
        ) : null}
      </nav>

      <div className="wf-left-playlists">
        <p className="wf-left-title">Playlists</p>
        {status !== "authenticated" ? (
          <Link href="/auth/signin?callbackUrl=/library" className="wf-left-playlist-link">
            Sign in to view
          </Link>
        ) : playlists.length === 0 ? (
          <Link href="/library/create" className="wf-left-playlist-link">
            Create your first playlist
          </Link>
        ) : (
          playlists.map((playlist) => (
            <Link
              key={playlist.id}
              href={`/library/${playlist.id}`}
              className="wf-left-playlist-link"
            >
              {playlist.name}
            </Link>
          ))
        )}
      </div>
    </aside>
  );
}
