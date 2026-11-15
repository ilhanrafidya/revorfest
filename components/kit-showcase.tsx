"use client";

import { AnimatePresence, m, useMotionValue, useSpring, type PanInfo } from "motion/react";
import { useRef, type PointerEvent } from "react";
import { Jersey } from "./jersey";
import { Reveal } from "./motion-primitives";
import { useKit } from "./kit-provider";
import { KITS, KIT_ORDER, type Kit } from "@/lib/kits";
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
          <Jersey kit={kit} className="size-20 drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] md:size-24" />
        </m.div>
      </AnimatePresence>
      <span className="text-xs text-mute">{KITS[kit].label} kit</span>
    </div>
  );
}

/** Position of `k` relative to the active kit: -1 (left), 0 (centre), 1 (right). */
function slot(k: Kit, active: Kit): -1 | 0 | 1 {
  const n = KIT_ORDER.length;
  const d = (KIT_ORDER.indexOf(k) - KIT_ORDER.indexOf(active) + n) % n;
  return d === 0 ? 0 : d === 1 ? 1 : -1;
}

function step(active: Kit, dir: 1 | -1): Kit {
  const n = KIT_ORDER.length;
  return KIT_ORDER[(KIT_ORDER.indexOf(active) + dir + n) % n];
}

function KitCard({ kit, position, onSelect }: { kit: Kit; position: -1 | 0 | 1; onSelect: () => void }) {
  const front = position === 0;
  const ref = useRef<HTMLDivElement>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 160, damping: 18 });
  const sry = useSpring(ry, { stiffness: 160, damping: 18 });

  function onMove(e: PointerEvent<HTMLDivElement>) {
    if (!front || e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    ry.set(((e.clientX - r.left) / r.width - 0.5) * 22);
    rx.set(-((e.clientY - r.top) / r.height - 0.5) * 14);
  }
  function onLeave() {
    rx.set(0);
    ry.set(0);
  }

  return (
    <m.div
      className="absolute left-1/2 top-0 w-[58%] max-w-[300px] -translate-x-1/2"
      style={{ zIndex: front ? 3 : 1, transformStyle: "preserve-3d" }}
      initial={false}
      animate={{
        x: `${position * 72}%`,
        scale: front ? 1 : 0.62,
        rotateY: position * -32,
        opacity: front ? 1 : 0.42,
        filter: front ? "blur(0px) brightness(1)" : "blur(1.5px) brightness(0.7)",
      }}
      transition={{ type: "spring", stiffness: 140, damping: 20, mass: 0.9 }}
      onClick={front ? undefined : onSelect}
    >
      <m.div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        style={{ rotateX: srx, rotateY: sry, transformPerspective: 900 }}
        className={front ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}
      >
        {/* gentle float on the front kit */}
        <m.div
          animate={front ? { y: [0, -12, 0] } : { y: 0 }}
          transition={front ? { duration: 5, repeat: Infinity, ease: "easeInOut" } : { duration: 0.4 }}
        >
          <Jersey kit={kit} className="relative w-full drop-shadow-[0_40px_50px_rgba(0,0,0,0.65)]" />
        </m.div>
        {/* floor reflection */}
        <div
          aria-hidden
          className="pointer-events-none -mt-2 h-[38%] overflow-hidden opacity-25"
          style={{ maskImage: "linear-gradient(to bottom, black, transparent 80%)", WebkitMaskImage: "linear-gradient(to bottom, black, transparent 80%)" }}
        >
          <Jersey kit={kit} className="w-full -scale-y-100 blur-[1px]" />
        </div>
      </m.div>
    </m.div>
  );
}

export function KitShowcase() {
  const { kit, setKit } = useKit();
  const info = KITS[kit];

  function onDragEnd(_: unknown, pan: PanInfo) {
    if (pan.offset.x < -50 || pan.velocity.x < -400) setKit(step(kit, 1));
    else if (pan.offset.x > 50 || pan.velocity.x > 400) setKit(step(kit, -1));
  }

  return (
    <section className="relative mx-auto max-w-6xl overflow-hidden px-5 pb-28 text-center md:pb-40">
      <Reveal blur>
        <p className="eyebrow">Matchday kits</p>
        <h2 className="text-display mt-3 text-5xl md:text-7xl">
          Three kits.
          <br />
          <span className="text-gradient">One identity.</span>
        </h2>
      </Reveal>

      {/* stage */}
      <div className="relative mx-auto mt-10 w-full max-w-3xl md:mt-14">
        {/* spotlight + floor */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-10 h-[90%] transition-[background] duration-700"
          style={{
            background:
              "radial-gradient(45% 55% at 50% 30%, color-mix(in oklab, var(--accent-2) 38%, transparent), transparent 70%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-[22%] left-1/2 h-10 w-[46%] -translate-x-1/2 rounded-[50%] bg-black/70 blur-2xl"
        />

        <m.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.18}
          onDragEnd={onDragEnd}
          style={{ perspective: 1400 }}
          className="relative mx-auto aspect-[1/1] w-full touch-pan-y md:aspect-[16/11]"
        >
          {KIT_ORDER.map((k) => (
            <KitCard key={k} kit={k} position={slot(k, kit)} onSelect={() => setKit(k)} />
          ))}
        </m.div>
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
      <p className="mt-4 text-xs text-mute">Swipe or tap a kit — the whole app re-tints to match.</p>
    </section>
  );
}
