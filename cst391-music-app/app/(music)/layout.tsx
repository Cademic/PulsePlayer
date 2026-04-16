"use client";

import MusicShell from "@/components/music/MusicShell";
import { HomeSearchProvider } from "@/contexts/home-search-context";
import "@/components/music/music-app.css";
import "@/components/music/home-wireframe.css";

export default function MusicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <HomeSearchProvider>
      <MusicShell>{children}</MusicShell>
    </HomeSearchProvider>
  );
}
