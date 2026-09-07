"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useProgress } from "@/lib/store";
import { Button, Card } from "@/components/ui";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const { progress, setUser, accountsEnabled, authReady } = useProgress();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isSignup = mode === "signup";

  if (!authReady) {
    return <div className="mx-auto mt-6 h-96 max-w-md animate-pulse rounded-2xl border border-border bg-surface-2 sm:mt-12" />;
  }

  if (!accountsEnabled) {
    return (
      <Card className="mx-auto mt-8 max-w-md text-center">
        <h1 className="text-xl font-extrabold">Accounts are off</h1>
        <p className="mt-2 text-sm text-muted">
          This deployment has no database configured, so progress is saved in this browser only.
          Everything else works normally.
        </p>
        <Link href="/" className="mt-4 inline-block font-semibold text-accent">
          Back to today
        </Link>
      </Card>
    );
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const data = new FormData(event.currentTarget);
    const payload = {
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? ""),
      ...(isSignup
        ? // Hand the guest's local progress to the new account so nothing is lost.
          { name: String(data.get("name") ?? ""), progress }
        : {}),
    };

    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Something went wrong.");
        return;
      }
      setUser(body.user);
      router.push("/");
    } catch {
      setError("Could not reach the server. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mx-auto mt-6 max-w-md sm:mt-12">
      <h1 className="text-2xl font-extrabold tracking-tight">
        {isSignup ? "Create your account" : "Welcome back"}
      </h1>
      <p className="mt-1 text-sm text-muted">
        {isSignup
          ? "Sync your streak and progress across devices. Your current progress comes with you."
          : "Sign in to pick up your streak on any device."}
      </p>

      <form onSubmit={onSubmit} className="mt-5 space-y-3">
        {isSignup && (
          <Field label="Name (optional)">
            <input name="name" autoComplete="name" className={INPUT} placeholder="Your name" />
          </Field>
        )}
        <Field label="Email">
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            className={INPUT}
            placeholder="you@example.com"
          />
        </Field>
        <Field label="Password">
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={isSignup ? "new-password" : "current-password"}
            className={INPUT}
            placeholder={isSignup ? "At least 8 characters" : "••••••••"}
          />
        </Field>

        {error && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? "Working…" : isSignup ? "Create account" : "Sign in"}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-muted">
        {isSignup ? "Already have an account? " : "New to Lang10? "}
        <Link href={isSignup ? "/login" : "/signup"} className="font-semibold text-accent">
          {isSignup ? "Sign in" : "Create one"}
        </Link>
      </p>
    </Card>
  );
}

const INPUT =
  "w-full rounded-xl border-2 border-border bg-surface px-3.5 py-3 outline-none transition focus:border-accent";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold">{label}</span>
      {children}
    </label>
  );
}
