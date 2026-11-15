"use client";

import { AnimatePresence, m } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { EASE } from "@/lib/motion";
import { PlayerAvatar } from "./player-avatar";

type Alert = { id: string; when: string; by: string; byId: string | null; avatar: string | null; note: string | null };

const KEY = "rf-md-seen";

function whenText(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { weekday: "long", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
}

/** "Kamel scheduled a matchday" — shown once per matchday to everyone except whoever created it. */
export function MatchdayNotice({ alert, meId }: { alert: Alert | null; meId: string | null }) {
  const path = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!alert || !meId || alert.byId === meId) return;
    let seen: string | null = null;
    try {
      seen = localStorage.getItem(KEY);
    } catch {}
    if (seen === alert.id) return;
    if (path === "/matchday") {
      try {
        localStorage.setItem(KEY, alert.id);
      } catch {}
      setShow(false);
      return;
    }
    const t = setTimeout(() => setShow(true), 900);
    return () => clearTimeout(t);
  }, [alert, meId, path]);

  function dismiss() {
    setShow(false);
    try {
      if (alert) localStorage.setItem(KEY, alert.id);
    } catch {}
  }

  return (
    <AnimatePresence>
      {show && alert && (
        <m.div
          role="status"
          initial={{ opacity: 0, y: -24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -24, scale: 0.96 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="fixed inset-x-3 top-[calc(12px+env(safe-area-inset-top))] z-[70] mx-auto max-w-md md:top-20"
        >
          <div className="glass hairline flex items-center gap-3 rounded-[22px] p-3 pr-2 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <span className="relative shrink-0">
              <PlayerAvatar name={alert.by} src={alert.avatar} className="size-11 text-sm" />
              <span className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full bg-accent ring-2 ring-carbon" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">
                <span className="font-semibold">{alert.by}</span> <span className="text-mute">scheduled a matchday</span>
              </p>
              <p className="truncate text-xs text-mute">
                {whenText(alert.when)} WIB{alert.note ? ` · ${alert.note}` : ""}
              </p>
            </div>
            <Link href="/matchday" onClick={dismiss} className="shrink-0 rounded-full bg-accent px-3.5 py-2 text-xs font-semibold text-on-accent">
              I&apos;m in?
            </Link>
            <button type="button" onClick={dismiss} aria-label="Dismiss" className="grid size-8 shrink-0 place-items-center rounded-full text-mute hover:text-chalk">
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
