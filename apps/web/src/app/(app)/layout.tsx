import { cookies } from "next/headers";
import { requireAuth } from "@lore/auth/guard";
import { AppSidebar } from "./_components/app-sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth();

  const cookieStore = await cookies();
  const initialCollapsed =
    cookieStore.get("sidebar:state")?.value !== "expanded";

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <AppSidebar initialCollapsed={initialCollapsed} />
      <main className="flex flex-1 flex-col overflow-y-auto">{children}</main>
    </div>
  );
}
