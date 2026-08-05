import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  // output: export is needed for Electron (static build), but breaks API routes.
  // In dev we skip it so the dev server works normally.
  ...(isDev ? {} : { output: "export" }),
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // El browser source de OBS cachea fuerte: que el live nunca se guarde
  async headers() {
    return [
      {
        source: "/overlay/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, no-cache, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
