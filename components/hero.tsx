"use client";

import { m, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { EASE } from "@/lib/motion";

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });

  const crestScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.62]);
  const crestOpacity = useTransform(scrollYProgress, [0.12, 0.45], [1, 0]);
  const titleY = useTransform(scrollYProgress, [0, 0.5], [0, -90]);
  const titleOpacity = useTransform(scrollYProgress, [0.08, 0.4], [1, 0]);
  const lineOpacity = useTransform(scrollYProgress, [0.42, 0.56, 0.8, 0.95], [0, 1, 1, 0]);
  const lineY = useTransform(scrollYProgress, [0.42, 0.56], [48, 0]);
  const glowScale = useTransform(scrollYProgress, [0, 1], [1, 1.7]);
  const hintOpacity = useTransform(scrollYProgress, [0, 0.06], [1, 0]);

  return (
    <section ref={ref} className="relative h-[220svh]">
      <div className="sticky top-0 flex h-[100svh] flex-col items-center justify-center overflow-hidden px-6">
        <m.div
          aria-hidden
          style={{
            scale: glowScale,
            background: "radial-gradient(closest-side, color-mix(in oklab, var(--glow) 42%, transparent), transparent 72%)",
          }}
          className="pointer-events-none absolute inset-0 m-auto size-[110vmin] rounded-full"
        />

        <m.div style={{ scale: crestScale, opacity: crestOpacity }} className="relative">
          <m.img
            src="/brand/crest.png"
            alt="Revorfest crest"
            initial={{ opacity: 0, scale: 0.88, filter: "blur(16px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 1.4, ease: EASE }}
            className="size-36 md:size-52"
          />
        </m.div>

        <m.div style={{ y: titleY, opacity: titleOpacity }} className="relative mt-8 text-center">
          <m.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.1 }}
            className="text-xs font-semibold uppercase tracking-[0.22em] text-mute"
          >
            Pro Clubs · PS5 &amp; PC
          </m.p>
          <m.h1
            initial={{ opacity: 0, y: 30, filter: "blur(14px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 1.2, ease: EASE, delay: 0.18 }}
            className="text-display mt-3 text-[clamp(3.5rem,15vw,10.5rem)]"
          >
            Revorfest<span className="text-accent transition-colors duration-700">.</span>
          </m.h1>
          <m.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: EASE, delay: 0.4 }}
            className="mx-auto mt-5 max-w-md text-lg text-mute md:text-xl"
          >
            Built by the squad. Measured by every match.
          </m.p>
        </m.div>

        <m.div
          style={{ opacity: lineOpacity, y: lineY }}
          className="pointer-events-none absolute inset-x-6 top-1/2 -translate-y-1/2 text-center"
        >
          <p className="text-display text-[clamp(2.4rem,8vw,6rem)]">
            Every goal.
            <br />
            <span className="text-mute">Every blunder.</span>
            <br />
            On the record.
          </p>
        </m.div>

        <m.div
          style={{ opacity: hintOpacity }}
          className="absolute bottom-28 flex flex-col items-center gap-2 text-xs text-mute md:bottom-10"
        >
          Scroll
          <span className="block h-8 w-px bg-linear-to-b from-white/60 to-transparent motion-safe:animate-pulse" />
        </m.div>
      </div>
    </section>
  );
}
