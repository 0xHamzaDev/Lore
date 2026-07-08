"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  LogOut,
  Settings,
  User,
} from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { LoreMark } from "@/components/lore-mark";
import { ROUTES } from "@lore/utils";
import { signOut, useSession } from "@/lib/auth-client";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  cn,
} from "@lore/ui";

const NAV_ITEMS = [
  {
    labelKey: "Nav.dashboard" as const,
    href: ROUTES.dashboard,
    Icon: LayoutGrid,
  },
  {
    labelKey: "Nav.settings" as const,
    href: ROUTES.settings.org,
    Icon: Settings,
  },
];

interface AppSidebarProps {
  initialCollapsed: boolean;
}

export function AppSidebar({ initialCollapsed }: AppSidebarProps) {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [, startTransition] = useTransition();

  // Cookie-driven so server render matches first paint (no flash).
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `sidebar:state=${next ? "collapsed" : "expanded"};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
  }

  async function handleSignOut() {
    await signOut();
    startTransition(() => router.push(ROUTES.signIn));
  }

  const user = session?.user;
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : (user?.email?.[0]?.toUpperCase() ?? "?");

  const widthClass = collapsed ? "w-14" : "w-60";

  return (
    <aside
      data-collapsed={collapsed}
      className={cn(
        "group/sidebar relative flex h-full shrink-0 flex-col border-e border-border-light bg-canvas transition-[width] duration-200 ease-out",
        "rtl:border-e-0 rtl:border-s",
        widthClass,
      )}
    >
      <div className="flex h-14 items-center border-b border-border-light px-3">
        <LoreMark size="sm" monogram={collapsed} />
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="flex flex-col gap-0.5">
          {NAV_ITEMS.map(({ labelKey, href, Icon }) => {
            const isActive =
              pathname === href || pathname.startsWith(href + "/");
            const label = t(labelKey);
            return (
              <li key={href}>
                <Link
                  href={href}
                  title={collapsed ? label : undefined}
                  className={cn(
                    "flex h-9 items-center gap-3 rounded-xs px-2.5 text-sm transition-colors",
                    isActive
                      ? "bg-soft-stone text-primary font-medium"
                      : "text-body-muted hover:bg-soft-stone hover:text-primary",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span
                    className={cn(
                      "truncate transition-opacity duration-150",
                      collapsed && "sr-only",
                    )}
                  >
                    {label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex flex-col gap-1 border-t border-border-light p-2">
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? t("Nav.expand") : t("Nav.collapse")}
          className="flex h-8 w-full items-center justify-center rounded-xs text-muted transition-colors hover:bg-soft-stone hover:text-primary"
        >
          {collapsed ? (
            <ChevronRight
              className="h-4 w-4 rtl:rotate-180"
              aria-hidden="true"
            />
          ) : (
            <ChevronLeft
              className="h-4 w-4 rtl:rotate-180"
              aria-hidden="true"
            />
          )}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-soft-stone focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-blue",
                collapsed ? "justify-center" : "justify-start",
              )}
              title={
                collapsed ? (user?.name ?? user?.email ?? undefined) : undefined
              }
            >
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage src={user?.image ?? undefined} />
                <AvatarFallback className="text-[11px]">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <span className="min-w-0 flex-1 truncate text-start text-ink">
                  {user?.name ?? user?.email}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-56">
            <DropdownMenuItem asChild>
              <Link href={ROUTES.settings.profile}>
                <User className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{t("Nav.profile")}</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={ROUTES.settings.org}>
                <Settings className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{t("Nav.settings")}</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-error hover:!bg-error/5 hover:!text-error focus:!bg-error/5 focus:!text-error"
            >
              <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{t("Nav.signOut")}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
