import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.string().url(),
    RESEND_API_KEY: z.string().min(1),
    LIVEBLOCKS_SECRET_KEY: z.string(),
    API_GATEWAY_URL: z.string().url(),
    API_GATEWAY_SECRET: z.string().min(16),
    MOYASAR_WEBHOOK_SECRET: z.string().min(16).optional(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env["DATABASE_URL"],
    BETTER_AUTH_SECRET: process.env["BETTER_AUTH_SECRET"],
    BETTER_AUTH_URL: process.env["BETTER_AUTH_URL"],
    RESEND_API_KEY: process.env["RESEND_API_KEY"],
    NEXT_PUBLIC_APP_URL: process.env["NEXT_PUBLIC_APP_URL"],
    LIVEBLOCKS_SECRET_KEY: process.env["LIVEBLOCKS_SECRET_KEY"],
    API_GATEWAY_URL: process.env["API_GATEWAY_URL"],
    API_GATEWAY_SECRET: process.env["API_GATEWAY_SECRET"],
    MOYASAR_WEBHOOK_SECRET: process.env["MOYASAR_WEBHOOK_SECRET"],
  },
  skipValidation: !!process.env["SKIP_ENV_VALIDATION"],
});
