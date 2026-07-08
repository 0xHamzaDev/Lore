import { type NextRequest, NextResponse } from "next/server";

const LOCALES = ["ar", "en"] as const;
const DEFAULT_LOCALE = "ar";

function detectLocale(request: NextRequest): string {
  const cookie = request.cookies.get("NEXT_LOCALE")?.value;
  if (cookie && (LOCALES as readonly string[]).includes(cookie)) return cookie;
  const acceptLang = request.headers.get("accept-language") ?? "";
  if (acceptLang.toLowerCase().startsWith("en")) return "en";
  return DEFAULT_LOCALE;
}

// Better Auth session-cookie names. We check presence in middleware for a fast redirect; the actual
// session is still validated inside Server Components / Server Actions via requireAuth().
const SESSION_COOKIE_NAMES = [
  "better-auth.session_token",
  "__Secure-better-auth.session_token",
];

function hasSessionCookie(request: NextRequest): boolean {
  return SESSION_COOKIE_NAMES.some((name) =>
    Boolean(request.cookies.get(name)?.value),
  );
}

const AUTH_ROUTES = ["/sign-in", "/sign-up"];
const APP_ROUTES = ["/dashboard", "/projects", "/settings"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAuthRoute = AUTH_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + "/"),
  );
  const isAppRoute = APP_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + "/"),
  );

  if (isAppRoute || isAuthRoute) {
    const signedIn = hasSessionCookie(request);
    if (isAppRoute && !signedIn) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }
    if (isAuthRoute && signedIn) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  const locale = detectLocale(request);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-next-intl-locale", locale);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.cookies.set("NEXT_LOCALE", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
