import { Reveal } from "./motion-primitives";

export function ComingSoon({
  eyebrow,
  title,
  muted,
  description,
  phase,
}: {
  eyebrow: string;
  title: string;
  muted: string;
  description: string;
  phase: number;
}) {
  return (
    <section className="relative flex min-h-[100svh] items-center justify-center overflow-hidden px-6 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 m-auto size-[90vmin] rounded-full"
        style={{ background: "radial-gradient(closest-side, color-mix(in oklab, var(--glow) 35%, transparent), transparent 72%)" }}
      />
      <Reveal blur className="relative max-w-2xl">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="text-display mt-3 text-5xl md:text-8xl">
          {title}
          <br />
          <span className="text-gradient">{muted}</span>
        </h1>
        <p className="mx-auto mt-6 max-w-md text-lg text-mute">{description}</p>
        <span className="glass hairline mt-8 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm">
          <span className="size-2 rounded-full bg-accent transition-colors duration-700" />
          Arriving in Phase {phase}
        </span>
      </Reveal>
    </section>
  );
}
