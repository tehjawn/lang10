import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next blocks dev-only resources (HMR, chunks) requested from an origin it
  // does not expect. Browsing the dev server on 127.0.0.1 rather than localhost
  // otherwise prevents the app from hydrating at all, with no error in the page.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
