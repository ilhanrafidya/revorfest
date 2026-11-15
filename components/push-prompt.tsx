"use client";

import { AnimatePresence, m } from "motion/react";
import { useEffect, useState } from "react";
import { EASE } from "@/lib/motion";
import { enablePush, isIOS, isStandalone, pushSupported, registration } from "@/lib/push-client";

const SNOOZE = "rf-push-snooze";
const SNOOZE_DAYS = 3;

/**
 * Logged-in members get a one-tap "Turn on notifications" sheet on first open
 * (browsers only allow the permission prompt after a tap). On iPhone Safari, explain Add to Home Screen first.
 */
export function PushPrompt({ publicKey }: { publicKey: string | null }) {
  const [mode, setMode] = useState<null | "ask" | "ios">(null);
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);

  // Opening (or returning to) the app clears all Revorfest notifications from the notification centre.
  useEffect(() => {
    if (!pushSupported()) return;
    const clear = () =>
      navigator.serviceWorker
        .getRegistration("/")
        .then((reg) => reg?.getNotifications())
        .then((list) => list?.forEach((n) => n.close()))
        .catch(() => null);
    clear();
    (navigator as Navigator & { clearAppBadge?: () => Promise<void> }).clearAppBadge?.().catch(() => null);
    const onVis = () => document.visibilityState === "visible" && clear();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    if (!publicKey) return;
    let snoozed = false;
    try {
      snoozed = Number(localStorage.getItem(SNOOZE) ?? 0) > Date.now();
    } catch {}
    if (pushSupported()) {
      registration().catch(() => null);
      // already allowed (e.g. new deploy / reinstall) → quietly make sure the server has this device
      if (Notification.permission === "granted") {
        enablePush(publicKey);
        return;
      }
      if (Notification.permission === "default" && !snoozed) {
        const t = setTimeout(() => setMode("ask"), 1800);
        return () => clearTimeout(t);
      }
    } else if (isIOS() && !isStandalone() && !snoozed) {
      const t = setTimeout(() => setMode("ios"), 1800);
      return () => clearTimeout(t);
    }
  }, [publicKey]);

  function later() {
    try {
      localStorage.setItem(SNOOZE, String(Date.now() + SNOOZE_DAYS * 86400000));
    } catch {}
    setMode(null);
  }

  async function turnOn() {
    if (!publicKey) return;
    setBusy(true);
    const r = await enablePush(publicKey);
    setBusy(false);
    if (r === "on") setMode(null);
    else if (r === "denied") {
      setDenied(true);
      later();
    }
  }

  return (
    <AnimatePresence>
      {mode && (
        <m.div
          className="fixed inset-0 z-[85] flex items-end justify-center bg-black/60 backdrop-blur-sm md:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={later}
        >
          <m.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
            onClick={(e) => e.stopPropagation()}
            className="glass hairline w-full max-w-md rounded-t-[30px] p-6 text-center md:rounded-[30px]"
            style={{ paddingBottom: "calc(24px + env(safe-area-inset-bottom))" }}
          >
            <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/20 md:hidden" />
            <span className="mx-auto grid size-16 place-items-center rounded-full bg-accent text-on-accent shadow-[0_0_40px_color-mix(in_oklab,var(--accent)_40%,transparent)]">
              <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
            </span>
            {mode === "ask" ? (
              <>
                <h2 className="text-display mt-5 text-3xl">Don&apos;t miss kick-off.</h2>
                <p className="mt-2 text-sm leading-relaxed text-mute">
                  Get a ping when someone schedules a matchday, plus Player of the Week, Player of the Weak and season awards — with names.
                </p>
                <button
                  type="button"
                  onClick={turnOn}
                  disabled={busy}
                  className="mt-6 w-full rounded-full bg-accent py-4 text-base font-semibold text-on-accent transition active:scale-[0.98] disabled:opacity-60"
                >
                  {busy ? "Turning on…" : "Turn on notifications"}
                </button>
                {denied && <p className="mt-3 text-xs text-depleted">Blocked — enable notifications for Revorfest in your phone&apos;s Settings.</p>}
              </>
            ) : (
              <>
                <h2 className="text-display mt-5 text-3xl">Get notifications.</h2>
                <p className="mt-2 text-sm leading-relaxed text-mute">iPhone only sends notifications to apps on your Home Screen:</p>
                <ol className="mt-4 space-y-2 text-left text-sm">
                  <li className="rounded-2xl bg-white/[0.05] px-4 py-3">
                    1. Tap <span className="font-semibold">Share</span> <span className="text-mute">(the square with an arrow)</span>
                  </li>
                  <li className="rounded-2xl bg-white/[0.05] px-4 py-3">
                    2. Choose <span className="font-semibold">Add to Home Screen</span>
                  </li>
                  <li className="rounded-2xl bg-white/[0.05] px-4 py-3">3. Open Revorfest from your Home Screen and tap “Turn on”</li>
                </ol>
              </>
            )}
            <button type="button" onClick={later} className="mt-4 text-sm font-semibold text-mute">
              Not now
            </button>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
