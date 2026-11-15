"use client";

import { AnimatePresence, m } from "motion/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type Status = { triggeredAt: string | null; lastSyncAt: string | null; running: boolean; cooldownUntil: string | null; configured: boolean };

const EXPECTED_MS = 120_000;
const R = 16.75; // ring sits exactly on the 36px button edge
const C = 2 * Math.PI * R;

function mmss(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * Manual EA resync. While a sync runs, a white outline draws itself around the button
 * until it closes the loop; afterwards a countdown shows when the next sync is allowed.
 */
export function ResyncButton({ variant }: { variant: "mobile" | "desktop" }) {
  const router = useRouter();
  const [st, setSt] = useState<Status | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [done, setDone] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const wasRunning = useRef(false);

  const poll = useCallback(async () => {
    try {
      const r = await fetch("/api/resync", { cache: "no-store" });
      if (r.ok) setSt(await r.json());
    } catch {}
  }, []);

  useEffect(() => {
    poll();
  }, [poll]);

  // tick every second while something is happening; poll the server every 5s while syncing
  useEffect(() => {
    if (!st?.running && !st?.cooldownUntil && !done) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    const p = st?.running ? setInterval(poll, 5000) : null;
    return () => {
      clearInterval(t);
      if (p) clearInterval(p);
    };
  }, [st?.running, st?.cooldownUntil, done, poll]);

  // finished → close the ring, refresh the page data
  useEffect(() => {
    if (wasRunning.current && st && !st.running) {
      setDone(true);
      router.refresh();
      const t = setTimeout(() => setDone(false), 1600);
      wasRunning.current = false;
      return () => clearTimeout(t);
    }
    if (st?.running) wasRunning.current = true;
  }, [st, router]);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 3500);
    return () => clearTimeout(t);
  }, [msg]);

  if (!st || !st.configured) return null;

  const running = st.running;
  const cooldownLeft = st.cooldownUntil ? new Date(st.cooldownUntil).getTime() - now : 0;
  const cooling = !running && !done && cooldownLeft > 0;
  const elapsed = st.triggeredAt ? now - new Date(st.triggeredAt).getTime() : 0;
  const progress = done ? 1 : running ? Math.min(0.95, elapsed / EXPECTED_MS) : 0;

  async function go() {
    if (running || cooling) return;
    setMsg(null);
    try {
      const r = await fetch("/api/resync", { method: "POST" });
      const j = await r.json();
      if (!r.ok) setMsg(j.error ?? "Couldn't start sync.");
      if (j.triggeredAt !== undefined) setSt(j);
      setNow(Date.now());
    } catch {
      setMsg("No connection.");
    }
  }

  const label = running ? "Syncing with EA…" : done ? "Synced" : cooling ? `Next sync in ${mmss(cooldownLeft)}` : "Sync with EA now";

  // Ring + icon, drawn at exactly the button's size (36px) so nothing drifts.
  const inner = (
    <>
      <svg viewBox="0 0 36 36" className="pointer-events-none absolute inset-0 size-full -rotate-90" aria-hidden>
        <circle
          cx="18"
          cy="18"
          r={R}
          fill="none"
          stroke="white"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - progress)}
          style={{ transition: "stroke-dashoffset 1s linear, opacity .4s", opacity: running || done ? 1 : 0 }}
        />
      </svg>
      <AnimatePresence mode="wait" initial={false}>
        {done ? (
          <m.svg key="ok" viewBox="0 0 24 24" className="size-[18px] text-accent" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}>
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </m.svg>
        ) : (
          <m.svg
            key="sync"
            viewBox="0 0 24 24"
            className={`size-[18px] ${cooling ? "text-mute" : "text-chalk"}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, rotate: running ? 360 : 0 }}
            exit={{ opacity: 0 }}
            transition={running ? { rotate: { duration: 2.4, ease: "linear", repeat: Infinity } } : { duration: 0.3 }}
          >
            <path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4" />
          </m.svg>
        )}
      </AnimatePresence>
    </>
  );

  if (variant === "desktop") {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={go}
          disabled={running || cooling}
          title={label}
          aria-label={label}
          className="flex items-center gap-2 rounded-full pr-1 text-sm text-mute transition hover:text-chalk disabled:cursor-default"
        >
          <span className="relative grid size-9 place-items-center rounded-full bg-white/[0.06]">{inner}</span>
          {(running || cooling || done) && <span className="tabular-nums">{running ? "Syncing" : done ? "Synced" : mmss(cooldownLeft)}</span>}
        </button>
        <Toast msg={msg} align="right" />
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center">
      <button
        type="button"
        onClick={go}
        disabled={running || cooling}
        aria-label={label}
        className="glass relative grid size-9 place-items-center rounded-full ring-1 ring-white/10 shadow-xl shadow-black/50 transition active:scale-95 disabled:active:scale-100"
      >
        {inner}
      </button>
      <AnimatePresence>
        {cooling && (
          <m.span
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="glass hairline absolute top-full mt-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums text-mute"
          >
            {mmss(cooldownLeft)}
          </m.span>
        )}
      </AnimatePresence>
      <Toast msg={msg} align="right" />
    </div>
  );
}

function Toast({ msg, align }: { msg: string | null; align: "right" }) {
  return (
    <AnimatePresence>
      {msg && (
        <m.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={`glass hairline absolute top-full mt-2 w-max max-w-60 rounded-2xl px-3 py-2 text-xs text-chalk ${align === "right" ? "right-0" : "left-0"}`}
        >
          {msg}
        </m.p>
      )}
    </AnimatePresence>
  );
}
