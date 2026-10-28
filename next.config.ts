import type { NextConfig } from "next";

// Two build targets are supported:
// - default        -> full-stack app served by Next.js with a local PostgreSQL database
// - STATIC=local   -> fully static export (out/) for GitHub Pages, data lives in the browser
const isStatic = process.env.NEXT_PUBLIC_STORAGE === "local";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(isStatic ? { output: "export", trailingSlash: true, images: { unoptimized: true } } : {}),
  ...(basePath ? { basePath } : {}),
};

export default nextConfig;
