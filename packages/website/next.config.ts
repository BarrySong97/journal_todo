import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@journal-todo/ui", "@journal-todo/web", "@journal-todo/shared"],
  serverExternalPackages: ["zustand"],
};

export default nextConfig;
