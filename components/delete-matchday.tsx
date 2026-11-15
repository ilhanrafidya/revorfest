"use client";

import { AnimatePresence, m } from "motion/react";
import { useEffect, useState, useTransition } from "react";
import { deleteMatchday } from "@/app/actions/matchday";

/** Two-tap delete: first tap arms it, second tap (within 3s) deletes. */
export function DeleteMatchday({ id }: { id: string }) {
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!armed) return setArmed(true);
        start(async () => {
          const res = await deleteMatchday(id);
          if (!res.ok) setError(res.error);
        });
      }}
      title={error ?? "Delete this matchday"}
      className={`relative inline-flex h-9 items-center gap-1.5 overflow-hidden rounded-full px-3 text-sm font-semibold transition active:scale-95 disabled:opacity-50 ${
        armed ? "bg-depleted text-white" : "bg-white/[0.06] text-mute hover:text-depleted"
      }`}
    >
      <svg viewBox="0 0 24 24" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />
      </svg>
      <AnimatePresence initial={false}>
        {(armed || pending) && (
          <m.span initial={{ width: 0, opacity: 0 }} animate={{ width: "auto", opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="whitespace-nowrap">
            {pending ? "Deleting…" : "Tap to confirm"}
          </m.span>
        )}
      </AnimatePresence>
      <span className="sr-only">Delete</span>
    </button>
  );
}
