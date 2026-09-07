"use client";

import { useState } from "react";
import { overallStats } from "@/lib/progress";
import { useProgress } from "@/lib/store";
import { Button, ButtonLink, Card, cx } from "@/components/ui";

const GOAL_OPTIONS = [5, 10, 15, 20];

export default function AccountPage() {
  const { progress, ready, user, accountsEnabled, authReady, syncState, update, setUser, reset } =
    useProgress();
  const [confirmingReset, setConfirmingReset] = useState(false);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }

  const stats = ready ? overallStats(progress) : null;

  return (
    <div className="space-y-5">
      <h1 className="px-1 text-2xl font-extrabold tracking-tight">Account</h1>

      <Card>
        {!authReady ? (
          <div className="h-16 animate-pulse rounded-xl bg-surface-2" />
        ) : !accountsEnabled ? (
          <>
            <h2 className="font-bold">Local-only mode</h2>
            <p className="mt-1 text-sm text-muted">
              No database is configured on this server, so your progress lives in this browser.
              Add <code className="rounded bg-surface-2 px-1">DATABASE_URL</code> and{" "}
              <code className="rounded bg-surface-2 px-1">AUTH_SECRET</code> to enable accounts.
            </p>
          </>
        ) : user ? (
          <div className="flex flex-wrap items-center gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-matcha-soft text-lg font-bold text-matcha">
              {(user.name ?? user.email).slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-bold">{user.name ?? "Signed in"}</div>
              <div className="truncate text-sm text-muted">{user.email}</div>
              <div className="mt-0.5 text-xs text-muted">{SYNC_LABEL[syncState]}</div>
            </div>
            <Button variant="outline" onClick={signOut}>
              Sign out
            </Button>
          </div>
        ) : (
          <>
            <h2 className="font-bold">You&apos;re learning as a guest</h2>
            <p className="mt-1 text-sm text-muted">
              Progress is saved in this browser. Sign in to sync it everywhere.
            </p>
            <div className="mt-4 flex gap-2">
              <ButtonLink href="/signup">Create account</ButtonLink>
              <ButtonLink href="/login" variant="outline">
                Sign in
              </ButtonLink>
            </div>
          </>
        )}
      </Card>

      <Card>
        <h2 className="font-bold">Daily goal</h2>
        <p className="mt-1 text-sm text-muted">How many questions make up one session.</p>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {GOAL_OPTIONS.map((goal) => (
            <button
              key={goal}
              type="button"
              onClick={() => update((p) => ({ ...p, dailyGoal: goal, updatedAt: new Date().toISOString() }))}
              className={cx(
                "rounded-xl border-2 py-3 font-bold tabular-nums transition",
                ready && progress.dailyGoal === goal
                  ? "border-matcha bg-matcha-soft text-matcha"
                  : "border-border bg-surface text-muted hover:border-matcha",
              )}
            >
              {goal}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="font-bold">During a lesson</h2>
        <label className="mt-3 flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={ready ? progress.autoAdvance : true}
            onChange={(e) =>
              update((p) => ({
                ...p,
                autoAdvance: e.target.checked,
                updatedAt: new Date().toISOString(),
              }))
            }
          />
          {/*
            The knob is a descendant, not a sibling, so it cannot use
            `peer-checked:` directly — the peer variant compiles to a sibling
            combinator. Target it from the track instead.
          */}
          <span className="relative h-7 w-12 shrink-0 rounded-full bg-track transition peer-checked:bg-matcha peer-checked:[&>span]:translate-x-5 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-matcha">
            <span className="absolute top-1 left-1 h-5 w-5 rounded-full bg-surface shadow transition" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-bold">Continue automatically</span>
            <span className="block text-sm text-muted">
              Move on by itself after a correct answer. Wrong answers always wait.
            </span>
          </span>
        </label>
      </Card>

      <Card>
        <h2 className="font-bold">Your data</h2>
        <p className="mt-1 text-sm text-muted">
          {stats
            ? `${stats.started} of ${stats.total} items started, ${stats.learned} learned, ${stats.answers} answers given.`
            : "Loading…"}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => downloadProgress(progress)} disabled={!ready}>
            Export JSON
          </Button>
          {confirmingReset ? (
            <>
              <Button
                variant="torii"
                onClick={() => {
                  reset();
                  setConfirmingReset(false);
                }}
              >
                Yes, erase everything
              </Button>
              <Button variant="ghost" onClick={() => setConfirmingReset(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <Button variant="danger" onClick={() => setConfirmingReset(true)}>
              Reset progress
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

const SYNC_LABEL = {
  idle: "Synced to your account",
  saving: "Saving…",
  saved: "All changes saved",
  error: "Offline — changes are saved locally",
} as const;

function downloadProgress(progress: unknown) {
  const blob = new Blob([JSON.stringify(progress, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "lang10-progress.json";
  a.click();
  URL.revokeObjectURL(url);
}
