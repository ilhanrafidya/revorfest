import { FormStrip, Reveal, Ticker, TiltCard, WinRing } from "./motion-primitives";
import { CurrentKitChip } from "./kit-showcase";
import { PlayFilled, TrophyIcon } from "./icons";
import { HomeClipTile } from "./home-clip-tile";
import { club as demo, gotw, nextMatchday, potw as demoPotw, topAssist as demoAssist, topScorer as demoScorer, wpotw as demoWpotw } from "@/lib/mock";
import { PlayerAvatar } from "./player-avatar";
import { clubHistory, clubOverall, lastSync, leagueForm, recentMatches } from "@/lib/stats";
import { finishedSeasons, seasonAt } from "@/lib/seasons";
import { MIN_SEASON_MATCHES, seasonWinners } from "@/lib/awards";
import { Countdown } from "./countdown";
import { rangeTable } from "@/lib/honors";
import { honorsFor, weekStart } from "@/lib/honors";
import { timeAgo } from "@/lib/format";
import { currentMatchday, matchdayRoster } from "@/lib/matchday";
import { clipCounts, windowState, winners } from "@/lib/clips";
import { Jersey } from "./jersey";
import Link from "next/link";
import { db } from "@/lib/db";
import { avatarUrl } from "@/lib/players";

async function loadExtras() {
  try {
    const md = await currentMatchday();
    const roster = md ? (await matchdayRoster(md.id)).roster : [];
    const w = windowState();
    const [lastGotw, counts] = await Promise.all([winners("gotw", 1), clipCounts(w.key)]);
    return {
      matchday: md
        ? {
            when: new Date(md.scheduled_at).toLocaleString("en-GB", {
              weekday: "short",
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Asia/Jakarta",
            }),
            kit: md.kit,
            ready: roster.filter((p) => p.status === "ready").length,
            onTheWay: roster.filter((p) => p.status === "on_the_way").length,
            out: roster.filter((p) => p.status === "out").length,
          }
        : null,
      gotw: lastGotw[0] ?? null,
      clipsThisWeek: counts.gotw + counts.notw,
    };
  } catch {
    return null;
  }
}

async function loadOverview() {
  try {
    const thisWeek = weekStart();
    const season = seasonAt();
    const [overall, recent, now, prev, sync, seasonTable, history, lform] = await Promise.all([
      clubOverall(),
      recentMatches(5),
      honorsFor(thisWeek),
      honorsFor(new Date(thisWeek.getTime() - 7 * 86400000)),
      lastSync(),
      rangeTable(season.start, new Date()),
      clubHistory(30),
      leagueForm(5),
    ]);
    const lastMotm = recent[0] ? await lastMatchStar(recent[0].match_id) : null;
    const race = seasonWinners(seasonTable);
    const skills = history.filter((h) => h.skill != null).map((h) => ({ at: new Date(h.at).getTime(), v: h.skill as number }));
    const weekAgo = Date.now() - 7 * 86400000;
    const base = skills.find((x) => x.at >= weekAgo) ?? skills[0];
    if (!overall) return null;
    const last = recent[0];
    const potwLine = prev.potw ?? now.potw;
    const wpotwLine = prev.wpotw ?? now.wpotw;
    return {
      club: {
        record: { w: overall.wins, d: overall.ties, l: overall.losses },
        matches: overall.gamesPlayed,
        goalsFor: overall.goals,
        goalsAgainst: overall.goalsAgainst,
        winRate: overall.gamesPlayed ? Math.round((overall.wins / overall.gamesPlayed) * 1000) / 10 : 0,
        division: clampDiv(overall.currentDivision),
        bestDivision: clampDiv(overall.bestDivision),
        form: recent.map((m) => m.result).reverse(),
        motm: lastMotm
          ? { ...lastMotm, opponent: recent[0].opponent_name ?? "Unknown", score: `${recent[0].goals_for}–${recent[0].goals_against}`, matchId: recent[0].match_id }
          : null,
        countdown: {
          season: season.name,
          ends: season.end.toISOString(),
          race: seasonTable
            .filter((l) => l.playerId && l.matches >= MIN_SEASON_MATCHES)
            .slice(0, 3)
            .map((l) => ({ name: l.name, avatar: l.avatar, rating: l.avgRating, matches: l.matches })),
          recent: recentFinished(),
        },
        road: {
          points: overall.points,
          promotions: overall.promotions,
          skill: overall.skillRating,
          skillDelta: overall.skillRating != null && base ? overall.skillRating - base.v : null,
          spark: skills.map((x) => x.v),
          leagueForm: lform,
        },
        lastMatch: last ? { opponent: last.opponent_name ?? "Unknown", score: `${last.goals_for}–${last.goals_against}` } : null,
      },
      potw: potwLine
        ? { name: potwLine.name, avatar: potwLine.avatar, number: potwLine.number, avgRating: potwLine.avgRating, goals: potwLine.goals, assists: potwLine.assists, matches: potwLine.matches, live: !prev.potw }
        : null,
      wpotw: wpotwLine ? { name: wpotwLine.name, avgRating: wpotwLine.avgRating, live: !prev.wpotw } : null,
      // Home shows the running EA season; all-time numbers live on Stats.
      scorer: race.boot ? { name: race.boot.name, value: race.boot.goals } : null,
      assister: race.assist ? { name: race.assist.name, value: race.assist.assists } : null,
      season: { name: season.name, ends: season.end.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Jakarta" }) },
      sync,
    };
  } catch {
    return null;
  }
}

/** A season that ended within the last two weeks (Awards Night / Wrapped are fresh). */
/** Our Man of the Match in a game — or, if the award went to the other side, our best-rated player. */
async function lastMatchStar(matchId: string) {
  const [r] = (await db()`
    SELECT mp.gamertag, mp.rating, mp.goals, mp.assists, mp.motm, p.id, p.display_name, p.avatar_version, (p.avatar_b64 IS NOT NULL) AS has_avatar
    FROM ea_match_players mp LEFT JOIN players p ON lower(p.ea_gamertag) = lower(mp.gamertag) AND p.active
    WHERE mp.match_id = ${matchId}
    ORDER BY mp.motm DESC, mp.rating DESC NULLS LAST LIMIT 1`) as {
    gamertag: string;
    rating: number | null;
    goals: number;
    assists: number;
    motm: boolean;
    id: string | null;
    display_name: string | null;
    avatar_version: number | null;
    has_avatar: boolean | null;
  }[];
  if (!r) return null;
  return {
    name: r.display_name ?? r.gamertag,
    avatar: r.id ? avatarUrl({ id: r.id, avatar_version: r.avatar_version ?? 0, has_avatar: !!r.has_avatar }) : null,
    rating: r.rating != null ? Number(r.rating) : null,
    goals: r.goals,
    assists: r.assists,
    motm: r.motm,
  };
}

function recentFinished() {
  const s = finishedSeasons()[0];
  return s && Date.now() - s.end.getTime() < 14 * 86400000 ? { n: s.n, name: s.name } : null;
}

function Spark({ values }: { values: number[] }) {
  const w = 300;
  const h = 56;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => `${((i / (values.length - 1)) * w).toFixed(1)},${(h - 6 - ((v - min) / span) * (h - 12)).toFixed(1)}`);
  const up = values[values.length - 1] >= values[0];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-14 w-full" aria-hidden>
      <defs>
        <linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={up ? "#D7FF3A" : "#FF453A"} stopOpacity="0.25" />
          <stop offset="1" stopColor={up ? "#D7FF3A" : "#FF453A"} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts.join(" ")} ${w},${h}`} fill="url(#spark-fill)" />
      <polyline points={pts.join(" ")} fill="none" stroke={up ? "#D7FF3A" : "#FF453A"} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" className="spark-draw" />
    </svg>
  );
}

function Initials({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span className={`grid place-items-center rounded-full font-semibold ${className}`}>
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}

/**
 * EA's API counts six tiers: 1 = Elite, 2 = Division 1 … 6 = Division 5 (see finishesInDivision1…6).
 * In-game it reads Division 5 → 1 → Elite, so shift by one. 0 here means Elite.
 */
function clampDiv(d: number | null) {
  return d == null ? null : Math.min(Math.max(d - 1, 0), 5);
}
const divLabel = (d: number) => (d === 0 ? "Elite" : `Division ${d}`);

export async function Overview() {
  const [real, extras] = await Promise.all([loadOverview(), loadExtras()]);
  const club = real?.club ?? {
    ...demo,
    division: 4,
    bestDivision: 4,
    motm: null as null | { name: string; avatar: string | null; rating: number | null; goals: number; assists: number; motm: boolean; opponent: string; score: string; matchId: string },
    countdown: { season: "Season 2", ends: new Date(Date.now() + 9 * 86400000).toISOString(), race: [] as { name: string; avatar: string | null; rating: number; matches: number }[], recent: null as { n: number; name: string } | null },
    road: { points: 23, promotions: 2, skill: 1402, skillDelta: 38, spark: [1364, 1371, 1368, 1380, 1392, 1402], leagueForm: ["W", "W", "D", "L", "W"] as ("W" | "D" | "L")[] },
    lastMatch: demo.lastMatch,
  };
  const potw = real ? real.potw : { ...demoPotw, avatar: null, live: false };
  const wpotw = real ? real.wpotw : { ...demoWpotw, live: false };
  const scorer = real ? real.scorer : { name: demoScorer.name, value: demoScorer.goals };
  const assister = real ? real.assister : { name: demoAssist.name, value: demoAssist.assists };
  const seasonInfo = real?.season ?? (() => {
    const s = seasonAt();
    return { name: s.name, ends: s.end.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Jakarta" }) };
  })();
  const sync = real?.sync ?? null;
  return (
    <section className="mx-auto max-w-6xl px-4 pb-24 md:px-6 md:pb-36">
      <Reveal blur className="px-1 pb-10 md:pb-14">
        <p className="eyebrow">Club Overview</p>
        <h2 className="text-display mt-3 text-5xl md:text-7xl">
          The numbers
          <br />
          <span className="text-gradient">don&apos;t lie.</span>
        </h2>
      </Reveal>

      <div className="grid grid-flow-dense grid-cols-2 gap-3 md:auto-rows-[200px] md:grid-cols-4 md:gap-4">
        {/* Season record */}
        <Reveal className="col-span-2 md:row-span-2">
          <TiltCard className="p-6 md:p-8">
            <img
              src="/brand/crest.png"
              alt=""
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-6 size-64 opacity-[0.06] md:size-80"
            />
            <div className="flex h-full flex-col justify-between gap-8">
              <div>
                <p className="eyebrow">Season record</p>
                <p className="mt-1 text-sm text-mute">
                  <Ticker value={club.matches} /> matches played
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Won", v: club.record.w, c: "text-accent" },
                  { label: "Drawn", v: club.record.d, c: "text-chalk" },
                  { label: "Lost", v: club.record.l, c: "text-mute" },
                ].map((s) => (
                  <div key={s.label}>
                    <Ticker
                      value={s.v}
                      className={`text-display block text-6xl transition-colors duration-700 md:text-8xl ${s.c}`}
                    />
                    <p className="mt-2 text-sm text-mute">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-8 border-t border-white/[0.08] pt-5 text-sm">
                <p>
                  <Ticker value={club.goalsFor} className="text-xl font-semibold" />
                  <span className="ml-2 text-mute">scored</span>
                </p>
                <p>
                  <Ticker value={club.goalsAgainst} className="text-xl font-semibold" />
                  <span className="ml-2 text-mute">conceded</span>
                </p>
              </div>
            </div>
          </TiltCard>
        </Reveal>

        {/* Win rate */}
        <Reveal delay={0.05} className="col-span-1">
          <TiltCard className="p-5">
            <div className="flex h-full flex-col items-center justify-center gap-3 py-2">
              <WinRing value={club.winRate} size={112} />
              <p className="eyebrow">Win rate</p>
            </div>
          </TiltCard>
        </Reveal>

        {/* MOTM of the last match */}
        <Reveal delay={0.1} className="col-span-1">
          {club.motm ? (
            <Link href={`/matches/${club.motm.matchId}`} className="block h-full">
              <TiltCard className="p-5" background="radial-gradient(80% 70% at 100% 0%, rgb(221 177 104 / 0.16), transparent 70%)">
                <div className="flex h-full flex-col justify-between gap-4">
                  <p className="eyebrow text-gold">{club.motm.motm ? "MOTM · last match" : "Top rated · last match"}</p>
                  <div className="flex items-center gap-3">
                    <PlayerAvatar name={club.motm.name} src={club.motm.avatar} className="size-11 text-xs ring-2 ring-gold/60" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{club.motm.name}</p>
                      <p className="text-display text-2xl leading-none text-gold">{club.motm.rating != null ? club.motm.rating.toFixed(1) : "—"}</p>
                    </div>
                  </div>
                  <p className="truncate text-xs text-mute">
                    {club.motm.goals}G {club.motm.assists}A · vs {club.motm.opponent} {club.motm.score}
                  </p>
                </div>
              </TiltCard>
            </Link>
          ) : (
            <TiltCard className="p-5">
              <div className="flex h-full flex-col justify-between gap-6">
                <p className="eyebrow">MOTM · last match</p>
                <span className="text-display block text-5xl text-mute">—</span>
              </div>
            </TiltCard>
          )}
        </Reveal>

        {/* Form */}
        <Reveal delay={0.05} className="col-span-2">
          <TiltCard className="p-5 md:p-6">
            <div className="flex h-full flex-col justify-between gap-6">
              <div className="flex items-baseline justify-between">
                <p className="eyebrow">Last 5</p>
                {club.lastMatch && (
                  <p className="truncate pl-3 text-sm text-mute">
                    vs {club.lastMatch.opponent} <span className="font-semibold text-chalk">{club.lastMatch.score}</span>
                  </p>
                )}
              </div>
              {club.form.length ? <FormStrip results={club.form} /> : <p className="text-sm text-mute">No matches synced yet.</p>}
            </div>
          </TiltCard>
        </Reveal>

        {/* Road to Division */}
        {club.division != null && club.division > 0 && (
          <Reveal delay={0.05} className="col-span-2 md:row-span-2">
            <TiltCard className="p-5 md:p-6" background="radial-gradient(70% 80% at 100% 0%, rgb(215 255 58 / 0.12), transparent 70%)">
              <div className="flex h-full flex-col gap-5">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="eyebrow">Road to {divLabel(club.division - 1)}</p>
                  {club.road.promotions != null && <p className="text-xs text-mute">{club.road.promotions} promotions so far</p>}
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-display text-6xl leading-none md:text-7xl">Div {club.division}</span>
                  <svg viewBox="0 0 24 24" className="size-7 text-accent" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                  <span className={`text-display text-4xl leading-none md:text-5xl ${club.division - 1 === 0 ? "text-gradient" : "text-white/35"}`}>
                    {club.division - 1 === 0 ? "Elite" : `Div ${club.division - 1}`}
                  </span>
                </div>
                <div className="mt-auto">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-xs text-mute">Skill rating</p>
                      <p className="text-display mt-1 text-4xl">{club.road.skill != null ? <Ticker value={club.road.skill} /> : "—"}</p>
                    </div>
                    {club.road.skillDelta != null && club.road.skillDelta !== 0 && (
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${club.road.skillDelta > 0 ? "bg-accent/15 text-accent" : "bg-depleted/15 text-depleted"}`}>
                        {club.road.skillDelta > 0 ? "▲ +" : "▼ "}
                        {club.road.skillDelta} this week
                      </span>
                    )}
                  </div>
                  {club.road.spark.length >= 2 ? (
                    <div className="mt-2">
                      <Spark values={club.road.spark} />
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-mute">The trend line fills in as matches sync.</p>
                  )}
                </div>
                {club.road.leagueForm.length > 0 && (
                  <div className="flex items-center justify-between gap-3 border-t border-white/[0.08] pt-4">
                    <p className="text-xs text-mute">League form</p>
                    <div className="flex gap-1.5">
                      {club.road.leagueForm.map((r, k) => (
                        <span
                          key={k}
                          className={`grid size-7 place-items-center rounded-full text-[11px] font-bold ${r === "W" ? "bg-accent text-black" : r === "L" ? "bg-depleted/80 text-white" : "bg-white/15"}`}
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TiltCard>
          </Reveal>
        )}

        {/* POTW */}
        <Reveal className="col-span-2 md:row-span-2">
          <TiltCard
            className="p-6 ring-1 ring-gold/25 md:p-8"
            background="radial-gradient(80% 60% at 85% 0%, rgb(221 177 104 / 0.22), transparent 70%), radial-gradient(60% 50% at 0% 100%, rgb(221 177 104 / 0.08), transparent 70%)"
          >
            <div className="relative flex h-full flex-col justify-between gap-8">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gold">{potw?.live ? "Leading this week" : "Player of the Week"}</p>
                {potw && (
                  <span className="rounded-full bg-gold/15 px-3 py-1 text-xs font-medium text-gold">{potw.matches} matches</span>
                )}
              </div>
              {potw ? (
                <>
                  <div className="flex items-end gap-5">
                    {potw.avatar ? (
                      <PlayerAvatar name={potw.name} src={potw.avatar} className="size-20 ring-2 ring-gold/60 md:size-24" />
                    ) : (
                      <Initials name={potw.name} className="size-20 bg-linear-to-br from-gold to-[#8a6a22] text-2xl text-black md:size-24" />
                    )}
                    <div className="min-w-0">
                      <p className="text-display truncate text-5xl md:text-6xl">{potw.name}</p>
                      {potw.number != null && <p className="mt-2 text-sm text-mute">#{potw.number}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 border-t border-gold/15 pt-5">
                    <div>
                      <Ticker value={potw.avgRating} decimals={1} className="text-3xl font-semibold text-gold" />
                      <p className="mt-1 text-xs text-mute">Avg rating</p>
                    </div>
                    <div>
                      <Ticker value={potw.goals} className="text-3xl font-semibold" />
                      <p className="mt-1 text-xs text-mute">Goals</p>
                    </div>
                    <div>
                      <Ticker value={potw.assists} className="text-3xl font-semibold" />
                      <p className="mt-1 text-xs text-mute">Assists</p>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-mute">Play 3+ matches this week to enter the race.</p>
              )}
            </div>
          </TiltCard>
        </Reveal>

        {/* Next matchday */}
        <Reveal delay={0.05} className="col-span-2">
          <Link href="/matchday" className="block h-full">
            <TiltCard className="p-5 md:p-6">
              <div className="flex h-full items-center justify-between gap-4">
                <div className="flex h-full flex-col justify-between gap-5">
                  <div>
                    <p className="eyebrow">Next matchday</p>
                    <p className="mt-1 text-2xl font-semibold tracking-tight">
                      {extras?.matchday ? `${extras.matchday.when} WIB` : real ? "Not scheduled yet" : nextMatchday.when}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
                    <span className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-accent transition-colors duration-700" />
                      {extras?.matchday?.ready ?? (real ? 0 : nextMatchday.ready)} Ready
                    </span>
                    <span className="flex items-center gap-2 text-mute">
                      <span className="size-2 rounded-full bg-gold" />
                      {extras?.matchday?.onTheWay ?? (real ? 0 : nextMatchday.onTheWay)} On the way
                    </span>
                    <span className="flex items-center gap-2 text-mute">
                      <span className="size-2 rounded-full bg-depleted" />
                      {extras?.matchday?.out ?? (real ? 0 : nextMatchday.out)} Out
                    </span>
                  </div>
                </div>
                {extras?.matchday ? (
                  <div className="flex shrink-0 flex-col items-center gap-1">
                    <Jersey kit={extras.matchday.kit} className="size-20 drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] md:size-24" />
                    <span className="text-xs capitalize text-mute">{extras.matchday.kit} kit</span>
                  </div>
                ) : (
                  <CurrentKitChip />
                )}
              </div>
            </TiltCard>
          </Link>
        </Reveal>

        {/* Season countdown */}
        <Reveal delay={0.05} className="col-span-2 md:row-span-2">
          <TiltCard className="p-5 md:p-6" background="radial-gradient(70% 70% at 100% 0%, rgb(221 177 104 / 0.14), transparent 70%)">
            <div className="flex h-full flex-col gap-5">
              <div className="flex items-baseline justify-between gap-3">
                <p className="eyebrow">{club.countdown.season} ends in</p>
                <Link href="/stats" className="text-xs text-mute transition hover:text-chalk">
                  Season race ›
                </Link>
              </div>
              <Countdown to={club.countdown.ends} />
              <div className="mt-auto">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-gold">Player of the Season race</p>
                {club.countdown.race.length ? (
                  <ol className="space-y-2">
                    {club.countdown.race.map((r, k) => (
                      <li key={r.name} className={`flex items-center gap-3 rounded-2xl px-3 py-2 ${k === 0 ? "bg-gold/10 ring-1 ring-gold/25" : "bg-white/[0.04]"}`}>
                        <span className={`w-4 text-sm font-semibold ${k === 0 ? "text-gold" : "text-mute"}`}>{k + 1}</span>
                        <PlayerAvatar name={r.name} src={r.avatar} className="size-8 text-[10px]" />
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{r.name}</span>
                        <span className="text-xs text-mute">{r.matches} MP</span>
                        <span className={`w-9 text-right text-sm font-semibold tabular-nums ${k === 0 ? "text-gold" : ""}`}>{r.rating.toFixed(1)}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-mute">Play {MIN_SEASON_MATCHES}+ matches this season to enter the race.</p>
                )}
              </div>
              {club.countdown.recent && (
                <Link
                  href={`/awards/${club.countdown.recent.n}`}
                  className="gold-sheen flex items-center justify-between rounded-2xl bg-gold/15 px-4 py-3 text-sm font-semibold ring-1 ring-gold/30"
                >
                  <span className="flex items-center gap-2"><TrophyIcon className="size-4 text-gold" />{club.countdown.recent.name} Awards Night</span>
                  <span className="text-mute">›</span>
                </Link>
              )}
            </div>
          </TiltCard>
        </Reveal>

        {/* Golden boot — current EA season */}
        <Reveal delay={0.05} className="col-span-1">
          <Link href="/stats" className="block h-full">
          <TiltCard className="p-5">
            <div className="flex h-full flex-col justify-between gap-6">
              <div>
                <p className="eyebrow">Golden Boot</p>
                <p className="mt-1 text-[11px] text-mute">{seasonInfo.name} · so far</p>
              </div>
              <div>
                <Ticker value={scorer?.value ?? 0} className="text-display block text-5xl" />
                <p className="mt-2 truncate text-sm text-mute">
                  goals · <span className="text-chalk">{scorer?.name ?? "—"}</span>
                </p>
              </div>
            </div>
          </TiltCard>
          </Link>
        </Reveal>

        {/* Top assist — current EA season */}
        <Reveal delay={0.1} className="col-span-1">
          <Link href="/stats" className="block h-full">
          <TiltCard className="p-5">
            <div className="flex h-full flex-col justify-between gap-6">
              <div>
                <p className="eyebrow">Playmaker</p>
                <p className="mt-1 text-[11px] text-mute">Ends {seasonInfo.ends}</p>
              </div>
              <div>
                <Ticker value={assister?.value ?? 0} className="text-display block text-5xl" />
                <p className="mt-2 truncate text-sm text-mute">
                  assists · <span className="text-chalk">{assister?.name ?? "—"}</span>
                </p>
              </div>
            </div>
          </TiltCard>
          </Link>
        </Reveal>

        {/* GOTW clip */}
        <Reveal className="col-span-2">
          {extras?.gotw ? (
            <HomeClipTile
              provider={extras.gotw.provider}
              embedId={extras.gotw.embedId}
              url={extras.gotw.url}
              title={`“${extras.gotw.caption ?? "Worldie"}”`}
              sub={`${extras.gotw.featuring?.name ?? extras.gotw.submitter.name} · ${extras.gotw.votes} votes`}
            />
          ) : (
          <Link href="/showdown" className="block h-full">
          <TiltCard className="p-0">
            <div className="flex h-full min-h-[180px] flex-col justify-end">
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(70% 90% at 75% 20%, color-mix(in oklab, var(--accent-2) 60%, transparent), transparent 70%), linear-gradient(160deg, #07072e, #000 70%)",
                }}
              />
              <div className="glass hairline absolute right-5 top-5 grid size-12 place-items-center rounded-full">
                <PlayFilled className="size-5" />
              </div>
              <div className="relative p-5 md:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent transition-colors duration-700">
                  Goal of the Week
                </p>
                <p className="mt-1 truncate text-xl font-semibold tracking-tight">
                  {extras?.gotw ? `“${extras.gotw.caption ?? "Worldie"}”` : real ? "Submit this week’s worldie" : gotw.title}
                </p>
                <p className="mt-1 text-sm text-mute">
                  {extras?.gotw
                    ? `${extras.gotw.featuring?.name ?? extras.gotw.submitter.name} · ${extras.gotw.votes} votes`
                    : real
                      ? `${extras?.clipsThisWeek ?? 0} clips in this week’s Showdown`
                      : `${gotw.player} · ${gotw.votes} votes`}
                </p>
              </div>
            </div>
          </TiltCard>
          </Link>
          )}
        </Reveal>

        {/* WPOTW */}
        <Reveal delay={0.05} className="col-span-1">
          <TiltCard className="p-5 ring-1 ring-depleted/20" background="radial-gradient(90% 70% at 100% 0%, rgb(255 69 58 / 0.14), transparent 70%)">
            <div className="flex h-full flex-col justify-between gap-6">
              <p className="text-[13px] font-semibold text-depleted">Player of the Weak</p>
              <div>
                {wpotw ? (
                  <>
                    <p className="truncate text-3xl font-semibold tracking-tight">{wpotw.name}</p>
                    <p className="mt-1 text-sm text-mute">
                      <Ticker value={wpotw.avgRating} decimals={1} className="text-chalk" /> avg · {wpotw.live ? "so far" : "stamina depleted"}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-mute">Nobody qualified yet.</p>
                )}
              </div>
            </div>
          </TiltCard>
        </Reveal>

        {/* Sync status */}
        <Reveal delay={0.1} className="col-span-1">
          <TiltCard className="p-5" glow={false}>
            <div className="flex h-full flex-col justify-between gap-6">
              <p className="eyebrow">EA sync</p>
              <div>
                <p className="flex items-center gap-2 text-sm font-medium">
                  <span className="relative flex size-2">
                    <span
                      className={`absolute inline-flex size-full rounded-full opacity-60 motion-safe:animate-ping ${sync?.ok ? "bg-accent" : sync ? "bg-depleted" : "bg-gold"}`}
                    />
                    <span className={`relative inline-flex size-2 rounded-full ${sync?.ok ? "bg-accent" : sync ? "bg-depleted" : "bg-gold"}`} />
                  </span>
                  {sync ? (sync.ok ? "Live from EA" : "Sync failed") : "Demo data"}
                </p>
                <p className="mt-1 text-sm text-mute">{sync ? `Last sync ${timeAgo(sync.at)}` : "Waiting for the first EA sync."}</p>
              </div>
            </div>
          </TiltCard>
        </Reveal>
      </div>
    </section>
  );
}
