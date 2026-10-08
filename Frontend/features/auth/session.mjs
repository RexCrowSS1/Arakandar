export const ACCESS_COOKIE = "bp-access";
export const REFRESH_COOKIE = "bp-refresh";

export const apiUrl = () =>
  (process.env.API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

export function readCookie(request, name) {
  return (
    (request.headers.get("cookie") || "")
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${name}=`))
      ?.slice(name.length + 1) || ""
  );
}

export function sessionCookies(response, session) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  for (const [name, value, age] of [
    [ACCESS_COOKIE, session?.access_token, session?.expires_in],
    [REFRESH_COOKIE, session?.refresh_token, 60 * 60 * 24 * 7],
  ]) {
    response.headers.append(
      "Set-Cookie",
      `${name}=${value || ""}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${value ? age : 0}${secure}`,
    );
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export function sameOrigin(request) {
  const origin = request.headers.get("origin");
  return (
    (!origin || origin === new URL(request.url).origin) &&
    request.headers.get("sec-fetch-site") !== "cross-site"
  );
}

export function authHeaders(request) {
  const token = readCookie(request, ACCESS_COOKIE);
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
