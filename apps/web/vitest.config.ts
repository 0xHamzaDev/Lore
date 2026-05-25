import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

// Vitest doesn't read tsconfig `paths`, so the `@/*` → `src/*` alias used
// across the app (and in the inngest tests' vi.mock calls) is declared here.
export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
  },
});
