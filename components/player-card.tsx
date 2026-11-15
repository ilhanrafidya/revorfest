"use client";

import { AnimatePresence, m } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { EASE } from "@/lib/motion";

type Stats = { scope: string; matches: number; goals: number; assists: number; motm: number; winRate: number | null; rating: number | null };
type SeasonAward = { kind: "pots" | "boot" | "assist"; season: string; value: number };
export type CardData = {
  slug: string;
  name: string;
  number: number;
  positions: string[];
  avatar: string | null;
  stats: Stats;
  awards: { potw: number; weak: number; season: SeasonAward[] };
  gold: boolean;
};

const AWARD: Record<SeasonAward["kind"], { label: string; icon: string }> = {
  pots: { label: "Player of the Season", icon: "crown" },
  boot: { label: "Golden Boot", icon: "boot" },
  assist: { label: "Top Assist", icon: "assist" },
};

export function AwardIcon({ kind, className = "size-3.5" }: { kind: string; className?: string }) {
  const p = { viewBox: "0 0 24 24", className, fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  switch (kind) {
    case "crown":
      return <svg {...p}><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" /></svg>;
    case "boot":
      return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7l4 3-1.5 4.5h-5L8 10z" /></svg>;
    case "assist":
      return <svg {...p}><path d="M4 17c4-1 6-5 8-10M12 7l-3 1M12 7l1 3" /><circle cx="18" cy="17" r="3" /></svg>;
    case "trophy":
      return <svg {...p}><path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M9 20h6" /></svg>;
    default:
      return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M9 10h.01M15 10h.01M9 16c1.6-1.5 4.4-1.5 6 0" /></svg>;
  }
}

/** The Revorfest player card. Gold edition for Player of the Season winners. */
export function PlayerCardView({ c }: { c: CardData }) {
  const s = c.stats;
  const gold = c.gold;
  const ga = s.matches ? ((s.goals + s.assists) / s.matches).toFixed(1) : "—";
  const pots = c.awards.season.find((a) => a.kind === "pots");
  return (
    <div
      className={`relative w-[300px] overflow-hidden rounded-[28px] p-5 text-chalk ${
        gold ? "border border-gold/70 bg-[#1f1708]" : "border border-[color-mix(in_oklab,var(--accent-2)_60%,transparent)] bg-[color-mix(in_oklab,var(--accent-2)_22%,#07090f)]"
      }`}
    >
      <span aria-hidden className={`text-display pointer-events-none absolute -right-2 -top-6 text-[150px] leading-none tracking-[-0.06em] ${gold ? "text-gold/10" : "text-white/[0.07]"}`}>
        {c.number}
      </span>
      <div className="relative flex items-start justify-between">
        <div>
          <p className={`text-display text-5xl leading-[0.9] tabular-nums ${gold ? "text-[#F2CF8A]" : "text-accent"}`}>{s.rating ? s.rating.toFixed(1) : "—"}</p>
          <p className={`mt-1.5 text-sm font-bold tracking-[0.14em] ${gold ? "text-gold" : ""}`}>{c.positions[0]}</p>
        </div>
        {gold ? (
          <p className="text-right text-[11px] font-bold leading-tight tracking-[0.12em] text-gold">
            PLAYER OF
            <br />
            THE SEASON
          </p>
        ) : (
          <div className="text-right">
            <p className="text-2xl font-extrabold tracking-tight">#{c.number}</p>
            <p className="text-[11px] tracking-[0.14em] text-white/55">REVORFEST</p>
          </div>
        )}
      </div>

      <div className={`relative mx-auto mt-2 size-[150px] overflow-hidden rounded-full border-[3px] ${gold ? "border-gold bg-[#3a2b0e]" : "border-accent bg-white/10"}`}>
        {c.avatar ? (
          <img src={c.avatar} alt={c.name} className="size-full object-cover" />
        ) : (
          <span className={`grid size-full place-items-center text-5xl font-bold ${gold ? "text-[#F2CF8A]" : ""}`}>{c.name.slice(0, 2).toUpperCase()}</span>
        )}
      </div>

      <p className={`relative mt-4 truncate text-center text-3xl font-extrabold uppercase tracking-tight ${gold ? "text-[#F7E2B0]" : ""}`}>{c.name}</p>
      <p className={`relative mt-0.5 text-center text-xs ${gold ? "text-gold" : "text-white/60"}`}>
        {gold ? `#${c.number} · ${pots?.season ?? ""}` : c.positions.join(" · ")}
      </p>

      <div className={`relative mt-4 grid grid-cols-3 gap-y-3 border-t pt-4 ${gold ? "border-gold/25" : "border-white/10"}`}>
        {[
          ["MP", s.matches],
          ["GOL", s.goals],
          ["AST", s.assists],
          ["MOTM", s.motm],
          ["WIN", s.winRate != null ? `${s.winRate}%` : "—"],
          ["G+A/MP", ga],
        ].map(([k, v]) => (
          <div key={k} className="text-center">
            <p className="text-[22px] font-bold leading-none tracking-tight tabular-nums">{v}</p>
            <p className="mt-1 text-[10px] tracking-[0.14em] text-white/55">{k}</p>
          </div>
        ))}
      </div>

      {(c.awards.season.length > 0 || c.awards.potw > 0 || c.awards.weak > 0) && (
        <div className="relative mt-4 flex flex-wrap justify-center gap-1.5">
          {c.awards.season.map((a, i) => (
            <span
              key={i}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                a.kind === "pots" ? "bg-gold text-[#2b1d03]" : "bg-gold/15 text-gold"
              }`}
            >
              <AwardIcon kind={AWARD[a.kind].icon} />
              {AWARD[a.kind].label} <span className="opacity-60">{a.season.replace("Season ", "S")}</span>
            </span>
          ))}
          {c.awards.potw > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-gold/15 px-2.5 py-1 text-[11px] font-semibold text-gold">
              <AwardIcon kind="trophy" />
              POTW ×{c.awards.potw}
            </span>
          )}
          {c.awards.weak > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-depleted/15 px-2.5 py-1 text-[11px] font-semibold text-[#FF6B61]">
              <AwardIcon kind="sad" />
              Weak ×{c.awards.weak}
            </span>
          )}
        </div>
      )}

      <div className={`relative mt-4 flex justify-between text-[11px] tracking-[0.14em] ${gold ? "text-gold/70" : "text-white/45"}`}>
        <span>{s.scope.toUpperCase()}</span>
        <span>{gold ? "GOLD EDITION" : "REVORFEST"}</span>
      </div>
    </div>
  );
}

/** Opens a player's card in a sheet; fetches it on demand. */
export function CardSheet({ slug, onClose }: { slug: string | null; onClose: () => void }) {
  const [data, setData] = useState<CardData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let live = true;
    setData(null);
    setFailed(false);
    fetch(`/api/card/${slug}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => live && setData(d))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [slug]);

  return (
    <AnimatePresence>
      {slug && (
        <m.div
          className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-5 bg-black/70 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <m.div
            initial={{ y: 40, scale: 0.92, opacity: 0, rotate: -2 }}
            animate={{ y: 0, scale: 1, opacity: 1, rotate: 0 }}
            exit={{ y: 40, scale: 0.92, opacity: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            onClick={(e) => e.stopPropagation()}
          >
            {data ? (
              <PlayerCardView c={data} />
            ) : (
              <div className="grid h-[520px] w-[300px] place-items-center rounded-[28px] border border-white/10 bg-white/[0.04] text-sm text-mute">
                {failed ? "Couldn't load this card." : <span className="size-6 animate-spin rounded-full border-2 border-white/20 border-t-accent" />}
              </div>
            )}
          </m.div>
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            <Link href={`/squad/${slug}`} className="glass hairline rounded-full px-5 py-2.5 text-sm font-semibold">
              Full profile
            </Link>
            <button type="button" onClick={onClose} className="rounded-full bg-chalk px-5 py-2.5 text-sm font-semibold text-black">
              Close
            </button>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
