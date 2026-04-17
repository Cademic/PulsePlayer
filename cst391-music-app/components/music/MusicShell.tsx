"use client";

import { usePathname } from "next/navigation";
import LeftSidebar from "@/components/music/LeftSidebar";

export default function MusicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const disableRouteTransition = pathname.startsWith("/library");

  return (
    <div className="home-wireframe">
      <div className="wf-app-shell">
        <LeftSidebar />
        <div className="wf-main-panel">
          <div
            key={pathname}
            className={disableRouteTransition ? undefined : "wf-route-transition"}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
