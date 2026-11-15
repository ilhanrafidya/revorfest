"use client";

import { AnimatePresence, m } from "motion/react";
import { Jersey } from "./jersey";
import { Reveal } from "./motion-primitives";
import { useKit } from "./kit-provider";
import { KITS, KIT_ORDER } from "@/lib/kits";
import { EASE, SPRING_SNAPPY } from "@/lib/motion";

export function CurrentKitChip() {
  const { kit } = useKit();
  return (
    <div className="flex shrink-0 flex-col items-center gap-1">
      <AnimatePresence mode="wait" initial={false}>
        <m.div
          key={kit}
          initial={{ opacity: 0, y: 8, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.9 }}
          transition={{ duration: 0.35, ease: EASE }}
        >
          <Jersey kit={kit} className="size-20 md:size-24" />
        </m.div>
      </AnimatePresence>
      <span className="text-xs text-mute">{KITS[kit].label} kit</span>
    </div>
  );
}

export function KitShowcase() {
  const { kit, setKit } = useKit();
  const info = KITS[kit];

  return (
    <section className="mx-auto max-w-6xl px-5 pb-28 text-center md:pb-40">
      <Reveal blur>
        <p className="eyebrow">Matchday kits</p>
        <h2 className="text-display mt-3 text-5xl md:text-7xl">
          Three kits.
          <br />
          <span className="text-mute">One identity.</span>
        </h2>
      </Reveal>

      <div className="relative mx-auto mt-10 aspect-square w-full max-w-[420px] md:mt-14">
        <div
          aria-hidden
          className="absolute inset-[10%] rounded-full blur-3xl transition-[background] duration-700"
          style={{ background: "color-mix(in oklab, var(--glow) 55%, transparent)" }}
        />
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={kit}
            initial={{ opacity: 0, y: 28, scale: 0.94, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -18, scale: 0.96, filter: "blur(8px)" }}
            transition={{ duration: 0.5, ease: EASE }}
            className="relative size-full"
          >
            <Jersey kit={kit} className="size-full drop-shadow-[0_30px_60px_rgba(0,0,0,0.6)]" />
          </m.div>
        </AnimatePresence>
      </div>

      <div className="min-h-[72px]">
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={kit}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            <p className="text-2xl font-semibold tracking-tight">
              {info.label} <span className="text-mute">· {info.name}</span>
            </p>
            <p className="mt-2 text-mute">{info.tagline}</p>
          </m.div>
        </AnimatePresence>
      </div>

      <div role="radiogroup" aria-label="Kit" className="glass hairline mt-8 inline-flex rounded-full p-1.5">
        {KIT_ORDER.map((k) => {
          const active = k === kit;
          return (
            <button
              key={k}
              role="radio"
              aria-checked={active}
              onClick={() => setKit(k)}
              className={`relative flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors ${
                active ? "text-chalk" : "text-mute hover:text-chalk"
              }`}
            >
              {active && (
                <m.span layoutId="kit-pill" transition={SPRING_SNAPPY} className="absolute inset-0 rounded-full bg-white/12" />
              )}
              <span
                className="relative size-3.5 rounded-full ring-1 ring-white/25"
                style={{ background: `linear-gradient(135deg, ${KITS[k].swatch[0]} 50%, ${KITS[k].swatch[1]} 50%)` }}
              />
              <span className="relative">{KITS[k].label}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-mute">Tap a kit to re-tint the whole app.</p>
    </section>
  );
}
