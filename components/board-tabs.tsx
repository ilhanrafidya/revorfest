"use client";

import { useState, type ReactNode } from "react";
import { m, AnimatePresence } from "motion/react";

/** Segmented switch between leaderboard scopes (e.g. this season vs all-time). */
export function BoardTabs({ tabs }: { tabs: { key: string; label: string; note?: string; content: ReactNode }[] }) {
  const [active, setActive] = useState(tabs[0]?.key);
  const cur = tabs.find((t) => t.key === active) ?? tabs[0];
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
        <div role="tablist" className="glass hairline relative flex rounded-full p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={t.key === cur.key}
              onClick={() => setActive(t.key)}
              className={`relative rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${t.key === cur.key ? "text-chalk" : "text-mute hover:text-chalk"}`}
            >
              {t.key === cur.key && (
                <m.span layoutId="board-tab-pill" className="absolute inset-0 rounded-full bg-white/[0.1]" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
              )}
              <span className="relative">{t.label}</span>
            </button>
          ))}
        </div>
        {cur.note && <p className="text-xs text-mute">{cur.note}</p>}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <m.div
          key={cur.key}
          initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -6, filter: "blur(4px)" }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          {cur.content}
        </m.div>
      </AnimatePresence>
    </div>
  );
}
