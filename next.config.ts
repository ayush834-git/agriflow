import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["ogg-opus-decoder"],

  // Disable source maps in dev — large projects (like this one) get significant
  // memory savings since Turbopack doesn't have to hold full source map trees.
  productionBrowserSourceMaps: false,

  // Cap server action payloads — prevents accidental multi-MB form submissions.
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },

  // Surface per-route timing in the terminal so slow pages are obvious.
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
};

export default nextConfig;
