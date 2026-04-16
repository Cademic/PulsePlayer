import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Keep pg native module out of server bundles where possible */
  serverExternalPackages: ["pg"],
};

export default nextConfig;
