import AuthPage from "../../features/auth/AuthPage";

export const metadata = { title: "Sign in — Arakan Ndar" };

export default async function SignInPage({ searchParams }) {
  const params = await searchParams;
  return <AuthPage unavailable={params.error === "unavailable"} />;
}
