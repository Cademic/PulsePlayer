"use client";

import EditPlaylistModal from "@/components/music/EditPlaylistModal";
import { useParams, useRouter } from "next/navigation";

export default function EditPlaylistPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params.id;
  const playlistId = typeof rawId === "string" ? rawId : "";

  if (!playlistId) {
    return null;
  }

  return <EditPlaylistModal playlistId={playlistId} onClose={() => router.push(`/library/${playlistId}`)} />;
}
