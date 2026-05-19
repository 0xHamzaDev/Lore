"use client";
import { useTranslations } from "next-intl";
import { usePathname, Link, useRouter } from "@/i18n/navigation";
import { signOut, useSession } from "@/lib/auth-client";
import { ROUTES } from "@lore/utils";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Separator,
} from "@lore/ui";
import { cn } from "@lore/ui";
import { LayoutGrid, Users, ChevronDown, LogOut, Settings } from "lucide-react";
import { LocaleSwitcher } from "./locale-switcher";

const NAV = [
  { labelKey: "Nav.dashboard" as const, href: ROUTES.dashboard, Icon: LayoutGrid },
  { labelKey: "Nav.org" as const, href: ROUTES.settings.org, Icon: Users },
];

export function Sidebar() {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const user = session?.user;
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : (user?.email?.[0]?.toUpperCase() ?? "?");

  async function handleSignOut() {
    await signOut();
    router.push(ROUTES.signIn);
  }

  return (
    <aside className="flex h-full w-60 flex-col border-e border-[#e5e7eb] bg-white rtl:border-e-0 rtl:border-s">
      <div className="flex h-14 items-center gap-2 border-b border-[#e5e7eb] px-4">
        <span className="text-lg font-semibold tracking-tight text-[#17171c]">Lore</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="space-y-0.5">
          {NAV.map(({ labelKey, href, Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + "/");
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-2 rounded-sm px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-[#eeece7] text-[#17171c] font-medium"
                      : "text-[#616161] hover:bg-[#eeece7] hover:text-[#17171c]",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {t(labelKey)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <Separator />

      <div className="flex items-center justify-between px-3 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-sm px-1 py-1 text-sm hover:bg-[#eeece7] transition-colors">
              <Avatar className="h-6 w-6">
                <AvatarImage src={user?.image ?? undefined} />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <span className="max-w-[110px] truncate text-[#212121]">
                {user?.name ?? user?.email}
              </span>
              <ChevronDown className="h-3 w-3 text-[#93939f]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-48">
            <DropdownMenuItem asChild>
              <Link href={ROUTES.settings.org} className="cursor-pointer">
                <Settings className="me-2 h-4 w-4" />
                {t("Nav.settings")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-[#b30000]">
              <LogOut className="me-2 h-4 w-4" />
              {t("Auth.signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <LocaleSwitcher />
      </div>
    </aside>
  );
}
