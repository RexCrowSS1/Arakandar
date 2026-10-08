"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./auth.module.css";

export default function AuthPage({ mode = "sign-in", unavailable = false }) {
  const router = useRouter();
  const signup = mode === "sign-up";
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(
    unavailable
      ? "The account service is temporarily unavailable. Please try again shortly."
      : "",
  );
  const [confirmation, setConfirmation] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    const password = form.get("password");
    setError("");
    if (signup && password !== form.get("confirmPassword")) {
      setError("The passwords do not match.");
      return;
    }
    setPending(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password,
          ...(signup ? { name: form.get("name") } : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.detail || "The request failed. Please try again.");
      if (data.requires_confirmation) setConfirmation(true);
      else {
        router.replace("/analysis");
        router.refresh();
      }
    } catch (failure) {
      setError(
        failure.message === "Failed to fetch"
          ? "Connection lost. Please try again."
          : failure.message,
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.story} aria-label="Arakan Ndar">
        <Link href="/" className={styles.brand}>
          <span className={styles.brandMark}>
            A<span>↗</span>
          </span>
          <span>
            ARAKAN NDAR<small>MARKET INTELLIGENCE</small>
          </span>
        </Link>
        <div className={styles.storyBody}>
          <div className={styles.eyebrow}>
            <span className={styles.dot} /> YOUR NEXT MOVE STARTS HERE
          </div>
          <h1>
            Read the market.
            <br />
            Find perspective.
            <br />
            <em>Make your move.</em>
          </h1>
          <p>
            An analysis workspace for Indonesian investors. Bring market data,
            technical charts, and AI insights together in one terminal.
          </p>
          <div className={styles.chart} aria-hidden="true">
            <div className={styles.chartHeading}>
              <span>ARAKAN / MARKET PERSPECTIVE</span>
              <span>AI ASSISTED ↗</span>
            </div>
            <svg viewBox="0 0 520 150" fill="none">
              <defs>
                <linearGradient id="auth-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop stopColor="#e58a3a" stopOpacity=".2" />
                  <stop offset="1" stopColor="#e58a3a" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0 125L28 118L48 126L73 93L98 103L125 88L148 96L175 66L194 74L223 61L248 84L268 70L292 79L320 45L346 55L372 27L395 39L420 18L442 29L468 14L492 25L520 6V150H0Z"
                fill="url(#auth-fill)"
              />
              <path
                d="M0 125L28 118L48 126L73 93L98 103L125 88L148 96L175 66L194 74L223 61L248 84L268 70L292 79L320 45L346 55L372 27L395 39L420 18L442 29L468 14L492 25L520 6"
                stroke="#e58a3a"
                strokeWidth="2"
              />
            </svg>
            <div className={styles.chartCaption}>
              <span>MARKET DATA</span>
              <span>TECHNICAL ANALYSIS</span>
              <span>AI ASSISTANT</span>
            </div>
          </div>
        </div>
        <div className={styles.storyFooter}>
          <span>BUILT FOR THE INDONESIAN MARKET</span>
          <span>01 / 03</span>
        </div>
      </section>
      <section className={styles.formPanel}>
        <div className={styles.topNav}>
          <Link href="/">← Back to home</Link>
          <span>TERMINAL ACCESS</span>
        </div>
        <div className={styles.formWrap}>
          <div className={styles.step}>
            LANDING <span>/</span>{" "}
            <strong>{signup ? "SIGN UP" : "SIGN IN"}</strong> <span>/</span> AI
            ANALYSIS
          </div>
          <div className={styles.tabs}>
            <Link href="/sign-in" aria-current={!signup ? "page" : undefined}>
              Sign in
            </Link>
            <Link href="/sign-up" aria-current={signup ? "page" : undefined}>
              Sign up
            </Link>
          </div>
          <div className={styles.kicker}>
            {signup ? "GET STARTED" : "WELCOME BACK"}
          </div>
          <h2>
            {signup ? "One account. More perspectives." : "Back to the market."}
          </h2>
          <p className={styles.intro}>
            {signup
              ? "Create an account to start analyzing and save your conversations."
              : "Sign in to continue your analysis and access your conversation history."}
          </p>
          {confirmation ? (
            <div className={styles.success} role="status">
              <span>✓</span>
              <h3>Check your email</h3>
              <p>
                If the email can be registered, a verification link will be
                sent. Follow the link, then sign in to your account.
              </p>
              <Link href="/sign-in" className={styles.primary}>
                Continue to sign in →
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className={styles.form}>
              {signup && (
                <label htmlFor="name">
                  FULL NAME
                  <input
                    id="name"
                    name="name"
                    autoComplete="name"
                    placeholder="Your name"
                    required
                    minLength={2}
                    maxLength={100}
                    disabled={pending}
                  />
                </label>
              )}
              <label htmlFor="email">
                {signup ? "EMAIL ADDRESS" : "EMAIL OR ADMIN USERNAME"}
                <input
                  id="email"
                  name="email"
                  type={signup ? "email" : "text"}
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder={
                    signup ? "name@email.com" : "name@email.com or admin"
                  }
                  required
                  maxLength={255}
                  disabled={pending}
                />
              </label>
              <label htmlFor="password">
                PASSWORD
                <span className={styles.passwordField}>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={signup ? "new-password" : "current-password"}
                    placeholder={
                      signup ? "At least 8 characters" : "Enter your password"
                    }
                    required
                    minLength={signup ? 8 : 1}
                    maxLength={128}
                    disabled={pending}
                  />
                  <button
                    type="button"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? "HIDE" : "SHOW"}
                  </button>
                </span>
              </label>
              {signup && (
                <label htmlFor="confirmPassword">
                  CONFIRM PASSWORD
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Re-enter your password"
                    required
                    minLength={8}
                    maxLength={128}
                    disabled={pending}
                  />
                </label>
              )}
              {error && (
                <div className={styles.error} role="alert">
                  {error}
                </div>
              )}
              <button
                className={styles.primary}
                type="submit"
                disabled={pending}
              >
                {pending
                  ? "Processing…"
                  : signup
                    ? "Create account"
                    : "Enter the terminal"}
                <span aria-hidden="true">→</span>
              </button>
              <p className={styles.switch}>
                {signup ? "Already have an account?" : "New here?"}{" "}
                <Link href={signup ? "/sign-in" : "/sign-up"}>
                  {signup ? "Sign in here" : "Sign up"}
                </Link>
              </p>
            </form>
          )}
          <div className={styles.note}>
            <span aria-hidden="true">◇</span>{" "}
            {signup
              ? "Your analysis history is saved to your personal account."
              : "Secure session. Conversations saved. Ready when you are."}
          </div>
        </div>
        <footer className={styles.footer}>
          <span>© {new Date().getFullYear()} Arakan Ndar</span>
          <span>DATA. CONTEXT. PERSPECTIVE.</span>
        </footer>
      </section>
    </main>
  );
}
