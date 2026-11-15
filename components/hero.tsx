"use client";

import { m, useScroll, useTransform } from "motion/react";
import { useRef, type ReactNode } from "react";
import { EASE } from "@/lib/motion";

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });

  const crestScale = useTransform(scrollYProgress, [0, 0.7], [1, 0.72]);
  const crestOpacity = useTransform(scrollYProgress, [0.1, 0.6], [1, 0]);
  const titleY = useTransform(scrollYProgress, [0, 0.7], [0, -70]);
  const titleOpacity = useTransform(scrollYProgress, [0.05, 0.55], [1, 0]);
  const glowScale = useTransform(scrollYProgress, [0, 1], [1, 1.5]);

  return (
    <section ref={ref} className="relative h-[130svh]">
      <div className="sticky top-0 flex h-[100svh] flex-col items-center justify-center overflow-hidden px-6">
        <m.div
          aria-hidden
          style={{
            scale: glowScale,
            background:
              "radial-gradient(closest-side, color-mix(in oklab, var(--glow) 48%, transparent), color-mix(in oklab, var(--accent-2) 12%, transparent) 55%, transparent 75%)",
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
            className="size-40 md:size-56"
          />
        </m.div>

        <m.div style={{ y: titleY, opacity: titleOpacity }} className="relative mt-8 text-center">
          <m.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.1 }}
            className="text-xs font-semibold uppercase tracking-[0.22em] text-accent transition-colors duration-700"
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
      </div>
    </section>
  );
}

export function Statement() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-24 pt-8 md:pb-36">
      <p className="text-display text-[clamp(2.6rem,8vw,6.5rem)]">
        <RevealLine>Every goal.</RevealLine>
        <RevealLine delay={0.08} className="text-gradient">
          Every blunder.
        </RevealLine>
        <RevealLine delay={0.16}>On the record.</RevealLine>
      </p>
    </section>
  );
}

function RevealLine({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <m.span
      initial={{ opacity: 0, y: 40, filter: "blur(10px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ duration: 1, ease: EASE, delay }}
      className={`block pb-1 ${className}`}
    >
      {children}
    </m.span>
  );
}
