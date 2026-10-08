import {
  apiUrl,
  authHeaders,
  readCookie,
  REFRESH_COOKIE,
  sameOrigin,
  sessionCookies,
} from "../../../../features/auth/session.mjs";

export const runtime = "nodejs";

export async function POST(request, { params }) {
  const { action } = await params;
  if (!["sign-in", "sign-up", "sign-out", "refresh"].includes(action))
    return Response.json({ detail: "Not found." }, { status: 404 });
  if (!sameOrigin(request))
    return Response.json({ detail: "Request not allowed." }, { status: 403 });
  let payload = {};
  if (["sign-in", "sign-up"].includes(action)) {
    const text = await request.text();
    if (text.length > 4096)
      return Response.json(
        { detail: "Data terlalu panjang." },
        { status: 413 },
      );
    try {
      payload = JSON.parse(text);
    } catch {
      return Response.json({ detail: "Invalid data format." }, { status: 400 });
    }
  }
  if (action === "refresh")
    payload = { refresh_token: readCookie(request, REFRESH_COOKIE) };
  try {
    const headers = authHeaders(request);
    // A user can click Sign out after the short-lived access cookie expires.
    // Renew first so Supabase can revoke the refresh session as well.
    if (action === "sign-out" && !headers.Authorization) {
      const refreshToken = readCookie(request, REFRESH_COOKIE);
      if (!refreshToken)
        return sessionCookies(Response.json({ ok: true }), null);
      const renewed = await fetch(`${apiUrl()}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
        cache: "no-store",
        signal: AbortSignal.timeout(20_000),
      });
      if (renewed.status === 401 || renewed.status === 403)
        return sessionCookies(Response.json({ ok: true }), null);
      if (!renewed.ok) throw new Error("Session service unavailable");
      const session = await renewed.json();
      headers.Authorization = `Bearer ${session.access_token}`;
    }
    const upstream = await fetch(`${apiUrl()}/auth/${action}`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    const data = await upstream.json();
    if (action === "sign-out" && (upstream.ok || upstream.status === 401))
      return sessionCookies(Response.json({ ok: true }), null);
    if (!upstream.ok)
      return Response.json(
        {
          detail:
            typeof data.detail === "string"
              ? data.detail
              : "Check your details. Names must be at least 2 characters and passwords at least 8 characters.",
        },
        { status: upstream.status, headers: { "Cache-Control": "no-store" } },
      );
    const response = Response.json(
      {
        user: data.user,
        requires_confirmation: Boolean(data.requires_confirmation),
      },
      { status: upstream.status, headers: { "Cache-Control": "no-store" } },
    );
    return data.access_token ? sessionCookies(response, data) : response;
  } catch {
    return Response.json(
      { detail: "Could not reach the account service. Please try again." },
      { status: 503 },
    );
  }
}
