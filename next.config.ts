import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  env: {
    NEXT_PUBLIC_LIFE_API_ENABLED: process.env.LIFE_API_ENABLED ?? "false",
  },
};

export default nextConfig;
