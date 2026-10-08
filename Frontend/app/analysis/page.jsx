import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import WebsitePageUI from "../../features/website-page-ui/WebsitePageUI";
import { ACCESS_COOKIE, apiUrl } from "../../features/auth/session.mjs";

export const metadata = { title: "AI Analysis — Arakan Ndar" };

export default async function AnalysisPage() {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) redirect("/sign-in");
  let response;
  try {
    response = await fetch(`${apiUrl()}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    redirect("/sign-in?error=unavailable");
  }
  if (!response.ok)
    redirect(
      response.status === 401 ? "/sign-in" : "/sign-in?error=unavailable",
    );
  const { user } = await response.json();
  return <WebsitePageUI initialUser={user} />;
}
