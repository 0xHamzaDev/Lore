"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { ROUTES } from "@lore/utils";
import { signOut } from "@/lib/auth-client";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@lore/ui";
import { LayoutDashboard, LogOut, Menu, X } from "lucide-react";

type MarketingNavUser = {
  name: string | null;
  email: string;
  image: string | null;
};

function initialsOf(user: MarketingNavUser): string {
  return user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : (user.email[0]?.toUpperCase() ?? "?");
}

export function MarketingNav({ user }: { user: MarketingNavUser | null }) {
  const t = useTranslations("Marketing");
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    // Re-render the server layout so the nav drops back to the guest state.
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border-light bg-canvas/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link
          href={ROUTES.home}
          className="font-display text-2xl italic font-light tracking-tight text-primary"
        >
          {t("title")}
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <a
            href="#features"
            className="text-sm text-body-muted transition-colors hover:text-primary"
          >
            {t("nav.features")}
          </a>
          <a
            href="#pricing"
            className="text-sm text-body-muted transition-colors hover:text-primary"
          >
            {t("nav.pricing")}
          </a>
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={t("nav.account")}
                  className="flex items-center rounded-full p-0.5 transition-colors hover:bg-soft-stone focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-blue"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user.image ?? undefined} />
                    <AvatarFallback className="text-xs">
                      {initialsOf(user)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="truncate text-sm font-medium text-primary">
                    {user.name ?? user.email}
                  </p>
                  {user.name ? (
                    <p className="truncate text-xs text-muted">{user.email}</p>
                  ) : null}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={ROUTES.dashboard}>
                    <LayoutDashboard
                      className="h-4 w-4 shrink-0"
                      aria-hidden="true"
                    />
                    <span>{t("nav.dashboard")}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-error hover:!bg-error/5 hover:!text-error focus:!bg-error/5 focus:!text-error"
                >
                  <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{t("nav.signOut")}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link
                href={ROUTES.signIn}
                className="text-sm text-body-muted transition-colors hover:text-primary"
              >
                {t("nav.signIn")}
              </Link>
              <Link
                href={ROUTES.signUp}
                className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2 text-sm font-medium text-canvas transition-colors hover:bg-primary/90"
              >
                {t("nav.getStarted")}
              </Link>
            </>
          )}
        </div>

        <button
          className="flex items-center justify-center rounded-xs p-2 text-body-muted transition-colors hover:text-primary md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-border-light bg-canvas px-6 py-4 md:hidden">
          <nav className="flex flex-col gap-4">
            <a
              href="#features"
              className="text-sm text-body-muted"
              onClick={() => setOpen(false)}
            >
              {t("nav.features")}
            </a>
            <a
              href="#pricing"
              className="text-sm text-body-muted"
              onClick={() => setOpen(false)}
            >
              {t("nav.pricing")}
            </a>
            <hr className="border-border-light" />
            {user ? (
              <>
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={user.image ?? undefined} />
                    <AvatarFallback className="text-xs">
                      {initialsOf(user)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-primary">
                      {user.name ?? user.email}
                    </p>
                    {user.name ? (
                      <p className="truncate text-xs text-muted">
                        {user.email}
                      </p>
                    ) : null}
                  </div>
                </div>
                <Link
                  href={ROUTES.dashboard}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-canvas"
                  onClick={() => setOpen(false)}
                >
                  <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                  {t("nav.dashboard")}
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    void handleSignOut();
                  }}
                  className="inline-flex items-center gap-2 text-start text-sm text-error"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  {t("nav.signOut")}
                </button>
              </>
            ) : (
              <>
                <Link href={ROUTES.signIn} className="text-sm text-body-muted">
                  {t("nav.signIn")}
                </Link>
                <Link
                  href={ROUTES.signUp}
                  className="inline-flex w-full items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-canvas"
                >
                  {t("nav.getStarted")}
                </Link>
              </>
            )}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
