import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from ".";

export async function requireAuth() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  return session;
}

// Reads the session without redirecting — for surfaces that render for both
// guests and signed-in users (e.g. the marketing nav). Returns null when there
// is no session.
export async function getOptionalSession() {
  return auth.api.getSession({ headers: await headers() });
}
