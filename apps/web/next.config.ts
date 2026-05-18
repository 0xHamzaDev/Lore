import type { NextConfig } from "next";
import "./src/env";

const nextConfig: NextConfig = {
  transpilePackages: ["@lore/ui"],
};

export default nextConfig;
