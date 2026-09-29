import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Los paquetes del monorepo exportan TypeScript sin compilar.
  transpilePackages: ["@helpyme/shared"],
  poweredByHeader: false,
};

export default nextConfig;
