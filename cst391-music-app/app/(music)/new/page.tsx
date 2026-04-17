"use client";

import EditAlbum from "@/components/music/EditAlbum";
import { useRouter } from "next/navigation";

export default function NewAlbumPage() {
  const router = useRouter();

  return (
    <EditAlbum
      onEditAlbum={async () => {
        router.push("/");
      }}
    />
  );
}
