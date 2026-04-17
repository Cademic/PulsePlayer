"use client";

import { useEffect } from "react";

/** Loads Bootstrap JS for navbar collapse and other interactive components. */
export default function BootstrapClient() {
  useEffect(() => {
    // @ts-expect-error — bootstrap bundle has no TS declarations
    void import("bootstrap/dist/js/bootstrap.bundle.min.js");
  }, []);
  return null;
}
