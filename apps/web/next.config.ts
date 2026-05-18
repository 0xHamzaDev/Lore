import type { NextConfig } from "next";
import "./src/env";

const nextConfig: NextConfig = {
  transpilePackages: ["@lore/ui", "@lore/ai", "@lore/validators"],
};

export default nextConfig;
