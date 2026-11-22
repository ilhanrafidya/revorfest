"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, animate, m, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ARCHETYPES, type Mate, type Wrapped } from "@/lib/wrapped-meta";
import { ShareButton } from "./share-button";

const SLIDE_MS = 6500;
const EASE = [0.22, 1, 0.36, 1] as const;

type Slide = { key: string; bg: [string, string]; share?: { card: string; label: string }; body: ReactNode };

/* ── small building blocks ─────────────────────────────────── */

function CountUp({ to, decimals = 0, delay = 0.25 }: { to: number; decimals?: number; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce) {
      el.textContent = to.toFixed(decimals);
      return;
    }
    const c = animate(0, to, { duration: 1.4, delay, ease: EASE, onUpdate: (v) => (el.textContent = v.toFixed(decimals)) });
    return () => c.stop();
  }, [to, decimals, delay, reduce]);
  return (
    <span ref={ref} className="tabular-nums">
      {(0).toFixed(decimals)}
    </span>
  );
}

function In({ children, d = 0, className = "" }: { children: ReactNode; d?: number; className?: string }) {
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.7, ease: EASE, delay: d }}
    >
      {children}
    </m.div>
  );
}

function Face({ who, size = 96, ring = "rgba(255,255,255,0.25)" }: { who: Mate; size?: number; ring?: string }) {
  return (
    <span
      className="grid shrink-0 place-items-center overflow-hidden rounded-full bg-white/10 font-bold"
      style={{ width: size, height: size, boxShadow: `0 0 0 3px ${ring}`, fontSize: size / 3 }}
    >
      {who.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={who.avatar} alt="" className="size-full object-cover" />
      ) : (
        who.name.slice(0, 2).toUpperCase()
      )}
    </span>
  );
}

function Big({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`text-display text-[clamp(64px,22vw,128px)] leading-[0.9] tracking-tight ${className}`}>{children}</p>;
}

function Confetti() {
  const reduce = useReducedMotion();
  const bits = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        x: (i * 37) % 100,
        d: (i % 7) * 0.08,
        r: (i * 53) % 360,
        c: ["#D7FF3A", "#DDB168", "#8AB4FF", "#FF9F43", "#F5F5F7"][i % 5],
        w: 6 + (i % 3) * 3,
      })),
    [],
  );
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
          transition={{ duration: 2.6 + (i % 4) * 0.35, delay: 0.2 + b.d, ease: "easeIn" }}
        />
      ))}
    </div>
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
      bg: ["#1b2a00", "#000"],
      body: (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <In>
            <Face who={w.player} size={132} ring="#D7FF3A" />
          </In>
          <In d={0.25} className="mt-8">
            <p className="eyebrow text-accent">Revorfest Wrapped</p>
          </In>
          <In d={0.45}>
            <h1 className="text-display mt-3 text-5xl leading-[0.95] md:text-6xl">
              {first},<br />
              this was your
              <br />
              <span className="text-gradient">{w.season.name}.</span>
            </h1>
          </In>
          {!w.season.finished && (
            <In d={0.7} className="mt-6">
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-mute">Preview · season still running</span>
            </In>
          )}
        </div>
      ),
    });
    out.push({
      key: "showing-up",
      bg: ["#2a1600", "#000"],
      body: (
        <div className="flex h-full flex-col justify-center">
          <In>
            <p className="text-2xl font-semibold text-white/70">You showed up for</p>
          </In>
          <In d={0.15}>
            <Big>
              <CountUp to={w.matches} />
            </Big>
            <p className="text-display text-4xl">matches</p>
          </In>
          <In d={0.6} className="mt-8 text-xl text-white/80">
            across <b className="text-white">{w.nights} nights</b> of football.
          </In>
          <In d={0.9} className="mt-3 text-xl text-white/80">
            {w.rank.matches === 1 ? "Nobody played more. 🔋" : `${ordinal(w.rank.matches)} most in the club out of ${w.clubPlayers}.`}
          </In>
        </div>
      ),
    });
    out.push({
      key: "goals",
      bg: ["#0f2a00", "#000"],
      share: { card: "goals", label: "Share goals" },
      body: (
        <div className="flex h-full flex-col justify-center">
          <In>
            <p className="text-2xl font-semibold text-white/70">You put away</p>
          </In>
          <In d={0.15}>
            <Big className="text-accent">
              <CountUp to={w.goals} />
            </Big>
            <p className="text-display text-4xl">goals</p>
          </In>
          <In d={0.55} className="mt-6">
            <p className="text-display text-5xl">
              <CountUp to={w.assists} delay={0.7} />
              <span className="ml-3 text-2xl font-semibold text-white/70">assists</span>
            </p>
          </In>
          <In d={0.9} className="mt-6 space-y-1 text-lg text-white/80">
            <p>
              Involved in <b className="text-white">{((w.goals + w.assists) / w.matches).toFixed(1)}</b> goals a match.
            </p>
            <p>
              {ordinal(w.rank.goals)} in goals · {ordinal(w.rank.assists)} in assists.
            </p>
          </In>
        </div>
      ),
    });
    if (w.best)
      out.push({
        key: "best",
        bg: ["#2a2200", "#000"],
        share: { card: "best", label: "Share best match" },
        body: (
          <div className="flex h-full flex-col justify-center">
            <In>
              <p className="text-2xl font-semibold text-white/70">Your best night</p>
            </In>
            <In d={0.2} className="mt-4">
              <Big className="text-gold">
                <CountUp to={w.best.rating} decimals={1} />
              </Big>
              <p className="mt-1 text-lg text-white/70">match rating</p>
            </In>
            <In d={0.6} className="mt-8 rounded-3xl bg-white/[0.07] p-5">
              <p className="text-sm text-mute">vs</p>
              <p className="truncate text-2xl font-semibold">{w.best.opponent}</p>
              <p className="mt-2 text-display text-4xl tabular-nums">
                {w.best.gf}–{w.best.ga}
              </p>
              <p className="mt-2 text-white/80">
                {w.best.goals} goals · {w.best.assists} assists ·{" "}
                {new Date(w.best.playedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Jakarta" })}
              </p>
            </In>
          </div>
        ),
      });
    if (w.victim)
      out.push({
        key: "victim",
        bg: ["#2a0008", "#000"],
        share: { card: "victim", label: "Share favourite victim" },
        body: (
          <div className="flex h-full flex-col justify-center">
            <In>
              <p className="text-2xl font-semibold text-white/70">Your favourite victim 😈</p>
            </In>
            <In d={0.25} className="mt-4">
              <p className="text-display text-[clamp(40px,12vw,72px)] leading-none break-words">{w.victim.opponent}</p>
            </In>
            <In d={0.6} className="mt-8 text-xl text-white/80">
              {w.victim.goals > 0 ? (
                <p>
                  You scored <b className="text-white">{w.victim.goals}</b> against them.
                </p>
              ) : (
                <p>You kept beating them.</p>
              )}
              <p className="mt-2">
                Record: <b className="text-accent">{w.victim.W}W</b> {w.victim.D}D <b className="text-depleted">{w.victim.L}L</b>
              </p>
            </In>
          </div>
        ),
      });
    if (w.partner)
      out.push({
        key: "partner",
        bg: ["#001a2a", "#000"],
        share: { card: "partner", label: "Share partner in crime" },
        body: (
          <div className="flex h-full flex-col justify-center">
            <In>
              <p className="text-2xl font-semibold text-white/70">Partner in crime</p>
            </In>
            <In d={0.25} className="mt-8 flex items-center">
              <Face who={w.player} size={104} />
              <m.span
                className="-ml-5"
                initial={{ x: 40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.8, ease: EASE, delay: 0.5 }}
              >
                <Face who={w.partner} size={104} ring="#8AB4FF" />
              </m.span>
            </In>
            <In d={0.7} className="mt-6">
              <p className="text-display text-5xl">{w.partner.name}</p>
            </In>
            <In d={0.9} className="mt-4 text-xl text-white/80">
              <p>
                Together you won <b className="text-white">{Math.round(w.partner.rate * 100)}%</b>
              </p>
              <p className="mt-1">
                {w.partner.wins} wins from {w.partner.together} matches side by side.
              </p>
            </In>
          </div>
        ),
      });
    out.push({
      key: "style",
      bg: ["#14002a", "#000"],
      body: (
        <div className="flex h-full flex-col justify-center">
          <In>
            <p className="text-2xl font-semibold text-white/70">Your home on the pitch</p>
          </In>
          <In d={0.2}>
            <Big>{w.player.position ?? "—"}</Big>
          </In>
          {w.signature && (
            <In d={0.6} className="mt-10 rounded-3xl bg-white/[0.07] p-5">
              <p className="eyebrow">Signature stat</p>
              <p className="text-display mt-2 text-5xl">{w.signature.value}</p>
              <p className="mt-1 text-white/80">
                {w.signature.label} · {w.signature.rank === 1 ? "best in the club" : `${ordinal(w.signature.rank)} in the club`}
              </p>
            </In>
          )}
          <In d={0.9} className="mt-6 text-lg text-white/80">
            {w.avgRating.toFixed(1)} average rating · {w.motm} Man of the Match
          </In>
        </div>
      ),
    });
    const cab = [
      ...w.awards.season.map((s) => ({ k: s, v: "👑", gold: true })),
      { k: "Player of the Week", v: String(w.awards.potw), gold: false },
      { k: "Hattricks", v: String(w.awards.hattricks), gold: false },
      { k: "Maestro (3+ assists)", v: String(w.awards.maestros), gold: false },
      { k: "Player of the Weak", v: String(w.awards.weak), gold: false },
    ];
    out.push({
      key: "awards",
      bg: ["#2a1f00", "#000"],
      body: (
        <div className="relative flex h-full flex-col justify-center">
          {(w.awards.potw > 0 || w.awards.hattricks > 0 || w.awards.maestros > 0 || w.awards.season.length > 0) && <Confetti />}
          <In>
            <p className="text-2xl font-semibold text-white/70">Silverware</p>
          </In>
          <div className="mt-6 space-y-3">
            {cab.map((c, k) => (
              <In key={c.k} d={0.2 + k * 0.12}>
                <div className={`flex items-center justify-between rounded-2xl px-5 py-4 ${c.gold ? "bg-gold/20 ring-1 ring-gold/50" : "bg-white/[0.07]"}`}>
                  <span className={`text-lg font-semibold ${c.gold ? "text-gold" : ""}`}>{c.k}</span>
                  <span className="text-display text-3xl tabular-nums">{c.v}</span>
                </div>
              </In>
            ))}
          </div>
          {w.awards.weak > 0 && (
            <In d={0.9} className="mt-5 text-white/70">
              …and yes, the Weak ones count too 🤡
            </In>
          )}
        </div>
      ),
    });
    out.push({
      key: "nickname",
      bg: ["#000", arch.color + "55"],
      share: { card: "nickname", label: "Share your nickname" },
      body: (
        <div className="flex h-full flex-col items-center justify-center text-center" style={{ perspective: 1200 }}>
          <In>
            <p className="text-2xl font-semibold text-white/70">This season, you were…</p>
          </In>
          <m.div
            className="gold-sheen mt-8 w-full max-w-sm rounded-[32px] p-7"
            style={{ background: `linear-gradient(160deg, ${arch.color}33, rgba(255,255,255,0.04))`, boxShadow: `0 0 0 1px ${arch.color}66, 0 30px 80px -20px ${arch.color}55` }}
            initial={{ rotateY: 180, opacity: 0, scale: 0.9 }}
            animate={{ rotateY: 0, opacity: 1, scale: 1 }}
            transition={{ duration: 1.1, ease: EASE, delay: 0.7 }}
          >
            <p className="text-6xl">{arch.emoji}</p>
            <p className="text-display mt-4 text-5xl" style={{ color: arch.color }}>
              {arch.title}
            </p>
            <p className="mt-3 text-white/80">{arch.blurb}</p>
            <div className="mt-6 grid grid-cols-3 gap-2">
              {w.archetypeStats.map((s) => (
                <div key={s.label} className="rounded-2xl bg-black/30 px-2 py-3">
                  <p className="text-display text-2xl tabular-nums">{s.value}</p>
                  <p className="text-[11px] text-white/60">{s.label}</p>
                </div>
              ))}
            </div>
          </m.div>
        </div>
      ),
    });
    out.push({
      key: "club",
      bg: ["#001f14", "#000"],
      share: { card: "club", label: "Share club season" },
      body: (
        <div className="flex h-full flex-col justify-center">
          <In>
            <p className="text-2xl font-semibold text-white/70">Revorfest's {w.season.name}</p>
          </In>
          <In d={0.2} className="mt-6 grid grid-cols-3 text-center">
            <div>
              <p className="text-display text-5xl text-accent">
                <CountUp to={w.club.record.W} />
              </p>
              <p className="text-sm text-mute">Wins</p>
            </div>
            <div>
              <p className="text-display text-5xl">
                <CountUp to={w.club.record.D} />
              </p>
              <p className="text-sm text-mute">Draws</p>
            </div>
            <div>
              <p className="text-display text-5xl text-depleted">
                <CountUp to={w.club.record.L} />
              </p>
              <p className="text-sm text-mute">Losses</p>
            </div>
          </In>
          <In d={0.45} className="mt-4 text-center text-lg text-white/80">
            {w.club.gf} scored · {w.club.ga} conceded · {w.club.matches} matches
          </In>
          <div className="mt-8 space-y-2">
            {w.club.top.map((t, k) => (
              <In key={t.name} d={0.6 + k * 0.15}>
                <div className="flex items-center gap-3 rounded-2xl bg-white/[0.07] px-4 py-3">
                  <span className={`w-5 font-semibold ${k === 0 ? "text-gold" : "text-mute"}`}>{k + 1}</span>
                  <Face who={t} size={40} ring={k === 0 ? "#DDB168" : "rgba(255,255,255,0.15)"} />
                  <span className="min-w-0 flex-1 truncate font-semibold">{t.name}</span>
                  <span className="font-semibold tabular-nums">{t.rating.toFixed(1)}</span>
                </div>
              </In>
            ))}
          </div>
        </div>
      ),
    });
    out.push({
      key: "summary",
      bg: [arch.color + "40", "#000"],
      share: { card: "summary", label: "Share my Wrapped" },
      body: (
        <div className="flex h-full flex-col justify-center">
          <In className="gold-sheen rounded-[32px] bg-white/[0.07] p-6 ring-1 ring-white/10">
            <div className="flex items-center gap-4">
              <Face who={w.player} size={72} ring={arch.color} />
              <div className="min-w-0">
                <p className="eyebrow">{w.season.name} Wrapped</p>
                <p className="truncate text-2xl font-semibold">{w.player.name}</p>
                <p className="text-sm" style={{ color: arch.color }}>
                  {arch.emoji} {arch.title}
                </p>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-y-5 text-center">
              {[
                ["Matches", w.matches],
                ["Goals", w.goals],
                ["Assists", w.assists],
                ["Rating", w.avgRating.toFixed(1)],
                ["MOTM", w.motm],
                ["POTW", w.awards.potw],
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="text-display text-3xl tabular-nums">{v}</p>
                  <p className="text-[11px] text-mute">{k}</p>
                </div>
              ))}
            </div>
            {w.best && (
              <p className="mt-6 border-t border-white/10 pt-4 text-sm text-white/80">
                Best night: <b className="text-white">{w.best.rating.toFixed(1)}</b> vs {w.best.opponent}
              </p>
            )}
            {w.partner && <p className="mt-1 text-sm text-white/80">Partner in crime: {w.partner.name}</p>}
          </In>
          <In d={0.5} className="mt-6 text-center text-white/60">
            See you next season. #WeAreRevorfest
          </In>
        </div>
      ),
    });
    return out;
  }, [w, arch, first]);

  const last = slides.length - 1;
  const go = useCallback((d: number) => setI((x) => Math.min(Math.max(x + d, 0), last)), [last]);

  // auto-advance with a pausable timer
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
      const p = Math.min(elapsed.current / SLIDE_MS, 1);
      setProgress(p);
      if (p >= 1) {
        if (i < last) go(1);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [i, paused, go, last]);

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
      {/* living background */}
      <m.div
        aria-hidden
        className="absolute inset-0"
        animate={{ background: `radial-gradient(120% 80% at 20% 0%, ${s.bg[0]}, transparent 70%), radial-gradient(90% 70% at 100% 100%, ${s.bg[1]}, #000 80%)` }}
        transition={{ duration: 1.2, ease: EASE }}
      />
      <div aria-hidden className="ken-burns absolute -inset-10 opacity-40" style={{ background: "radial-gradient(40% 30% at 70% 30%, rgba(255,255,255,0.08), transparent 70%)" }} />

      <div className="relative mx-auto flex h-full max-w-md flex-col px-6 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-[calc(env(safe-area-inset-top)+14px)]">
        {/* progress */}
        <div className="flex gap-1.5">
          {slides.map((x, k) => (
            <div key={x.key} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-white" style={{ width: k < i ? "100%" : k === i ? `${progress * 100}%` : "0%" }} />
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs font-semibold tracking-[0.18em] text-white/70 uppercase">Revorfest · {w.season.name}</p>
          <button onClick={close} aria-label="Close" className="grid size-9 place-items-center rounded-full bg-white/10 transition active:scale-95">
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        {/* slide */}
        <div
          className="relative flex-1 select-none"
          onPointerDown={() => {
            downAt.current = performance.now();
            setPaused(true);
          }}
          onPointerUp={(e) => {
            setPaused(false);
            if (performance.now() - downAt.current > 350) return; // that was a hold
            const r = e.currentTarget.getBoundingClientRect();
            go(e.clientX - r.left < r.width * 0.3 ? -1 : 1);
          }}
          onPointerLeave={() => setPaused(false)}
        >
          <AnimatePresence mode="wait">
            <m.div
              key={s.key}
              className="absolute inset-0"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02, filter: "blur(6px)" }}
              transition={{ duration: 0.4, ease: EASE }}
            >
              {s.body}
            </m.div>
          </AnimatePresence>
        </div>

        {/* footer */}
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
