import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  /* config options here */
  reactStrictMode: true,

  // Suppress hydration warnings caused by browser extensions (Grammarly, password managers, etc.)
  // These extensions inject attributes like fdprocessedid, data-gr-ext-installed into DOM elements
  // This is harmless and doesn't affect functionality
  onDemandEntries: {
    // period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
};

export default nextConfig;
