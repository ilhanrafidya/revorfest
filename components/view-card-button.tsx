"use client";

import { useState } from "react";
import { CardSheet } from "./player-card";

export function ViewCardButton({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full bg-chalk px-5 py-2.5 text-sm font-semibold text-black transition active:scale-95"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="5" y="3" width="14" height="18" rx="2.5" />
          <circle cx="12" cy="10" r="2.5" />
          <path d="M8.5 16.5c.8-1.6 2-2.4 3.5-2.4s2.7.8 3.5 2.4" />
        </svg>
        View card
      </button>
      <CardSheet slug={open ? slug : null} onClose={() => setOpen(false)} />
    </>
  );
}
