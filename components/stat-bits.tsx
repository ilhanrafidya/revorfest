import Link from "next/link";
import { PlayerAvatar } from "./player-avatar";
import type { Linked } from "@/lib/stats";

export function WhoLink({ who, size = "size-9 text-xs" }: { who: Linked; size?: string }) {
  const inner = (
    <span className="flex min-w-0 items-center gap-3">
      <PlayerAvatar name={who.name} src={who.avatar} className={size} />
      <span className="min-w-0">
        <span className="block truncate font-medium">{who.name}</span>
        {who.number != null && <span className="block text-xs tabular-nums text-mute">#{who.number}</span>}
      </span>
    </span>
  );
  return who.slug ? (
    <Link href={`/squad/${who.slug}`} className="min-w-0 hover:text-accent">
      {inner}
    </Link>
  ) : (
    inner
  );
}

export function ResultPill({ result }: { result: "W" | "D" | "L" | string }) {
  const s =
    result === "W" ? "bg-accent text-on-accent" : result === "L" ? "bg-depleted/15 text-depleted" : "bg-white/12 text-chalk";
  return <span className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold ${s}`}>{result}</span>;
}
