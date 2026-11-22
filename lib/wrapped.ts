import "server-only";
import { db, ensureSchema } from "./db";
import { allAwards, hattricks, maestros } from "./awards";
import { MIN_MATCHES, rangeTable, weekKey, weekStart } from "./honors";
import { avatarUrl } from "./players";
import { finishedSeasons, seasonAt, seasonByNumber, type Season } from "./seasons";
import type { Archetype, Mate, Wrapped } from "./wrapped-meta";

/** How long the Home banner advertises a fresh Wrapped. The Wrapped itself never expires. */
export const WRAPPED_BANNER_DAYS = 14;

export { ARCHETYPES } from "./wrapped-meta";
export type { Archetype, Mate, Wrapped } from "./wrapped-meta";

type Row = {
  match_id: string;
  played_at: string;
  result: "W" | "D" | "L";
  gf: number;
  ga: number;
  opponent_name: string | null;
  rating: number;
  goals: number;
  assists: number;
  shots: number;
  passes_made: number;
  pass_attempts: number;
  tackles_made: number;
  tackle_attempts: number;
  saves: number;
  clean_sheet: boolean;
  motm: boolean;
  red_cards: number;
  position: string | null;
};

type Agg = {
  gamertag: string;
  matches: number;
  goals: number;
  assists: number;
  shots: number;
  pm: number;
  pa: number;
  tm: number;
  ta: number;
  saves: number;
  reds: number;
  cs: number;
  rating: number;
  sd: number;
};

type P = { id: string; slug: string; display_name: string; ea_gamertag: string; jersey_number: number; avatar_version: number; has_avatar: boolean };

const night = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });

/** Which seasons can be opened: finished ones always; the running one only as a preview. */
export function wrappedSeason(n: number): { season: Season; finished: boolean } | null {
  const s = seasonByNumber(n);
  if (!s) return null;
  const finished = finishedSeasons().some((f) => f.n === s.n);
  if (!finished && s.n !== seasonAt().n) return null;
  return { season: s, finished };
}

/** Seasons (newest first) in which this gamertag played at least one match. */
export async function wrappedSeasons(gamertag: string): Promise<{ n: number; name: string; finished: boolean; matches: number }[]> {
  await ensureSchema();
  const rows = (await db()`SELECT m.played_at FROM ea_match_players mp JOIN ea_matches m USING (match_id)
                           WHERE lower(mp.gamertag) = lower(${gamertag})`) as { played_at: string }[];
  const done = new Set(finishedSeasons().map((s) => s.n));
  const count = new Map<number, { name: string; matches: number }>();
  for (const r of rows) {
    const s = seasonAt(new Date(r.played_at));
    const c = count.get(s.n) ?? { name: s.name, matches: 0 };
    c.matches++;
    count.set(s.n, c);
  }
  return [...count.entries()]
    .map(([n, c]) => ({ n, name: c.name, matches: c.matches, finished: done.has(n) }))
    .sort((a, b) => b.n - a.n);
}

export async function buildWrapped(seasonN: number, gamertag: string): Promise<Wrapped | null> {
  await ensureSchema();
  const ws = wrappedSeason(seasonN);
  if (!ws) return null;
  const { season, finished } = ws;
  const end = finished ? season.end : new Date();
  const s = season.start.toISOString();
  const e = end.toISOString();
  const sql = db();

  const [rows, aggs, partners, roster, table] = (await Promise.all([
    sql`SELECT m.match_id, m.played_at, m.result, m.goals_for AS gf, m.goals_against AS ga, m.opponent_name,
               mp.rating, mp.goals, mp.assists, mp.shots, mp.passes_made, mp.pass_attempts, mp.tackles_made, mp.tackle_attempts,
               mp.saves, mp.clean_sheet, mp.motm, mp.red_cards, mp.position
        FROM ea_match_players mp JOIN ea_matches m USING (match_id)
        WHERE lower(mp.gamertag) = lower(${gamertag}) AND m.played_at >= ${s} AND m.played_at < ${e}
        ORDER BY m.played_at`,
    sql`SELECT mp.gamertag, count(*)::int AS matches, sum(mp.goals)::int AS goals, sum(mp.assists)::int AS assists,
               sum(mp.shots)::int AS shots, sum(mp.passes_made)::int AS pm, sum(mp.pass_attempts)::int AS pa,
               sum(mp.tackles_made)::int AS tm, sum(mp.tackle_attempts)::int AS ta, sum(mp.saves)::int AS saves,
               sum(mp.red_cards)::int AS reds, sum(CASE WHEN mp.clean_sheet THEN 1 ELSE 0 END)::int AS cs,
               coalesce(avg(mp.rating), 0)::float8 AS rating, coalesce(stddev_pop(mp.rating), 0)::float8 AS sd
        FROM ea_match_players mp JOIN ea_matches m USING (match_id)
        WHERE m.played_at >= ${s} AND m.played_at < ${e}
        GROUP BY mp.gamertag`,
    sql`SELECT o.gamertag, count(*)::int AS together, sum(CASE WHEN m.result = 'W' THEN 1 ELSE 0 END)::int AS wins
        FROM ea_match_players me
        JOIN ea_match_players o ON o.match_id = me.match_id AND lower(o.gamertag) <> lower(me.gamertag)
        JOIN ea_matches m ON m.match_id = me.match_id
        WHERE lower(me.gamertag) = lower(${gamertag}) AND m.played_at >= ${s} AND m.played_at < ${e}
        GROUP BY o.gamertag`,
    sql`SELECT id, slug, display_name, ea_gamertag, jersey_number, avatar_version, (avatar_b64 IS NOT NULL) AS has_avatar
        FROM players WHERE active`,
    rangeTable(season.start, end),
  ])) as [Row[], Agg[], { gamertag: string; together: number; wins: number }[], P[], Awaited<ReturnType<typeof rangeTable>>];

  if (!rows.length) return null;

  const byTag = new Map(roster.map((p) => [p.ea_gamertag.toLowerCase(), p]));
  const mate = (tag: string): Mate => {
    const p = byTag.get(tag.toLowerCase());
    return p
      ? { name: p.display_name, slug: p.slug, playerId: p.id, avatar: avatarUrl(p), number: p.jersey_number }
      : { name: tag, slug: null, playerId: null, avatar: null, number: null };
  };

  // ---- the player's own season ----
  const n = rows.length;
  const sum = (k: keyof Row) => rows.reduce((a, r) => a + (Number(r[k]) || 0), 0);
  const goals = sum("goals");
  const assists = sum("assists");
  const motm = rows.filter((r) => r.motm).length;
  const avgRating = rows.reduce((a, r) => a + r.rating, 0) / n;
  const record = { W: 0, D: 0, L: 0 };
  rows.forEach((r) => record[r.result]++);
  const nights = new Set(rows.map((r) => night(r.played_at))).size;

  const pos = new Map<string, number>();
  rows.forEach((r) => r.position && pos.set(r.position, (pos.get(r.position) ?? 0) + 1));
  const position = [...pos.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const bestRow = [...rows].sort((a, b) => b.rating - a.rating || b.goals + b.assists - (a.goals + a.assists))[0];
  const best = bestRow
    ? {
        opponent: bestRow.opponent_name ?? "Unknown",
        gf: bestRow.gf,
        ga: bestRow.ga,
        rating: bestRow.rating,
        goals: bestRow.goals,
        assists: bestRow.assists,
        playedAt: new Date(bestRow.played_at).toISOString(),
      }
    : null;

  // favourite victim: who you scored most against (else: who you beat most)
  const opp = new Map<string, { goals: number; W: number; D: number; L: number; played: number }>();
  rows.forEach((r) => {
    const k = r.opponent_name ?? "Unknown";
    const o = opp.get(k) ?? { goals: 0, W: 0, D: 0, L: 0, played: 0 };
    o.goals += r.goals;
    o[r.result]++;
    o.played++;
    opp.set(k, o);
  });
  const victimEntry = [...opp.entries()]
    .filter(([k]) => k !== "Unknown")
    .sort((a, b) => b[1].goals - a[1].goals || b[1].W - a[1].W || b[1].played - a[1].played)[0];
  const victim = victimEntry && (victimEntry[1].goals > 0 || victimEntry[1].W > 0) ? { opponent: victimEntry[0], ...victimEntry[1] } : null;

  // partner in crime: best win rate together (min 3 shared matches, more is better on ties)
  const minTogether = Math.min(5, Math.max(3, Math.floor(n / 4)));
  const pBest = partners
    .filter((p) => p.together >= minTogether)
    .sort((a, b) => b.wins / b.together - a.wins / a.together || b.together - a.together)[0] ??
    partners.filter((p) => p.together >= 3).sort((a, b) => b.wins / b.together - a.wins / a.together || b.together - a.together)[0];
  const partner = pBest ? { ...mate(pBest.gamertag), together: pBest.together, wins: pBest.wins, rate: pBest.wins / pBest.together } : null;

  // ---- club context ----
  const qualified = aggs.filter((a) => a.matches >= Math.min(3, n));
  const me = aggs.find((a) => a.gamertag.toLowerCase() === gamertag.toLowerCase())!;
  const rankBy = (k: (a: Agg) => number) => 1 + aggs.filter((a) => k(a) > k(me)).length;
  /** 0..1, share of qualified players you beat (ties count half) */
  const pct = (k: (a: Agg) => number | null, list = qualified) => {
    const mine = k(me);
    const vals = list.map(k).filter((v): v is number => v != null);
    if (mine == null || vals.length < 2) return 0;
    const below = vals.filter((v) => v < mine).length;
    const same = vals.filter((v) => v === mine).length - 1;
    return (below + same / 2) / (vals.length - 1);
  };
  const place = (k: (a: Agg) => number | null, list = qualified) => {
    const mine = k(me);
    return mine == null ? 99 : 1 + list.filter((a) => (k(a) ?? -Infinity) > mine).length;
  };

  // signature stat
  const passPct = (a: Agg) => (a.pa >= 40 ? a.pm / a.pa : null);
  const tacklePct = (a: Agg) => (a.ta >= 10 ? a.tm / a.ta : null);
  const conversion = (a: Agg) => (a.shots >= 8 ? a.goals / a.shots : null);
  const savesPm = (a: Agg) => (a.saves > 0 ? a.saves / a.matches : null);
  const sigs = [
    { label: "Passing accuracy", f: passPct, fmt: (v: number) => `${Math.round(v * 100)}%` },
    { label: "Tackles won", f: tacklePct, fmt: (v: number) => `${Math.round(v * 100)}%` },
    { label: "Shot conversion", f: conversion, fmt: (v: number) => `${Math.round(v * 100)}%` },
    { label: "Saves per match", f: savesPm, fmt: (v: number) => v.toFixed(1) },
  ]
    .map((x) => ({ ...x, v: x.f(me), p: pct(x.f), r: place(x.f) }))
    .filter((x) => x.v != null)
    .sort((a, b) => b.p - a.p || a.r - b.r);
  const signature = sigs[0] ? { label: sigs[0].label, value: sigs[0].fmt(sigs[0].v as number), rank: sigs[0].r } : null;

  // archetype — whichever trait you lead the club in the most
  const per = (k: keyof Agg) => (a: Agg) => (Number(a[k]) || 0) / a.matches;
  const reds = me.reds;
  const maxReds = Math.max(...aggs.map((a) => a.reds));
  const cands: { a: Archetype; p: number; stats: { label: string; value: string }[] }[] = [
    {
      a: "sniper",
      p: pct(per("goals")),
      stats: [
        { label: "Goals", value: String(goals) },
        { label: "Per match", value: (goals / n).toFixed(2) },
        { label: "Shots", value: String(sum("shots")) },
      ],
    },
    {
      a: "maestro",
      p: pct(per("assists")),
      stats: [
        { label: "Assists", value: String(assists) },
        { label: "Per match", value: (assists / n).toFixed(2) },
        { label: "Pass acc.", value: me.pa ? `${Math.round((me.pm / me.pa) * 100)}%` : "—" },
      ],
    },
    {
      a: "wall",
      p: Math.max(pct(per("tm")), pct(per("saves")), pct(per("cs"))),
      stats: [
        { label: "Tackles", value: String(me.tm) },
        { label: me.saves > 0 ? "Saves" : "Clean sheets", value: String(me.saves > 0 ? me.saves : me.cs) },
        { label: "Rating", value: avgRating.toFixed(1) },
      ],
    },
    {
      a: "consistent",
      p: n >= 8 ? pct((a) => (a.matches >= 8 ? -a.sd + a.rating / 100 : null)) : 0,
      stats: [
        { label: "Avg rating", value: avgRating.toFixed(1) },
        { label: "Swing", value: `±${me.sd.toFixed(1)}` },
        { label: "Matches", value: String(n) },
      ],
    },
    {
      a: "engine",
      p: pct((a) => a.matches, aggs),
      stats: [
        { label: "Matches", value: String(n) },
        { label: "Nights", value: String(nights) },
        { label: "Club rank", value: `#${rankBy((a) => a.matches)}` },
      ],
    },
  ];
  cands.sort((a, b) => b.p - a.p);
  let pick = cands[0];
  if (reds >= 2 && reds === maxReds) {
    pick = {
      a: "hothead",
      p: 1,
      stats: [
        { label: "Red cards", value: String(reds) },
        { label: "Matches", value: String(n) },
        { label: "Rating", value: avgRating.toFixed(1) },
      ],
    };
  }

  // ---- awards this season ----
  const awardMap = await allAwards();
  const me2 = byTag.get(gamertag.toLowerCase());
  const pa = me2 ? awardMap.get(me2.id) : undefined;
  const from = weekKey(weekStart(season.start));
  const to = weekKey(weekStart(end));
  const inSeason = (k: string) => k >= from && k <= to;
  const tricks = (await hattricks(gamertag)).filter((h) => {
    const t = new Date(h.playedAt);
    return t >= season.start && t < end;
  });
  const assistTricks = (await maestros(gamertag)).filter((h) => {
    const t = new Date(h.playedAt);
    return t >= season.start && t < end;
  });
  const awards = {
    potw: (pa?.potwWeeks ?? []).filter(inSeason).length,
    weak: (pa?.weakWeeks ?? []).filter(inSeason).length,
    hattricks: tricks.length,
    maestros: assistTricks.length,
    season: (pa?.season ?? []).filter((x) => x.n === season.n).map((x) => (x.kind === "pots" ? "Player of the Season" : x.kind === "boot" ? "Golden Boot" : "Playmaker")),
  };

  // ---- club summary ----
  const [clubRow] = (await sql`
    SELECT count(*) FILTER (WHERE result = 'W')::int AS w, count(*) FILTER (WHERE result = 'D')::int AS d,
           count(*) FILTER (WHERE result = 'L')::int AS l, coalesce(sum(goals_for), 0)::int AS gf, coalesce(sum(goals_against), 0)::int AS ga,
           count(*)::int AS n
    FROM ea_matches WHERE played_at >= ${s} AND played_at < ${e}`) as { w: number; d: number; l: number; gf: number; ga: number; n: number }[];
  const top = table
    .filter((l) => l.matches >= MIN_MATCHES)
    .slice(0, 3)
    .map((l) => ({ ...mate(l.gamertag), rating: l.avgRating, matches: l.matches }));

  const self = mate(gamertag);
  return {
    season: { n: season.n, name: season.name, start: season.start.toISOString(), end: season.end.toISOString(), finished },
    player: { ...self, gamertag, position },
    matches: n,
    nights,
    clubPlayers: aggs.length,
    rank: { matches: rankBy((a) => a.matches), goals: rankBy((a) => a.goals), assists: rankBy((a) => a.assists) },
    goals,
    assists,
    motm,
    avgRating,
    record,
    best,
    victim,
    partner,
    signature,
    awards,
    archetype: pick.a,
    archetypeStats: pick.stats,
    club: {
      record: { W: clubRow?.w ?? 0, D: clubRow?.d ?? 0, L: clubRow?.l ?? 0 },
      gf: clubRow?.gf ?? 0,
      ga: clubRow?.ga ?? 0,
      matches: clubRow?.n ?? 0,
      top,
    },
  };
}
