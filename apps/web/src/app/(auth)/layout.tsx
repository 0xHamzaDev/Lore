import { LocaleSwitcher } from "@/components/locale-switcher";
import { LoreMark } from "@/components/lore-mark";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <LoreMark size="md" />
        <LocaleSwitcher />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-10 pt-2">
        <div className="w-full max-w-[440px]">{children}</div>
      </main>

      <footer className="px-6 py-6 text-center sm:px-10">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted">© 2026 Lore</p>
      </footer>
    </div>
  );
}
