import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: { root: __dirname },
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
};

export default nextConfig;
