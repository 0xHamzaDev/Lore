import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    ANTHROPIC_API_KEY: z.string().min(1),
  },
  client: {},
  runtimeEnv: {
    DATABASE_URL: process.env["DATABASE_URL"],
    ANTHROPIC_API_KEY: process.env["ANTHROPIC_API_KEY"],
  },
});
