import { auth } from "@lore/auth";
import { routing } from "./src/i18n/routing";
import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";

const intlMiddleware = createMiddleware(routing);

const AUTH_ROUTES = ["/sign-in", "/sign-up"];
const APP_ROUTES = ["/dashboard", "/projects", "/settings"];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const pathnameWithoutLocale = pathname.replace(/^\/(ar|en)/, "") || "/";

  const isAuthRoute = AUTH_ROUTES.some((r) => pathnameWithoutLocale.startsWith(r));
  const isAppRoute = APP_ROUTES.some((r) => pathnameWithoutLocale.startsWith(r));

  if (isAppRoute || isAuthRoute) {
    const session = await auth.api.getSession({ headers: request.headers });

    if (isAppRoute && !session) {
      const locale = pathname.match(/^\/(ar|en)/)?.[1] ?? "ar";
      return NextResponse.redirect(new URL(`/${locale}/sign-in`, request.url));
    }

    if (isAuthRoute && session) {
      const locale = pathname.match(/^\/(ar|en)/)?.[1] ?? "ar";
      return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
