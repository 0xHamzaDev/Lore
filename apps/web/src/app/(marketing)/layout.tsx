import { getOptionalSession } from "@lore/auth/guard";
import { MarketingNav } from "./_components/marketing-nav";
import { MarketingFooter } from "./_components/marketing-footer";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Read the session server-side so the nav renders the correct state in the
  // initial HTML — signed-in visitors see their account menu with no flash of
  // the guest "Sign in / Get started" buttons.
  const session = await getOptionalSession();
  const user = session?.user
    ? {
        name: session.user.name ?? null,
        email: session.user.email,
        image: session.user.image ?? null,
      }
    : null;

  return (
    <>
      <MarketingNav user={user} />
      {children}
      <MarketingFooter />
    </>
  );
}
