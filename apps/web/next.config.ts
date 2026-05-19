import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  transpilePackages: [
    "@lore/ui",
    "@lore/ai",
    "@lore/validators",
    "@lore/auth",
    "@lore/utils",
    "@lore/db",
  ],
};

export default withNextIntl(nextConfig);
