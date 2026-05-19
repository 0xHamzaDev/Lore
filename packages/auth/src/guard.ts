import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from ".";

export async function requireAuth() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  return session;
}
