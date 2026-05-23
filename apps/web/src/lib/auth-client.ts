import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  // Use the current origin in the browser so dev works on any port; fall back to env in SSR/tests.
  baseURL:
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000"),
  plugins: [organizationClient()],
});

export const { signIn, signUp, signOut, useSession, organization } = authClient;
