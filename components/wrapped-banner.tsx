import Link from "next/link";
import { WrappedBadge } from "./wrapped-badge";
import { TrophyIcon } from "./icons";
import { db } from "@/lib/db";
import { currentPlayer } from "@/lib/session";
import { finishedSeasons } from "@/lib/seasons";
import { WRAPPED_BANNER_DAYS } from "@/lib/wrapped";

/** Home banner for the first two weeks after a season ends — only for members who played in it. */
export async function WrappedBanner() {
  const me = await currentPlayer();
  const s = finishedSeasons()[0];
  if (!me || !s || Date.now() - s.end.getTime() > WRAPPED_BANNER_DAYS * 86400000) return null;
  const [row] = (await db()`
    SELECT count(*)::int AS n FROM ea_match_players mp JOIN ea_matches m USING (match_id)
    JOIN players p ON lower(p.ea_gamertag) = lower(mp.gamertag)
    WHERE p.id = ${me.id} AND m.played_at >= ${s.start.toISOString()} AND m.played_at < ${s.end.toISOString()}`) as { n: number }[];
  if (!row?.n) return null;
  return (
    <div className="mx-auto max-w-6xl space-y-2 px-4 pt-4 md:px-6">
      <Link
        href={`/wrapped/${s.n}/${me.slug}`}
        className="gold-sheen group relative flex items-center gap-4 overflow-hidden rounded-[28px] p-5 ring-1 ring-white/10 transition active:scale-[0.99] md:p-6"
        style={{ background: "linear-gradient(120deg, rgba(215,255,58,0.22), rgba(221,177,104,0.16) 45%, rgba(138,180,255,0.14))" }}
      >
        <WrappedBadge n={s.n} />
        <span className="min-w-0 flex-1">
          <span className="eyebrow block text-accent">Just dropped</span>
          <span className="block text-xl font-semibold tracking-tight md:text-2xl">Your {s.name} Wrapped is ready</span>
          <span className="block text-sm text-white/70">{row.n} matches, one story. Tap to open.</span>
        </span>
        <span className="text-2xl text-white/70 transition group-hover:translate-x-1">›</span>
      </Link>
      <Link href={`/awards/${s.n}`} className="flex items-center gap-3 rounded-2xl bg-gold/10 px-4 py-3 text-sm ring-1 ring-gold/25 transition active:scale-[0.99]">
        <TrophyIcon className="size-5 text-gold" />
        <span className="min-w-0 flex-1 font-semibold">{s.name} Awards Night is live</span>
        <span className="text-mute">›</span>
      </Link>
    </div>
  );
}
