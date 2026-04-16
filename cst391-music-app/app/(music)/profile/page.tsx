"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function ProfilePage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="wf-route-page">
        <div className="container py-5 wf-page-shell">
          <p className="wf-loading-dots">Loading</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="wf-route-page">
        <div className="container py-5 wf-page-shell" style={{ maxWidth: 560 }}>
          <div className="wf-route-card p-4">
            <h1 className="h4 mb-3">Profile</h1>
            <p className="text-muted">Sign in to view your profile.</p>
            <Link className="btn btn-primary wf-route-btn" href="/auth/signin?callbackUrl=/profile">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wf-route-page">
      <div className="container py-5 wf-page-shell" style={{ maxWidth: 560 }}>
        <div className="wf-route-hero">
          <h1 className="h4 mb-0">Profile</h1>
        </div>
        <div className="wf-route-card p-4">
          <p className="mb-1">
            <strong>Name:</strong> {session?.user?.name ?? "-"}
          </p>
          <p className="mb-1">
            <strong>Email:</strong> {session?.user?.email ?? "-"}
          </p>
          <p className="mb-4">
            <strong>Role:</strong> {session?.user?.role ?? "-"}
          </p>
          <div className="d-flex gap-2 flex-wrap">
            <Link className="btn btn-outline-primary wf-route-btn" href="/library">
              My playlists
            </Link>
            <button
              type="button"
              className="btn btn-outline-secondary wf-route-btn"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              Sign out
            </button>
          </div>
          <p className="mt-4 mb-0">
            <Link href="/">← Home</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
