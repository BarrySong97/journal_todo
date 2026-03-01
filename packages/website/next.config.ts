import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  transpilePackages: ["@journal-todo/ui", "@journal-todo/web", "@journal-todo/shared"],
  serverExternalPackages: ["zustand"],
};

export default nextConfig;
