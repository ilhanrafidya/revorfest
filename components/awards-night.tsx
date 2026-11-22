"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { NightAward, Nominee } from "@/lib/awards-night-meta";
import { ShareButton } from "./share-button";

const EASE = [0.22, 1, 0.36, 1] as const;
type Phase = "nominees" | "drumroll" | "winner";

function Face({ who, size, ring }: { who: Nominee; size: number; ring: string }) {
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

function Confetti({ color }: { color: string }) {
  const reduce = useReducedMotion();
  const bits = useMemo(
    () => Array.from({ length: 36 }, (_, i) => ({ x: (i * 29) % 100, d: (i % 9) * 0.06, r: (i * 47) % 360, c: [color, "#F5F5F7", "#DDB168"][i % 3], w: 6 + (i % 3) * 3 })),
    [color],
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
          animate={{ y: "105vh", rotate: b.r + 600, opacity: [0, 1, 1, 0] }}
          transition={{ duration: 2.8 + (i % 4) * 0.3, delay: b.d, ease: "easeIn" }}
        />
      ))}
    </div>
  );
}

export function AwardsNight({ season, awards, preview }: { season: { n: number; name: string }; awards: NightAward[]; preview: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState(-1); // -1 intro, awards.length = finale
  const [phase, setPhase] = useState<Phase>("nominees");
  const [spot, setSpot] = useState(0);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const a = step >= 0 && step < awards.length ? awards[step] : null;
  // show nominees in a neutral order so the winner isn't obviously first
  const order = useMemo(() => (a ? [...a.nominees].sort((x, y) => x.name.localeCompare(y.name)) : []), [a]);
  const winnerAt = a ? order.indexOf(a.nominees[0]) : 0;

  useEffect(() => {
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, []);

  // drumroll: the spotlight hops between nominees, slowing down, then lands on the winner
  useEffect(() => {
    if (phase !== "drumroll" || !order.length) return;
    let k = 0;
    const hops = order.length * 3 + winnerAt + 1;
    let t: ReturnType<typeof setTimeout>;
    const hop = () => {
      setSpot(k % order.length);
      k++;
      if (k >= hops) {
        t = setTimeout(() => setPhase("winner"), 450);
        return;
      }
      t = setTimeout(hop, 90 + k * 14);
    };
    hop();
    return () => clearTimeout(t);
  }, [phase, order.length, winnerAt]);

  function next() {
    setPhase("nominees");
    setSpot(0);
    setStep((s) => Math.min(s + 1, awards.length));
  }
  function close() {
    if (window.history.length > 1) router.back();
    else router.push("/stats");
  }

  if (!mounted) return <div className="fixed inset-0 z-[80] bg-black" />;

  const accent = a?.color ?? "#DDB168";
  return createPortal(
    <div className="fixed inset-0 z-[80] overflow-hidden bg-black text-chalk">
      <m.div
        aria-hidden
        className="absolute inset-0"
        animate={{ background: `radial-gradient(90% 60% at 50% 0%, ${accent}${phase === "winner" ? "55" : "2a"}, #000 72%)` }}
        transition={{ duration: 1, ease: EASE }}
      />
      {/* stage lights */}
      <div aria-hidden className="ken-burns absolute -inset-20 opacity-30" style={{ background: "conic-gradient(from 200deg at 50% -10%, transparent, rgba(255,255,255,0.12), transparent 30%)" }} />

      <div className="relative mx-auto flex h-full max-w-md flex-col px-6 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-[calc(env(safe-area-inset-top)+16px)]">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
            Awards night · {season.name}
            {preview && " · preview"}
          </p>
          <button onClick={close} aria-label="Close" className="grid size-9 place-items-center rounded-full bg-white/10 transition active:scale-95">
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        {step >= 0 && step < awards.length && (
          <div className="mt-3 flex gap-1.5">
            {awards.map((x, k) => (
              <span key={x.key} className={`h-[3px] flex-1 rounded-full ${k < step ? "bg-white" : k === step ? "bg-white/60" : "bg-white/15"}`} />
            ))}
          </div>
        )}

        <div className="relative flex flex-1 flex-col justify-center">
          <AnimatePresence mode="wait">
            {step === -1 && (
              <m.div key="intro" className="text-center" initial={{ opacity: 0, y: 20, filter: "blur(10px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, scale: 1.04, filter: "blur(8px)" }} transition={{ duration: 0.8, ease: EASE }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/crest.png" alt="" className="mx-auto size-28" />
                <p className="eyebrow mt-8 text-gold">Revorfest presents</p>
                <h1 className="text-display mt-3 text-5xl leading-[0.95]">
                  Awards Night
                  <br />
                  <span className="text-gradient">{season.name}</span>
                </h1>
                <p className="mt-5 text-white/70">{awards.length} awards. One stage. Tap to begin.</p>
              </m.div>
            )}

            {a && (
              <m.div key={a.key} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16, filter: "blur(6px)" }} transition={{ duration: 0.6, ease: EASE }}>
                <p className="text-sm text-white/60">
                  Award {step + 1} of {awards.length}
                </p>
                <h2 className="text-display mt-2 text-5xl leading-[0.95]" style={{ color: a.color }}>
                  {a.title}
                </h2>
                <p className="mt-2 text-white/70">{a.tagline}</p>

                {phase !== "winner" ? (
                  <div className="mt-8 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">The nominees</p>
                    {order.map((n, k) => {
                      const lit = phase === "drumroll" && spot === k;
                      return (
                        <m.div
                          key={n.name}
                          initial={{ opacity: 0, x: -16 }}
                          animate={{ opacity: phase === "drumroll" && !lit ? 0.35 : 1, x: 0, scale: lit ? 1.03 : 1 }}
                          transition={{ duration: phase === "drumroll" ? 0.12 : 0.5, delay: phase === "nominees" ? 0.2 + k * 0.15 : 0, ease: EASE }}
                          className="flex items-center gap-4 rounded-2xl bg-white/[0.06] px-4 py-3"
                          style={{ boxShadow: lit ? `0 0 0 2px ${a.color}` : "none" }}
                        >
                          <Face who={n} size={48} ring={lit ? a.color : "rgba(255,255,255,0.15)"} />
                          <span className="min-w-0 flex-1 truncate text-lg font-semibold">{n.name}</span>
                          <span className="text-right">
                            <span className="block font-semibold tabular-nums">{n.value}</span>
                            <span className="block text-[11px] text-mute">{n.matches} MP</span>
                          </span>
                        </m.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="relative mt-8" style={{ perspective: 1200 }}>
                    <Confetti color={a.color} />
                    <m.div
                      className="gold-sheen relative rounded-[32px] p-7 text-center"
                      style={{ background: `linear-gradient(160deg, ${a.color}33, rgba(255,255,255,0.04))`, boxShadow: `0 0 0 1px ${a.color}77, 0 30px 90px -20px ${a.color}66` }}
                      initial={{ rotateY: 90, opacity: 0, scale: 0.9 }}
                      animate={{ rotateY: 0, opacity: 1, scale: 1 }}
                      transition={{ duration: 0.9, ease: EASE }}
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: a.color }}>
                        And the winner is
                      </p>
                      <div className="mt-6 flex justify-center">
                        <Face who={a.nominees[0]} size={132} ring={a.color} />
                      </div>
                      <p className="text-display mt-5 text-5xl">{a.nominees[0].name}</p>
                      <p className="mt-2 text-white/80">
                        <span className="text-display text-3xl tabular-nums" style={{ color: a.color }}>
                          {a.nominees[0].value}
                        </span>{" "}
                        {a.unit} · {a.nominees[0].matches} MP
                      </p>
                    </m.div>
                  </div>
                )}
              </m.div>
            )}

            {step === awards.length && (
              <m.div key="finale" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
                <p className="eyebrow text-gold">That&apos;s a wrap</p>
                <h2 className="text-display mt-2 text-4xl">{season.name} winners</h2>
                <div className="mt-6 space-y-2">
                  {awards.map((x, k) => (
                    <m.div key={x.key} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + k * 0.1, duration: 0.5, ease: EASE }} className="flex items-center gap-3 rounded-2xl bg-white/[0.06] px-4 py-3">
                      <Face who={x.nominees[0]} size={40} ring={x.color} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: x.color }}>
                          {x.title}
                        </span>
                        <span className="block truncate font-semibold">{x.nominees[0].name}</span>
                      </span>
                      <span className="font-semibold tabular-nums">{x.nominees[0].value}</span>
                    </m.div>
                  ))}
                </div>
              </m.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex min-h-12 items-center justify-between gap-3">
          {a && phase === "winner" ? (
            <ShareButton
              url={`/share/night?season=${season.n}&key=${a.key}`}
              filename={`revorfest-s${season.n}-${a.key}.png`}
              title={`${a.title} · ${season.name}`}
              label="Share winner"
              className="bg-white py-2.5 text-black"
            />
          ) : (
            <span />
          )}
          {step === -1 && (
            <button onClick={next} className="rounded-full bg-gold px-6 py-3 font-semibold text-black transition active:scale-95">
              Begin
            </button>
          )}
          {a && phase === "nominees" && (
            <button onClick={() => setPhase("drumroll")} className="rounded-full px-6 py-3 font-semibold text-black transition active:scale-95" style={{ background: a.color }}>
              Reveal winner
            </button>
          )}
          {a && phase === "drumroll" && <span className="text-sm text-white/60">Drumroll…</span>}
          {a && phase === "winner" && (
            <button onClick={next} className="rounded-full bg-white/10 px-5 py-3 font-semibold transition active:scale-95">
              {step === awards.length - 1 ? "Finish" : "Next award"}
            </button>
          )}
          {step === awards.length && (
            <Link href="/stats" className="rounded-full bg-white/10 px-5 py-3 font-semibold">
              Done
            </Link>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
