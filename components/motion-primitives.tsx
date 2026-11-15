"use client";

import { animate, m, useInView, useMotionValue, useSpring, useTransform } from "motion/react";
import { useEffect, useRef, type PointerEvent, type ReactNode } from "react";
import { EASE } from "@/lib/motion";

/* ── Scroll reveal ─────────────────────────────────────────── */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 24,
  blur = false,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  blur?: boolean;
}) {
  return (
    <m.div
      className={className}
      initial={blur ? { opacity: 0, y, filter: "blur(12px)" } : { opacity: 0, y }}
      whileInView={blur ? { opacity: 1, y: 0, filter: "blur(0px)" } : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: blur ? 1.1 : 0.8, ease: EASE, delay }}
    >
      {children}
    </m.div>
  );
}

/* ── Animated number ticker ────────────────────────────────── */
export function Ticker({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  className = "",
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => {
    const fmt = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    return `${prefix}${fmt.format(v)}${suffix}`;
  });

  useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, value, { duration: 1.6, ease: EASE });
    return () => controls.stop();
  }, [inView, value, mv]);

  return (
    <m.span ref={ref} className={`tabular-nums ${className}`}>
      {text}
    </m.span>
  );
}

/* ── 3D tilt + cursor glow card ────────────────────────────── */
export function TiltCard({
  children,
  className = "",
  glow = true,
  background,
}: {
  children: ReactNode;
  className?: string;
  glow?: boolean;
  /** CSS background painted edge-to-edge behind the card content (ignores padding). */
  background?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 220, damping: 22 });
  const sry = useSpring(ry, { stiffness: 220, damping: 22 });

  function onMove(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    ry.set((px - 0.5) * 9);
    rx.set(-(py - 0.5) * 9);
    ref.current.style.setProperty("--mx", `${px * 100}%`);
    ref.current.style.setProperty("--my", `${py * 100}%`);
  }

  function onLeave() {
    rx.set(0);
    ry.set(0);
  }

  return (
    <m.div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      whileTap={{ scale: 0.985 }}
      style={{ rotateX: srx, rotateY: sry, transformPerspective: 1000 }}
      className={`tile group h-full will-change-transform ${className}`}
    >
      {background && <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit]" style={{ background }} />}
      {glow && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background:
              "radial-gradient(420px circle at var(--mx, 50%) var(--my, 50%), color-mix(in oklab, var(--accent) 14%, transparent), transparent 65%)",
          }}
        />
      )}
      <div className="relative h-full">{children}</div>
    </m.div>
  );
}

/* ── Win-rate ring ─────────────────────────────────────────── */
export function WinRing({ value, size = 128 }: { value: number; size?: number }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <circle cx="60" cy="60" r="52" fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="10" />
        <m.circle
          cx="60"
          cy="60"
          r="52"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="10"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: value / 100 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 1.6, ease: EASE }}
          className="transition-[stroke] duration-700"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <Ticker value={value} decimals={1} suffix="%" className="text-2xl font-semibold tracking-tight" />
      </div>
    </div>
  );
}

/* ── Last-5 form strip ─────────────────────────────────────── */
export function FormStrip({ results }: { results: ("W" | "D" | "L")[] }) {
  const styles = {
    W: "bg-accent text-on-accent",
    D: "bg-white/12 text-chalk",
    L: "bg-depleted/15 text-depleted",
  } as const;
  return (
    <div className="flex gap-2">
      {results.map((r, i) => (
        <m.span
          key={i}
          initial={{ opacity: 0, scale: 0.6 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ type: "spring", stiffness: 420, damping: 26, delay: 0.15 + i * 0.07 }}
          className={`grid size-10 place-items-center rounded-full text-sm font-bold transition-colors duration-700 md:size-11 ${styles[r]}`}
        >
          {r}
        </m.span>
      ))}
    </div>
  );
}
