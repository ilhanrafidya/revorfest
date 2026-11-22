"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, animate, m, useReducedMotion, type Variants } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ARCHETYPES, type Mate, type Wrapped } from "@/lib/wrapped-meta";
import { ShareButton } from "./share-button";

const SLIDE_MS = 7000;
const EASE = [0.22, 1, 0.36, 1] as const;

type Transition = "zoom" | "wipe" | "flip" | "rise";
type Slide = { key: string; bg: [string, string]; fx: Transition; ms?: number; share?: { card: string; label: string }; body: ReactNode };

const ENTER: Record<Transition, Variants> = {
  zoom: { hidden: { opacity: 0, scale: 1.12, filter: "blur(12px)" }, show: { opacity: 1, scale: 1, filter: "blur(0px)" }, exit: { opacity: 0, scale: 0.92, filter: "blur(8px)" } },
  wipe: { hidden: { opacity: 0, clipPath: "inset(0 100% 0 0)" }, show: { opacity: 1, clipPath: "inset(0 0% 0 0)" }, exit: { opacity: 0, clipPath: "inset(0 0 0 100%)" } },
  flip: { hidden: { opacity: 0, rotateX: -40, y: 40 }, show: { opacity: 1, rotateX: 0, y: 0 }, exit: { opacity: 0, rotateX: 30, y: -30 } },
  rise: { hidden: { opacity: 0, y: 60 }, show: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -40, filter: "blur(6px)" } },
};

/* ── building blocks ───────────────────────────────────────── */

function CountUp({ to, decimals = 0, delay = 0.25, duration = 1.4 }: { to: number; decimals?: number; delay?: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce) {
      el.textContent = to.toFixed(decimals);
      return;
    }
    const c = animate(0, to, { duration, delay, ease: EASE, onUpdate: (v) => (el.textContent = v.toFixed(decimals)) });
    return () => c.stop();
  }, [to, decimals, delay, duration, reduce]);
  return (
    <span ref={ref} className="tabular-nums">
      {(0).toFixed(decimals)}
    </span>
  );
}

function In({ children, d = 0, className = "" }: { children: ReactNode; d?: number; className?: string }) {
  return (
    <m.div className={className} initial={{ opacity: 0, y: 18, filter: "blur(8px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 0.7, ease: EASE, delay: d }}>
      {children}
    </m.div>
  );
}

function Kicker({ children, color = "rgba(255,255,255,0.6)" }: { children: ReactNode; color?: string }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color }}>
      {children}
    </p>
  );
}

function Face({ who, size = 96, ring = "rgba(255,255,255,0.25)" }: { who: Mate; size?: number; ring?: string }) {
  return (
    <span className="grid shrink-0 place-items-center overflow-hidden rounded-full bg-white/10 font-bold" style={{ width: size, height: size, boxShadow: `0 0 0 3px ${ring}`, fontSize: size / 3 }}>
      {who.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={who.avatar} alt="" className="size-full object-cover" />
      ) : (
        who.name.slice(0, 2).toUpperCase()
      )}
    </span>
  );
}

/** Portrait with the shirt number huge behind it — same look as the share cards. */
function Portrait({ who, color, size = 170 }: { who: Mate; color: string; size?: number }) {
  return (
    <div className="relative grid place-items-center" style={{ height: size * 1.25 }}>
      {who.number != null && (
        <m.span
          aria-hidden
          className="text-display pointer-events-none absolute select-none leading-none"
          style={{ fontSize: size * 1.45, letterSpacing: "-0.06em", backgroundImage: `linear-gradient(180deg, ${color}aa, transparent 75%)`, WebkitBackgroundClip: "text", color: "transparent" }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, ease: EASE }}
        >
          {who.number}
        </m.span>
      )}
      <m.span initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.9, ease: EASE, delay: 0.15 }}>
        <Face who={who} size={size} ring={color} />
      </m.span>
    </div>
  );
}

const CONFETTI = ["#D7FF3A", "#DDB168", "#8AB4FF", "#FF9F43", "#F5F5F7"];
function Confetti() {
  const reduce = useReducedMotion();
  const bits = useMemo(() => Array.from({ length: 32 }, (_, i) => ({ x: (i * 37) % 100, d: (i % 8) * 0.08, r: (i * 53) % 360, c: CONFETTI[i % CONFETTI.length], w: 6 + (i % 3) * 3 })), []);
  if (reduce) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {bits.map((b, i) => (
        <m.span
          key={i}
          className="absolute top-0 block rounded-sm"
          style={{ left: `${b.x}%`, width: b.w, height: b.w * 1.6, background: b.c }}
          initial={{ y: -40, rotate: b.r, opacity: 0 }}
          animate={{ y: "105vh", rotate: b.r + 540, opacity: [0, 1, 1, 0] }}
          transition={{ duration: 2.6 + (i % 4) * 0.35, delay: 0.3 + b.d, ease: "easeIn" }}
        />
      ))}
    </div>
  );
}

/** Ball grid: one ball per goal (or assist), dropping in like rain. */
function BallGrid({ n, color, delay = 0.3 }: { n: number; color: string; delay?: number }) {
  const show = Math.min(n, 60);
  const step = Math.min(0.05, 1.4 / Math.max(show, 1));
  return (
    <div className="flex flex-wrap gap-1.5">
      {Array.from({ length: show }, (_, i) => (
        <m.span
          key={i}
          className="block size-3.5 rounded-full"
          style={{ background: color, boxShadow: `0 0 10px ${color}66` }}
          initial={{ opacity: 0, y: -40, scale: 0.4 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 420, damping: 18, delay: delay + i * step }}
        />
      ))}
      {n > show && <span className="text-xs text-white/60">+{n - show}</span>}
    </div>
  );
}

/** Calendar of the season, lighting up the nights played. */
function NightCalendar({ first, last, nights }: { first: string; last: string; nights: string[] }) {
  const set = new Set(nights);
  const days: { d: string; on: boolean; dow: number }[] = [];
  const start = new Date(first + "T12:00:00Z");
  const end = new Date(last + "T12:00:00Z");
  for (let t = start.getTime(); t <= end.getTime(); t += 86400000) {
    const d = new Date(t).toISOString().slice(0, 10);
    days.push({ d, on: set.has(d), dow: (new Date(t).getUTCDay() + 6) % 7 });
  }
  const pad = days[0]?.dow ?? 0;
  let lit = 0;
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {["M", "T", "W", "T", "F", "S", "S"].map((x, i) => (
        <span key={i} className="text-center text-[10px] font-semibold text-white/40">
          {x}
        </span>
      ))}
      {Array.from({ length: pad }, (_, i) => (
        <span key={`p${i}`} />
      ))}
      {days.map((x) => {
        const order = x.on ? lit++ : 0;
        return (
          <m.span
            key={x.d}
            className="aspect-square rounded-md bg-white/[0.06]"
            animate={x.on ? { backgroundColor: "#FF9F43", scale: [1, 1.25, 1], boxShadow: "0 0 14px rgba(255,159,67,0.6)" } : {}}
            transition={{ delay: 0.5 + order * 0.12, duration: 0.5, ease: EASE }}
          />
        );
      })}
    </div>
  );
}

/** Five-axis radar vs a club-average ring. */
function Radar({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  const size = 260;
  const c = size / 2;
  const r = 92;
  const pt = (i: number, v: number) => {
    const a = (Math.PI * 2 * i) / data.length - Math.PI / 2;
    return [c + Math.cos(a) * r * v, c + Math.sin(a) * r * v] as const;
  };
  const poly = (v: (i: number) => number) => data.map((_, i) => pt(i, v(i)).join(",")).join(" ");
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto w-full max-w-[290px]" aria-hidden>
      {[0.25, 0.5, 0.75, 1].map((k) => (
        <polygon key={k} points={poly(() => k)} fill="none" stroke="rgba(255,255,255,0.1)" />
      ))}
      <polygon points={poly(() => 0.5)} fill="none" stroke="rgba(255,255,255,0.35)" strokeDasharray="4 4" />
      <m.polygon
        points={poly((i) => Math.max(0.08, data[i].value))}
        fill={`${color}44`}
        stroke={color}
        strokeWidth={2.5}
        strokeLinejoin="round"
        style={{ transformOrigin: `${c}px ${c}px` }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.1, ease: EASE, delay: 0.4 }}
      />
      {data.map((d, i) => {
        const [x, y] = pt(i, 1.25);
        return (
          <text key={d.label} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.75)" fontSize="11" fontWeight="600">
            {d.label}
          </text>
        );
      })}
    </svg>
  );
}

const ordinal = (n: number) => `${n}${n % 10 === 1 && n % 100 !== 11 ? "st" : n % 10 === 2 && n % 100 !== 12 ? "nd" : n % 10 === 3 && n % 100 !== 13 ? "rd" : "th"}`;

/* ── the story ─────────────────────────────────────────────── */

export function WrappedStory({ data: w }: { data: Wrapped }) {
  const router = useRouter();
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const arch = ARCHETYPES[w.archetype];
  const first = w.player.name.split(" ")[0];

  const slides: Slide[] = useMemo(() => {
    const out: Slide[] = [];

    out.push({
      key: "intro",
      bg: ["#2a3d00", "#000"],
      fx: "zoom",
      body: (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <Portrait who={w.player} color="#D7FF3A" size={150} />
          <In d={0.5} className="mt-4">
            <Kicker color="#D7FF3A">Revorfest Wrapped</Kicker>
          </In>
          <In d={0.7}>
            <h1 className="text-display mt-3 text-5xl leading-[0.95]">
              {first},<br />
              this was your
              <br />
              <span className="text-gradient">{w.season.name}.</span>
            </h1>
          </In>
          {!w.season.finished && (
            <In d={1} className="mt-5">
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">Admin preview · season still running</span>
            </In>
          )}
        </div>
      ),
    });

    out.push({
      key: "showing-up",
      bg: ["#3a1c00", "#000"],
      fx: "wipe",
      body: (
        <div className="flex h-full flex-col justify-center">
          <Kicker color="#FF9F43">Showing up</Kicker>
          <In d={0.1} className="mt-3 flex items-end gap-3">
            <span className="text-display text-[clamp(72px,24vw,120px)] leading-[0.85] text-[#FF9F43]">
              <CountUp to={w.nights} />
            </span>
            <span className="text-display mb-2 text-3xl">nights</span>
          </In>
          <In d={0.3} className="mt-2 text-lg text-white/75">
            {w.matches} matches · {w.rank.matches === 1 ? "nobody played more" : `${ordinal(w.rank.matches)} most in the club`}
          </In>
          <div className="mt-8 rounded-3xl bg-white/[0.05] p-4 ring-1 ring-white/10">
            <NightCalendar first={w.seasonDays.first} last={w.seasonDays.last} nights={w.nightsList} />
          </div>
        </div>
      ),
    });

    out.push({
      key: "goals",
      bg: ["#163a00", "#000"],
      fx: "rise",
      ms: 8000,
      share: { card: "goals", label: "Share goals" },
      body: (
        <div className="flex h-full flex-col justify-center">
          <Kicker color="#D7FF3A">Goals</Kicker>
          <In className="mt-2">
            <span className="text-display text-[clamp(72px,24vw,120px)] leading-[0.85] text-accent">
              <CountUp to={w.goals} duration={1.8} />
            </span>
          </In>
          <div className="mt-4">
            <BallGrid n={w.goals} color="#D7FF3A" />
          </div>
          <div className="mt-8 flex items-end gap-3">
            <Kicker color="#8AB4FF">Assists</Kicker>
            <span className="text-display text-5xl leading-none">
              <CountUp to={w.assists} delay={1.2} />
            </span>
          </div>
          <div className="mt-3">
            <BallGrid n={w.assists} color="#8AB4FF" delay={1.4} />
          </div>
          <In d={2} className="mt-6 text-sm text-white/70">
            {((w.goals + w.assists) / w.matches).toFixed(1)} goal involvements a match · {ordinal(w.rank.goals)} in goals, {ordinal(w.rank.assists)} in assists
          </In>
        </div>
      ),
    });

    if (w.best)
      out.push({
        key: "best",
        bg: ["#3a2c00", "#000"],
        fx: "flip",
        share: { card: "best", label: "Share best match" },
        body: (
          <div className="flex h-full flex-col justify-center" style={{ perspective: 1000 }}>
            <Kicker color="#DDB168">Your best night</Kicker>
            <m.div
              className="gold-sheen relative mt-6 overflow-hidden rounded-[28px] bg-[linear-gradient(160deg,rgba(221,177,104,0.25),rgba(255,255,255,0.04))] ring-1 ring-gold/40"
              initial={{ rotateY: -25, opacity: 0, y: 30 }}
              animate={{ rotateY: 0, opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: EASE, delay: 0.2 }}
            >
              <div className="flex items-center justify-between border-b border-dashed border-gold/40 px-6 py-4">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Revorfest · Matchday</span>
                <span className="text-xs text-white/60">{new Date(w.best.playedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" })}</span>
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-6 py-6 text-center">
                <span className="truncate text-sm font-semibold">Revorfest</span>
                <span className="text-display text-5xl tabular-nums">
                  {w.best.gf}–{w.best.ga}
                </span>
                <span className="truncate text-sm font-semibold">{w.best.opponent}</span>
              </div>
              <div className="flex items-end justify-between border-t border-dashed border-gold/40 px-6 py-5">
                <div>
                  <p className="text-xs text-white/60">Your rating</p>
                  <p className="text-display text-6xl leading-none text-gold">
                    <CountUp to={w.best.rating} decimals={1} delay={0.8} />
                  </p>
                </div>
                <div className="text-right text-sm text-white/80">
                  <p>
                    <b className="text-white">{w.best.goals}</b> goals
                  </p>
                  <p>
                    <b className="text-white">{w.best.assists}</b> assists
                  </p>
                </div>
              </div>
              <span className="absolute -left-3 top-[44px] size-6 rounded-full bg-black" />
              <span className="absolute -right-3 top-[44px] size-6 rounded-full bg-black" />
            </m.div>
          </div>
        ),
      });

    if (w.victim)
      out.push({
        key: "victim",
        bg: ["#3a0010", "#000"],
        fx: "zoom",
        share: { card: "victim", label: "Share favourite victim" },
        body: (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <m.div
              className="relative w-full max-w-sm rounded-[18px] bg-[#e9dcc2] px-6 py-7 text-[#2a1a0a] shadow-[0_30px_80px_-20px_rgba(255,69,58,0.45)]"
              initial={{ rotate: -8, scale: 0.85, opacity: 0 }}
              animate={{ rotate: -2, scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 160, damping: 14, delay: 0.15 }}
            >
              <p className="text-display text-5xl tracking-[0.12em]">WANTED</p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.3em] opacity-70">by {first}</p>
              <p className="text-display mt-5 break-words text-[clamp(28px,9vw,44px)] leading-none">{w.victim.opponent}</p>
              <p className="mt-4 text-sm font-semibold opacity-80">
                Record against them: {w.victim.W}W {w.victim.D}D {w.victim.L}L
              </p>
              {w.victim.goals > 0 && (
                <m.div
                  className="absolute -right-4 -top-4 grid size-24 place-items-center rounded-full border-4 border-[#c0281f] bg-[#e9dcc2] text-[#c0281f]"
                  initial={{ scale: 2.4, opacity: 0, rotate: 20 }}
                  animate={{ scale: 1, opacity: 1, rotate: 12 }}
                  transition={{ type: "spring", stiffness: 300, damping: 12, delay: 0.9 }}
                >
                  <span className="text-center leading-none">
                    <span className="text-display block text-3xl">{w.victim.goals}</span>
                    <span className="block text-[10px] font-black tracking-widest">GOALS</span>
                  </span>
                </m.div>
              )}
            </m.div>
            <In d={1.2} className="mt-8 text-white/70">
              Your favourite victim this season.
            </In>
          </div>
        ),
      });

    if (w.partner)
      out.push({
        key: "partner",
        bg: ["#001f3a", "#000"],
        fx: "wipe",
        share: { card: "partner", label: "Share partner in crime" },
        body: (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Kicker color="#8AB4FF">Partner in crime</Kicker>
            <div className="relative mt-10 flex items-center justify-center">
              <m.span initial={{ x: -120, opacity: 0 }} animate={{ x: 12, opacity: 1 }} transition={{ type: "spring", stiffness: 140, damping: 16, delay: 0.2 }}>
                <Face who={w.player} size={124} ring="#D7FF3A" />
              </m.span>
              <m.span initial={{ x: 120, opacity: 0 }} animate={{ x: -12, opacity: 1 }} transition={{ type: "spring", stiffness: 140, damping: 16, delay: 0.2 }}>
                <Face who={w.partner} size={124} ring="#8AB4FF" />
              </m.span>
              <m.span
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-1/2 size-40 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{ background: "radial-gradient(circle, rgba(255,255,255,0.8), rgba(138,180,255,0.3) 30%, transparent 65%)" }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.4, 1], opacity: [0, 1, 0] }}
                transition={{ duration: 1.1, delay: 0.75 }}
              />
            </div>
            <In d={1} className="mt-8">
              <p className="text-display text-4xl">
                {first} <span className="text-white/40">+</span> {w.partner.name}
              </p>
            </In>
            <m.div className="mt-6 rounded-full bg-[#8AB4FF] px-6 py-3 text-black" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 14, delay: 1.3 }}>
              <span className="text-display text-3xl">{Math.round(w.partner.rate * 100)}%</span>
              <span className="ml-2 text-sm font-semibold">win rate together</span>
            </m.div>
            <In d={1.6} className="mt-4 text-sm text-white/60">
              {w.partner.wins} wins from {w.partner.together} matches side by side
            </In>
          </div>
        ),
      });

    out.push({
      key: "style",
      bg: ["#1d0a3a", "#000"],
      fx: "rise",
      body: (
        <div className="flex h-full flex-col justify-center">
          <Kicker color="#C9A7FF">Your game</Kicker>
          <In d={0.1} className="mt-2 flex items-baseline justify-between gap-3">
            <span className="text-display text-5xl capitalize">{w.player.position ?? "All-rounder"}</span>
            <span className="text-sm text-white/60">{w.avgRating.toFixed(1)} avg</span>
          </In>
          <div className="mt-4">
            <Radar data={w.radar} color="#C9A7FF" />
          </div>
          <p className="-mt-2 text-center text-[11px] text-white/45">Dashed ring = club average</p>
          {w.signature && (
            <In d={1.2} className="mt-5 flex items-center justify-between rounded-2xl bg-white/[0.06] px-5 py-4 ring-1 ring-white/10">
              <span>
                <span className="block text-xs text-white/60">Signature stat · {w.signature.label}</span>
                <span className="block text-sm text-white/80">{w.signature.rank === 1 ? "Best in the club" : `${ordinal(w.signature.rank)} in the club`}</span>
              </span>
              <span className="text-display text-4xl text-[#C9A7FF]">{w.signature.value}</span>
            </In>
          )}
        </div>
      ),
    });

    if (w.facts.length)
      out.push({
        key: "facts",
        bg: ["#003a33", "#000"],
        fx: "flip",
        body: (
          <div className="flex h-full flex-col justify-center" style={{ perspective: 1000 }}>
            <Kicker color="#7EE0C3">Fun facts</Kicker>
            <div className="mt-6 space-y-3">
              {w.facts.map((f, k) => (
                <m.div
                  key={f.title}
                  className="rounded-3xl bg-white/[0.06] p-5 ring-1 ring-white/10"
                  initial={{ rotateX: -70, opacity: 0, y: 20 }}
                  animate={{ rotateX: 0, opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: EASE, delay: 0.3 + k * 0.45 }}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7EE0C3]">{f.title}</p>
                  <p className="text-display mt-1 text-4xl">{f.value}</p>
                  <p className="mt-1 text-sm text-white/65">{f.sub}</p>
                </m.div>
              ))}
            </div>
          </div>
        ),
      });

    const shelf = [
      ...w.awards.season.map((s) => ({ k: s, v: 1, tone: "#DDB168", big: true })),
      { k: "Player of the Week", v: w.awards.potw, tone: "#DDB168", big: false },
      { k: "Hattricks", v: w.awards.hattricks, tone: "#D7FF3A", big: false },
      { k: "Maestro", v: w.awards.maestros, tone: "#8AB4FF", big: false },
      { k: "Player of the Weak", v: w.awards.weak, tone: "#FF453A", big: false },
    ];
    const won = shelf.some((x) => x.v > 0 && x.tone !== "#FF453A");
    out.push({
      key: "awards",
      bg: ["#3a2a00", "#000"],
      fx: "zoom",
      body: (
        <div className="relative flex h-full flex-col justify-center">
          {won && <Confetti />}
          <Kicker color="#DDB168">Silverware</Kicker>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {shelf.map((c, k) => (
              <m.div
                key={c.k}
                className={`relative overflow-hidden rounded-3xl p-4 ${c.big ? "col-span-2" : ""}`}
                style={{
                  background: c.v ? `linear-gradient(160deg, ${c.tone}2e, rgba(255,255,255,0.03))` : "rgba(255,255,255,0.03)",
                  boxShadow: `inset 0 0 0 1px ${c.v ? `${c.tone}55` : "rgba(255,255,255,0.08)"}`,
                }}
                initial={{ y: -120, opacity: 0, rotate: k % 2 ? 6 : -6 }}
                animate={{ y: 0, opacity: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 220, damping: 15, delay: 0.25 + k * 0.18 }}
              >
                <p className="text-display text-4xl leading-none" style={{ color: c.v ? c.tone : "rgba(255,255,255,0.25)" }}>
                  {c.big ? "Winner" : c.v}
                </p>
                <p className={`mt-2 text-sm font-semibold ${c.v ? "" : "text-white/35"}`}>{c.k}</p>
              </m.div>
            ))}
          </div>
          {w.awards.weak > 0 && (
            <In d={1.6} className="mt-4 text-sm text-white/60">
              …and yes, the Weak ones count too.
            </In>
          )}
        </div>
      ),
    });

    out.push({
      key: "nickname",
      bg: ["#000", `${arch.color}66`],
      fx: "zoom",
      ms: 8000,
      share: { card: "nickname", label: "Share your nickname" },
      body: (
        <div className="flex h-full flex-col items-center justify-center text-center" style={{ perspective: 1200 }}>
          <In>
            <Kicker>This season, you were</Kicker>
          </In>
          <m.div
            className="holo relative mt-6 w-full max-w-[300px] overflow-hidden rounded-[30px] p-6 text-left"
            style={{ background: `linear-gradient(160deg, ${arch.color}40, rgba(10,10,10,0.9) 55%)`, boxShadow: `0 0 0 1.5px ${arch.color}99, 0 40px 100px -30px ${arch.color}88` }}
            initial={{ rotateY: 200, opacity: 0, scale: 0.85 }}
            animate={{ rotateY: 0, opacity: 1, scale: 1 }}
            transition={{ duration: 1.3, ease: EASE, delay: 0.5 }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-display text-5xl leading-none" style={{ color: arch.color }}>
                  {w.avgRating.toFixed(1)}
                </p>
                <p className="mt-1 text-xs font-bold uppercase tracking-widest text-white/70">{w.player.position ?? "—"}</p>
              </div>
              <span className="text-display text-4xl text-white/25">{w.player.number != null ? `#${w.player.number}` : ""}</span>
            </div>
            <div className="mt-4 flex justify-center">
              <Face who={w.player} size={120} ring={arch.color} />
            </div>
            <p className="text-display mt-4 text-center text-3xl">{w.player.name}</p>
            <p className="text-display mt-1 text-center text-2xl" style={{ color: arch.color }}>
              {arch.title}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-1 border-t border-white/15 pt-3 text-center">
              {w.archetypeStats.map((s) => (
                <div key={s.label}>
                  <p className="text-display text-xl tabular-nums">{s.value}</p>
                  <p className="text-[10px] uppercase tracking-wider text-white/55">{s.label}</p>
                </div>
              ))}
            </div>
          </m.div>
          <In d={1.6} className="mt-5 text-sm text-white/70">
            {arch.blurb}
          </In>
        </div>
      ),
    });

    out.push({
      key: "club",
      bg: ["#002a1c", "#000"],
      fx: "wipe",
      share: { card: "club", label: "Share club season" },
      body: (
        <div className="flex h-full flex-col justify-center">
          <Kicker color="#7EE0C3">Revorfest · {w.season.name}</Kicker>
          <div className="mt-5 grid grid-cols-3 text-center">
            {[
              { k: "Wins", v: w.club.record.W, c: "text-accent" },
              { k: "Draws", v: w.club.record.D, c: "" },
              { k: "Losses", v: w.club.record.L, c: "text-depleted" },
            ].map((x, k) => (
              <In key={x.k} d={0.15 + k * 0.12}>
                <p className={`text-display text-6xl ${x.c}`}>
                  <CountUp to={x.v} delay={0.3 + k * 0.12} />
                </p>
                <p className="text-xs uppercase tracking-widest text-white/50">{x.k}</p>
              </In>
            ))}
          </div>
          <m.div className="mt-6 flex h-3 overflow-hidden rounded-full" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} style={{ transformOrigin: "left" }} transition={{ duration: 1, ease: EASE, delay: 0.6 }}>
            <span className="bg-accent" style={{ flex: w.club.record.W }} />
            <span className="bg-white/40" style={{ flex: w.club.record.D }} />
            <span className="bg-depleted" style={{ flex: w.club.record.L }} />
          </m.div>
          <In d={0.8} className="mt-3 text-center text-sm text-white/70">
            {w.club.gf} scored · {w.club.ga} conceded · {w.club.matches} matches
          </In>
          <div className="mt-7 space-y-2">
            {w.club.top.map((t, k) => (
              <In key={t.name} d={1 + k * 0.15}>
                <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${k === 0 ? "bg-gold/15 ring-1 ring-gold/40" : "bg-white/[0.06]"}`}>
                  <span className={`w-5 font-semibold ${k === 0 ? "text-gold" : "text-white/50"}`}>{k + 1}</span>
                  <Face who={t} size={40} ring={k === 0 ? "#DDB168" : "rgba(255,255,255,0.15)"} />
                  <span className="min-w-0 flex-1 truncate font-semibold">{t.name}</span>
                  <span className={`font-semibold tabular-nums ${k === 0 ? "text-gold" : ""}`}>{t.rating.toFixed(1)}</span>
                </div>
              </In>
            ))}
          </div>
        </div>
      ),
    });

    out.push({
      key: "summary",
      bg: [`${arch.color}55`, "#000"],
      fx: "zoom",
      ms: 9000,
      share: { card: "summary", label: "Share my Wrapped" },
      body: (
        <div className="flex h-full flex-col justify-center">
          <m.div
            className="gold-sheen relative overflow-hidden rounded-[32px] p-6 ring-1 ring-white/15"
            style={{ background: `linear-gradient(170deg, ${arch.color}33, rgba(255,255,255,0.04) 45%, rgba(0,0,0,0.4))` }}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.9, ease: EASE }}
          >
            {w.player.number != null && (
              <span aria-hidden className="text-display pointer-events-none absolute -right-4 -top-8 text-[160px] leading-none" style={{ color: `${arch.color}22` }}>
                {w.player.number}
              </span>
            )}
            <Kicker color={arch.color}>{w.season.name} · Wrapped</Kicker>
            <div className="mt-4 flex items-center gap-4">
              <Face who={w.player} size={76} ring={arch.color} />
              <div className="min-w-0">
                <p className="truncate text-3xl font-semibold">{w.player.name}</p>
                <p className="text-display text-xl" style={{ color: arch.color }}>
                  {arch.title}
                </p>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-y-5 text-center">
              {(
                [
                  ["Matches", w.matches],
                  ["Goals", w.goals],
                  ["Assists", w.assists],
                  ["Rating", w.avgRating.toFixed(1)],
                  ["MOTM", w.motm],
                  ["POTW", w.awards.potw],
                ] as const
              ).map(([k, v], idx) => (
                <In key={k} d={0.3 + idx * 0.08}>
                  <p className="text-display text-3xl tabular-nums">{v}</p>
                  <p className="text-[10px] uppercase tracking-widest text-white/55">{k}</p>
                </In>
              ))}
            </div>
            <div className="mt-6 space-y-1.5 border-t border-white/10 pt-4 text-sm text-white/80">
              {w.best && (
                <p>
                  Best night · <b className="text-white">{w.best.rating.toFixed(1)}</b> vs {w.best.opponent}
                </p>
              )}
              {w.partner && <p>Partner in crime · {w.partner.name}</p>}
              {w.victim && <p>Favourite victim · {w.victim.opponent}</p>}
            </div>
          </m.div>
          <In d={1} className="mt-5 text-center text-sm text-white/55">
            See you next season · #WeAreRevorfest
          </In>
        </div>
      ),
    });
    return out;
  }, [w, arch, first]);

  const last = slides.length - 1;
  const go = useCallback((d: number) => setI((x) => Math.min(Math.max(x + d, 0), last)), [last]);
  const slideMs = slides[i]?.ms ?? SLIDE_MS;

  const started = useRef(0);
  const elapsed = useRef(0);
  useEffect(() => {
    elapsed.current = 0;
    setProgress(0);
  }, [i]);
  useEffect(() => {
    if (paused) return;
    started.current = performance.now() - elapsed.current;
    let raf = 0;
    const tick = (t: number) => {
      elapsed.current = t - started.current;
      const p = Math.min(elapsed.current / slideMs, 1);
      setProgress(p);
      if (p >= 1) {
        if (i < last) go(1);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [i, paused, go, last, slideMs]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") go(1);
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [go]);

  function close() {
    if (window.history.length > 1) router.back();
    else router.push(w.player.slug ? `/squad/${w.player.slug}` : "/");
  }

  const s = slides[i];
  const downAt = useRef(0);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="fixed inset-0 z-[80] bg-black" />;

  // portalled to <body>: page-transition wrappers use transforms, which would break position:fixed
  return createPortal(
    <div className="fixed inset-0 z-[80] overflow-hidden bg-black text-chalk">
      <m.div
        aria-hidden
        className="absolute inset-0"
        animate={{ background: `radial-gradient(120% 80% at 20% 0%, ${s.bg[0]}, transparent 70%), radial-gradient(90% 70% at 100% 100%, ${s.bg[1]}, #000 80%)` }}
        transition={{ duration: 1.2, ease: EASE }}
      />
      <div aria-hidden className="ken-burns absolute -inset-10 opacity-40" style={{ background: "radial-gradient(40% 30% at 70% 30%, rgba(255,255,255,0.08), transparent 70%)" }} />

      <div className="relative mx-auto flex h-full max-w-md flex-col px-6 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-[calc(env(safe-area-inset-top)+14px)]">
        <div className="flex gap-1.5">
          {slides.map((x, k) => (
            <div key={x.key} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-white" style={{ width: k < i ? "100%" : k === i ? `${progress * 100}%` : "0%" }} />
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">Revorfest · {w.season.name}</p>
          <button onClick={close} aria-label="Close" className="grid size-9 place-items-center rounded-full bg-white/10 transition active:scale-95">
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div
          className="relative flex-1 select-none"
          style={{ perspective: 1400 }}
          onPointerDown={() => {
            downAt.current = performance.now();
            setPaused(true);
          }}
          onPointerUp={(e) => {
            setPaused(false);
            if (performance.now() - downAt.current > 350) return;
            const r = e.currentTarget.getBoundingClientRect();
            go(e.clientX - r.left < r.width * 0.3 ? -1 : 1);
          }}
          onPointerLeave={() => setPaused(false)}
        >
          <AnimatePresence mode="wait">
            <m.div key={s.key} className="absolute inset-0" variants={ENTER[s.fx]} initial="hidden" animate="show" exit="exit" transition={{ duration: 0.55, ease: EASE }}>
              {s.body}
            </m.div>
          </AnimatePresence>
        </div>

        <div className="flex min-h-12 items-center justify-between gap-3" onPointerDown={(e) => e.stopPropagation()}>
          {s.share && w.player.slug ? (
            <div onClick={() => setPaused(true)}>
              <ShareButton
                url={`/share/wrapped?season=${w.season.n}&slug=${w.player.slug}&card=${s.share.card}`}
                filename={`revorfest-wrapped-s${w.season.n}-${s.share.card}.png`}
                title={`${w.player.name} · ${w.season.name} Wrapped`}
                label={s.share.label}
                className="bg-white py-2.5 text-black"
              />
            </div>
          ) : (
            <span />
          )}
          {i === last ? (
            <Link href={w.player.slug ? `/squad/${w.player.slug}` : "/"} className="rounded-full bg-white/10 px-4 py-2.5 text-sm font-semibold">
              Done
            </Link>
          ) : (
            <span className="text-xs text-white/50">Tap to continue</span>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
