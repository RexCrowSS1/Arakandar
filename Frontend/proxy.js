import { NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  apiUrl,
  readCookie,
  sameOrigin,
  sessionCookies,
} from "./features/auth/session.mjs";

export async function proxy(request) {
  const isApi = request.nextUrl.pathname.startsWith("/api/");
  if (isApi && request.method !== "GET" && !sameOrigin(request))
    return NextResponse.json(
      { detail: "Request not allowed." },
      { status: 403 },
    );
  const access = readCookie(request, ACCESS_COOKIE);
  const refresh = readCookie(request, REFRESH_COOKIE);
  let session;
  try {
    if (access) {
      const check = await fetch(`${apiUrl()}/auth/me`, {
        headers: { Authorization: `Bearer ${access}` },
        cache: "no-store",
        signal: AbortSignal.timeout(20_000),
      });
      if (check.ok) return NextResponse.next();
      if (check.status !== 401 && check.status !== 403)
        throw new Error("Unavailable");
    }
    if (refresh) {
      const renewed = await fetch(`${apiUrl()}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refresh }),
        cache: "no-store",
        signal: AbortSignal.timeout(20_000),
      });
      if (renewed.ok) session = await renewed.json();
      else if (renewed.status !== 401 && renewed.status !== 403)
        throw new Error("Unavailable");
    }
  } catch {
    return isApi
      ? NextResponse.json(
          { detail: "The account service is temporarily unavailable. Please try again." },
          { status: 503 },
        )
      : NextResponse.redirect(
          new URL("/sign-in?error=unavailable", request.url),
        );
  }
  if (session?.access_token) {
    request.cookies.set(ACCESS_COOKIE, session.access_token);
    request.cookies.set(REFRESH_COOKIE, session.refresh_token);
    return sessionCookies(
      NextResponse.next({ request: { headers: request.headers } }),
      session,
    );
  }
  return sessionCookies(
    isApi
      ? NextResponse.json(
          { detail: "Sesi berakhir. Silakan masuk kembali." },
          { status: 401 },
        )
      : NextResponse.redirect(new URL("/sign-in", request.url)),
    null,
  );
}

export const config = {
  matcher: [
    "/analysis/:path*",
    "/api/conversations/:path*",
    "/api/chat/:path*",
  ],
};
