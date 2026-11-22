import type { Metadata } from "next";
import Link from "next/link";
import { AutoRefresh } from "@/components/auto-refresh";
import { MatchdayBoard, ScheduleForm } from "@/components/matchday-board";
import { Reveal } from "@/components/motion-primitives";
import { canManage, currentMatchday, matchdayRoster } from "@/lib/matchday";
import { currentPlayer } from "@/lib/session";

export const metadata: Metadata = { title: "Matchday" };

export default async function MatchdayPage() {
  const [me, matchday] = await Promise.all([currentPlayer(), currentMatchday()]);
  const manage = canManage(me?.role);
  const data = matchday ? await matchdayRoster(matchday.id) : null;

  return (
    <section className="mx-auto max-w-6xl px-4 pb-40 pt-24 md:px-6 md:pt-32">
      <AutoRefresh seconds={10} />
      <Reveal blur className="px-1 pb-8">
        <p className="eyebrow">Matchday</p>
        <h1 className="text-display mt-3 text-5xl md:text-7xl">
          Line up.
          <br />
          <span className="text-gradient">Lock in.</span>
        </h1>
        <Link href="/matchday/history" className="glass hairline mt-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold">
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2" />
          </svg>
          History
        </Link>
      </Reveal>

      {matchday && data ? (
        <MatchdayBoard matchday={matchday} roster={data.roster} lineup={data.lineup} meId={me?.id ?? null} manage={manage} />
      ) : (
        <div className="tile p-8 text-center">
          <p className="text-xl font-semibold">No matchday scheduled.</p>
          <p className="mt-2 text-mute">
            {manage ? "Set one up below." : "Log in to see who's playing."}
          </p>
          {!me && (
            <Link href="/login" className="mt-5 inline-block rounded-full bg-accent px-5 py-3 text-sm font-semibold text-on-accent">
              Log in
            </Link>
          )}
        </div>
      )}

      {manage && (
        <div className="mt-8">
          <ScheduleForm hasCurrent={!!matchday} />
        </div>
      )}
    </section>
  );
}
