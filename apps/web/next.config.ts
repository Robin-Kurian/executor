import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const allowedDevOrigin = process.env.NEXT_ALLOWED_DEV_ORIGIN?.trim();

const nextConfig: NextConfig = {
  transpilePackages: ["@executor/domain"],
  allowedDevOrigins: allowedDevOrigin ? [allowedDevOrigin] : undefined,
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;

initOpenNextCloudflareForDev();
