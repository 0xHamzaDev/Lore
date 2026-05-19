import { requireAuth } from "@lore/auth/guard";
import { Sidebar } from "./_components/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-y-auto bg-white">{children}</main>
    </div>
  );
}
