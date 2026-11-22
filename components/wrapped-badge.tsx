import { SparkleIcon } from "./icons";

/** Season tile for Wrapped: gradient square, big season number, small sparkle. */
export function WrappedBadge({ n, size = "size-14" }: { n: number; size?: string }) {
  return (
    <span
      className={`relative grid ${size} shrink-0 place-items-center overflow-hidden rounded-2xl text-black`}
      style={{ background: "linear-gradient(135deg, #D7FF3A 0%, #DDB168 60%, #8AB4FF 120%)" }}
    >
      <span className="text-display text-2xl leading-none tracking-tight">S{n}</span>
      <SparkleIcon className="absolute right-1 top-1 size-3 text-black/60" />
    </span>
  );
}
