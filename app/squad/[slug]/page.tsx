import type { Metadata } from "next";
import Link from "next/link";
import { BackLink } from "@/components/back-link";
import { notFound } from "next/navigation";
import { Reveal } from "@/components/motion-primitives";
import { PlayerAvatar } from "@/components/player-avatar";
import { avatarUrl, getPlayerBySlug } from "@/lib/players";
import { currentPlayer } from "@/lib/session";
import { memberStats, recentRatings } from "@/lib/stats";
import { ResultPill } from "@/components/stat-bits";
import { ViewCardButton } from "@/components/view-card-button";
import { TrophyCabinet } from "@/components/trophy-cabinet";
import { allAwards, hattricks, milestonesFor } from "@/lib/awards";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await getPlayerBySlug((await params).slug);
  return { title: p ? p.display_name : "Player" };
}

export default async function PlayerPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ welcome?: string }>;
}) {
  const [{ slug }, { welcome }] = await Promise.all([params, searchParams]);
  const [p, me] = await Promise.all([getPlayerBySlug(slug), currentPlayer()]);
  if (!p) notFound();
  const [ea, recent, awards, tricks] = await Promise.all([memberStats(p.ea_gamertag), recentRatings(p.ea_gamertag), allAwards(), hattricks(p.ea_gamertag)]);
  const isMe = me?.id === p.id;
  const joined = new Date(p.created_at).toLocaleDateString("en-GB", { month: "short", year: "numeric" });

  return (
    <section className="relative mx-auto max-w-5xl px-4 pb-40 pt-24 md:px-6 md:pt-32">
      <span
        aria-hidden
        className="text-display pointer-events-none absolute right-0 top-10 select-none text-[14rem] leading-none text-white/[0.04] md:text-[22rem]"
      >
        {p.jersey_number}
      </span>

      <Reveal className="relative mb-0 md:mb-8">
        <BackLink href="/squad" label="Squad" />
      </Reveal>

      {welcome && isMe && (
        <Reveal className="mb-8">
          <p className="rounded-2xl bg-accent/10 px-5 py-4 text-sm text-accent">
            Welcome to Revorfest, {p.display_name}. You&apos;re officially on the roster.
          </p>
        </Reveal>
      )}

      <Reveal blur className="relative flex flex-col items-start gap-6 md:flex-row md:items-end">
        <PlayerAvatar name={p.display_name} src={avatarUrl(p)} className="size-32 text-4xl md:size-40" />
        <div>
          <p className="eyebrow">
            #{p.jersey_number} · {p.primary_position}
          </p>
          <h1 className="text-display mt-2 text-5xl md:text-7xl">{p.display_name}</h1>
          <p className="mt-3 text-mute">
            EA ID <span className="font-medium text-chalk">{p.ea_gamertag}</span> · Joined {joined}
          </p>
        </div>
      </Reveal>

      <Reveal delay={0.1} className="relative mt-8 flex flex-wrap gap-2">
        <span className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-on-accent">{p.primary_position}</span>
        {p.secondary_positions.map((s) => (
          <span key={s} className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold">
            {s}
          </span>
        ))}
        {p.role !== "player" && (
          <span className="rounded-full bg-gold/15 px-4 py-2 text-sm font-semibold capitalize text-gold">{p.role}</span>
        )}
      </Reveal>

      <Reveal delay={0.15} className="relative mt-6">
        <ViewCardButton slug={p.slug} />
      </Reveal>

      <div className="relative mt-12 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {[
          { label: "Matches", value: ea ? String(ea.gamesPlayed) : "—" },
          { label: "Goals", value: ea ? String(ea.goals) : "—" },
          { label: "Assists", value: ea ? String(ea.assists) : "—" },
          { label: "Avg rating", value: ea && ea.ratingAve ? ea.ratingAve.toFixed(1) : "—" },
        ].map((t, i) => (
          <Reveal key={t.label} delay={0.05 * i}>
            <div className="tile p-5">
              <p className="eyebrow">{t.label}</p>
              <p className={`text-display mt-6 text-5xl tabular-nums ${t.value === "—" ? "text-mute/40" : ""}`}>{t.value}</p>
            </div>
          </Reveal>
        ))}
      </div>
      <p className="relative mt-4 text-sm text-mute">
        {ea
          ? `Club career stats from EA · ${ea.motm} Man of the Match · ${ea.cleanSheets} clean sheets`
          : `No EA stats found for "${p.ea_gamertag}" yet — check the EA ID matches in-game exactly.`}
      </p>

      <Reveal className="relative mt-12">
        <TrophyCabinet slug={p.slug} name={p.display_name} awards={awards.get(p.id) ?? null} hattricks={tricks} milestones={milestonesFor(ea)} />
      </Reveal>

      {recent.length > 0 && (
        <Reveal className="relative mt-10">
          <p className="eyebrow mb-3">Recent matches</p>
          <ul className="tile divide-y divide-white/[0.06] p-1">
            {recent.map((r) => (
              <li key={r.match_id}>
                <Link href={`/matches/${r.match_id}`} className="flex items-center gap-4 rounded-2xl px-4 py-3 hover:bg-white/[0.04]">
                  <ResultPill result={r.result} />
                  <span className="min-w-0 flex-1 truncate text-sm">vs {r.opponent_name ?? "Unknown"}</span>
                  <span className="text-xs text-mute">
                    {r.goals}G {r.assists}A
                  </span>
                  <span className="w-10 text-right font-semibold tabular-nums">{r.rating != null ? Number(r.rating).toFixed(1) : "—"}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Reveal>
      )}

      {isMe && (
        <Reveal className="relative mt-10 flex gap-3">
          <Link href="/me" className="glass hairline rounded-full px-5 py-3 text-sm font-semibold">
            Edit profile
          </Link>
          {me?.role === "admin" && (
            <Link href="/admin" className="rounded-full bg-gold/15 px-5 py-3 text-sm font-semibold text-gold">
              Admin panel
            </Link>
          )}
        </Reveal>
      )}
    </section>
  );
}
