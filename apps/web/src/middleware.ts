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

const APP_ROUTES = ["/dashboard", "/projects", "/settings"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAuthRoute = AUTH_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + "/"),
  );
  const isAppRoute = APP_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + "/"),
  );

  // Only the unauthenticated guard lives here, and it keys off cookie
  // *presence* for speed. We deliberately do NOT redirect a cookie-bearing
  // user off /sign-in to /dashboard: the middleware can't tell a valid cookie
  // from a stale/expired one, but the server can (requireAuth validates and
  // redirects invalid sessions to /sign-in). Bouncing here on presence created
  // an infinite loop — /sign-in → /dashboard → requireAuth invalid → /sign-in.
  // An already-signed-in user visiting /sign-in just sees the form; harmless.
  if (isAppRoute && !hasSessionCookie(request)) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
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
