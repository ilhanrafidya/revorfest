"use client";

import { useEffect, useState } from "react";

/** Live countdown to an ISO date: days · hours · minutes · seconds. */
export function Countdown({ to, className = "" }: { to: string; className?: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, new Date(to).getTime() - (now ?? Date.now()));
  const parts = [
    { k: "days", v: Math.floor(left / 86400000) },
    { k: "hrs", v: Math.floor(left / 3600000) % 24 },
    { k: "min", v: Math.floor(left / 60000) % 60 },
    { k: "sec", v: Math.floor(left / 1000) % 60 },
  ];
  return (
    <div className={`flex gap-2 ${className}`} suppressHydrationWarning>
      {parts.map((p) => (
        <div key={p.k} className="min-w-14 rounded-2xl bg-white/[0.06] px-3 py-2 text-center">
          <p className="text-display text-2xl tabular-nums md:text-3xl" suppressHydrationWarning>
            {now == null ? "–" : String(p.v).padStart(2, "0")}
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-mute">{p.k}</p>
        </div>
      ))}
    </div>
  );
}
