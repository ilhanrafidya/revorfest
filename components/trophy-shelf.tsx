"use client";

import { AnimatePresence, m } from "motion/react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { EASE } from "@/lib/motion";
import { AwardIcon } from "./player-card";
import { ShareButton } from "./share-button";

type Item = { key: string; tone: string; icon: string; title: string; sub: string; url: string; file: string };
export type Shelf = { group: string; title: string; tone: string; icon: string; items: Item[] };
type Tones = Record<string, { box: string; icon: string; btn: string }>;

/** Trophy cabinet as a shelf: one tile per award type, tap to see each one and share it. */
export function TrophyShelf({ name, shelves, tones }: { name: string; shelves: Shelf[]; tones: Tones }) {
  const [open, setOpen] = useState<Shelf | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const total = shelves.reduce((a, s) => a + s.items.length, 0);

  return (
    <div>
      <div className="mb-4 px-1">
        <p className="eyebrow">Trophy cabinet</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">{total ? `${total} to show off` : "Still empty"}</h2>
      </div>
      {shelves.length === 0 ? (
        <p className="tile p-6 text-sm text-mute">
          {name} hasn&apos;t won anything yet. Weekly awards, this week&apos;s hattricks, career milestones and EA season awards all land here — each with its own story to share.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {shelves.map((s) => {
            const t = tones[s.tone];
            const single = s.items.length === 1;
            return (
              <button
                key={s.group}
                type="button"
                onClick={() => setOpen(s)}
                className={`tile flex flex-col items-start gap-3 p-4 text-left transition active:scale-[0.97] ${t.box}`}
              >
                <div className="flex w-full items-start justify-between">
                  <span className={`grid size-11 place-items-center rounded-full ${t.icon}`}>
                    <AwardIcon kind={s.icon} className="size-6" />
                  </span>
                  {!single && <span className="text-display text-3xl tabular-nums">×{s.items.length}</span>}
                </div>
                <div className="min-w-0 w-full">
                  <p className="truncate text-sm font-semibold">{s.title}</p>
                  <p className="truncate text-xs text-mute">{s.group === "milestone" ? s.items.map((i) => i.title).join(" · ") : single ? s.items[0].sub : `Latest · ${s.items[0].sub}`}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <m.div
                className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 backdrop-blur-sm md:items-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setOpen(null)}
              >
                <m.div
                  initial={{ y: 60, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 60, opacity: 0 }}
                  transition={{ duration: 0.4, ease: EASE }}
                  onClick={(e) => e.stopPropagation()}
                  className="glass hairline max-h-[80svh] w-full max-w-lg overflow-y-auto rounded-t-[28px] p-5 md:rounded-[28px]"
                  style={{ paddingBottom: "calc(20px + env(safe-area-inset-bottom))" }}
                >
                  <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20 md:hidden" />
                  <div className="mb-4 flex items-center gap-3">
                    <span className={`grid size-11 place-items-center rounded-full ${tones[open.tone].icon}`}>
                      <AwardIcon kind={open.icon} className="size-6" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{open.title}</p>
                      <p className="text-xs text-mute">
                        {open.items.length} {open.items.length === 1 ? "award" : "awards"} · tap Share for an IG story
                      </p>
                    </div>
                    <button type="button" onClick={() => setOpen(null)} aria-label="Close" className="grid size-9 place-items-center rounded-full bg-white/10">
                      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
                        <path d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    </button>
                  </div>
                  <ul className="space-y-2">
                    {open.items.map((it) => (
                      <li key={it.key} className="flex items-center gap-3 rounded-2xl bg-white/[0.04] p-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{it.title}</p>
                          <p className="truncate text-xs text-mute">{it.sub}</p>
                        </div>
                        <ShareButton url={it.url} filename={it.file} title={`Revorfest · ${it.title}`} label="Share" className={`shrink-0 px-3 ${tones[it.tone].btn}`} />
                      </li>
                    ))}
                  </ul>
                </m.div>
              </m.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}
