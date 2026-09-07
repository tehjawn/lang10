"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  createProgress,
  mergeProgress,
  normalizeProgress,
  type Progress,
} from "./progress";

const STORAGE_KEY = "lang10.progress.v1";
const SYNC_DEBOUNCE_MS = 1500;

export type AccountUser = { id: string; email: string; name: string | null };

type SyncState = "idle" | "saving" | "saved" | "error";

// ------------------------------------------------------- localStorage store
//
// Progress lives in a module-level store backed by localStorage rather than in
// component state. React subscribes to it, which keeps server and client
// rendering honest: the server snapshot is `null` (nothing is known yet) and
// the browser swaps in the real value on hydration.

let snapshot: Progress | null = null;
const listeners = new Set<() => void>();

function readLocal(): Progress {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeProgress(JSON.parse(raw)) : createProgress();
  } catch {
    return createProgress();
  }
}

function writeLocal(p: Progress) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    // Private browsing or a full quota — the session still works in memory.
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Must stay referentially stable between writes, hence the cached snapshot. */
function getSnapshot(): Progress | null {
  if (snapshot === null) snapshot = readLocal();
  return snapshot;
}

const getServerSnapshot = (): Progress | null => null;

function commit(next: Progress) {
  snapshot = next;
  writeLocal(next);
  for (const listener of listeners) listener();
}

// ------------------------------------------------------------------ context

type StoreValue = {
  progress: Progress;
  /** False until localStorage has been read — guards against hydration flashes. */
  ready: boolean;
  user: AccountUser | null;
  /** Whether the deployment has accounts configured at all. */
  accountsEnabled: boolean;
  /** False until /api/auth/me has answered. */
  authReady: boolean;
  syncState: SyncState;
  update: (fn: (p: Progress) => Progress) => void;
  reset: () => void;
  setUser: (u: AccountUser | null) => void;
};

const StoreContext = createContext<StoreValue | null>(null);

/** Rendered on the server and during hydration, before the real value arrives. */
const PLACEHOLDER = Object.freeze(createProgress()) as Progress;

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const progress = stored ?? PLACEHOLDER;
  const ready = stored !== null;

  const [user, setUser] = useState<AccountUser | null>(null);
  const [accountsEnabled, setAccountsEnabled] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);
  // Set by reset() so the next push overwrites the account copy instead of
  // merging with it — a merge would resurrect everything just erased.
  const replaceNext = useRef(false);

  // Resolve the session client-side so every page stays statically renderable.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const body = (await res.json()) as {
          user: AccountUser | null;
          accountsEnabled: boolean;
        };
        setUser(body.user);
        setAccountsEnabled(body.accountsEnabled);
      } catch {
        // Offline: stay in guest mode; local progress is unaffected.
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Pull the account's copy down and fold it into whatever is already here.
  useEffect(() => {
    if (!ready || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/progress", { cache: "no-store" });
        if (!res.ok) return;
        const body = (await res.json()) as { progress: unknown | null };
        if (cancelled || !body.progress) return;
        commit(mergeProgress(getSnapshot() ?? PLACEHOLDER, normalizeProgress(body.progress)));
        dirty.current = true;
      } catch {
        // Offline: keep using the local copy and retry on the next change.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, user]);

  const update = useCallback((fn: (p: Progress) => Progress) => {
    commit(fn(getSnapshot() ?? PLACEHOLDER));
    dirty.current = true;
  }, []);

  const reset = useCallback(() => {
    commit(createProgress());
    dirty.current = true;
    replaceNext.current = true;
  }, []);

  // Push to the server on a trailing debounce so a fast session is one request.
  useEffect(() => {
    if (!ready || !user || !dirty.current) return;
    if (timer.current) clearTimeout(timer.current);
    setSyncState("saving");
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/progress", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ progress, replace: replaceNext.current }),
        });
        setSyncState(res.ok ? "saved" : "error");
        if (res.ok) {
          dirty.current = false;
          replaceNext.current = false;
        }
      } catch {
        setSyncState("error");
      }
    }, SYNC_DEBOUNCE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [progress, ready, user]);

  const value = useMemo<StoreValue>(
    () => ({
      progress,
      ready,
      user,
      accountsEnabled,
      authReady,
      syncState,
      update,
      reset,
      setUser,
    }),
    [progress, ready, user, accountsEnabled, authReady, syncState, update, reset],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useProgress(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useProgress must be used inside <ProgressProvider>");
  return ctx;
}
