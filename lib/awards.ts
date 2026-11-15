import "server-only";
import { db, ensureSchema } from "./db";
import { MIN_MATCHES, pickHonors, rangeTable, weekKey, weekStart, type WeeklyLine } from "./honors";
import { finishedSeasons, seasonAt, type Season } from "./seasons";

export const MIN_SEASON_MATCHES = 8;

export type SeasonAwardKind = "pots" | "boot" | "assist";
export type SeasonAward = { kind: SeasonAwardKind; season: string; n: number; value: number };
export type PlayerAwards = { potw: number; weak: number; potwWeeks: string[]; weakWeeks: string[]; season: SeasonAward[] };

export const SEASON_AWARD_LABEL: Record<SeasonAwardKind, string> = {
  pots: "Player of the Season",
  boot: "Golden Boot",
  assist: "Playmaker",
};

/** Winners for one finished EA season. */
export function seasonWinners(table: WeeklyLine[]) {
  const q = table.filter((l) => l.playerId && l.matches >= MIN_SEASON_MATCHES);
  const pots = q[0] ?? null;
  const linked = table.filter((l) => l.playerId && l.matches >= MIN_MATCHES);
  const top = (k: "goals" | "assists") =>
    [...linked].filter((l) => l[k] > 0).sort((a, b) => b[k] - a[k] || a.matches - b.matches)[0] ?? null;
  return { pots, boot: top("goals"), assist: top("assists") };
}

async function weeksWithMatches(): Promise<Date[]> {
  await ensureSchema();
  const rows = (await db()`
    SELECT DISTINCT date_trunc('week', played_at + interval '7 hours') - interval '7 hours' AS wk
    FROM ea_matches ORDER BY wk`) as { wk: string }[];
  const current = weekKey(weekStart());
  return rows.map((r) => weekStart(new Date(new Date(r.wk).getTime() + 3600000))).filter((d) => weekKey(d) !== current);
}

let cache: { at: number; data: Map<string, PlayerAwards> } | null = null;

/** Every player's trophy cabinet: weekly POTW / Player of the Weak counts + finished-season awards. */
export async function allAwards(): Promise<Map<string, PlayerAwards>> {
  if (cache && Date.now() - cache.at < 60_000) return cache.data;
  const out = new Map<string, PlayerAwards>();
  const get = (id: string) => {
    let a = out.get(id);
    if (!a) out.set(id, (a = { potw: 0, weak: 0, potwWeeks: [], weakWeeks: [], season: [] }));
    return a;
  };
  try {
    const weeks = await weeksWithMatches();
    const seasons = finishedSeasons();
    const [weekly, seasonal] = await Promise.all([
      Promise.all(weeks.map((w) => rangeTable(w, new Date(w.getTime() + 7 * 86400000)))),
      Promise.all(seasons.map((s) => rangeTable(s.start, s.end))),
    ]);
    weekly.forEach((t, i) => {
      const key = weekKey(weeks[i]);
      const { potw, wpotw } = pickHonors(t);
      if (potw?.playerId) {
        get(potw.playerId).potw++;
        get(potw.playerId).potwWeeks.unshift(key);
      }
      if (wpotw?.playerId) {
        get(wpotw.playerId).weak++;
        get(wpotw.playerId).weakWeeks.unshift(key);
      }
    });
    seasonal.forEach((t, i) => {
      const w = seasonWinners(t);
      const { name, n } = seasons[i];
      if (w.pots?.playerId) get(w.pots.playerId).season.push({ kind: "pots", season: name, n, value: w.pots.matches });
      if (w.boot?.playerId) get(w.boot.playerId).season.push({ kind: "boot", season: name, n, value: w.boot.goals });
      if (w.assist?.playerId) get(w.assist.playerId).season.push({ kind: "assist", season: name, n, value: w.assist.assists });
    });
  } catch {
    /* no data yet */
  }
  cache = { at: Date.now(), data: out };
  return out;
}

export type CardStats = {
  scope: string;
  matches: number;
  goals: number;
  assists: number;
  motm: number;
  winRate: number | null;
  rating: number | null;
};

/** Current-season numbers for one EA gamertag. */
export async function seasonStats(gamertag: string, season: Season = seasonAt()): Promise<CardStats> {
  await ensureSchema();
  const [r] = (await db()`
    SELECT count(*)::int AS matches, coalesce(sum(mp.goals), 0)::int AS goals, coalesce(sum(mp.assists), 0)::int AS assists,
           sum(CASE WHEN mp.motm THEN 1 ELSE 0 END)::int AS motm,
           sum(CASE WHEN m.result = 'W' THEN 1 ELSE 0 END)::int AS wins,
           avg(mp.rating)::float8 AS rating
    FROM ea_match_players mp JOIN ea_matches m USING (match_id)
    WHERE lower(mp.gamertag) = lower(${gamertag})
      AND m.played_at >= ${season.start.toISOString()} AND m.played_at < ${season.end.toISOString()}`) as {
    matches: number;
    goals: number;
    assists: number;
    motm: number | null;
    wins: number | null;
    rating: number | null;
  }[];
  return {
    scope: season.name,
    matches: r?.matches ?? 0,
    goals: r?.goals ?? 0,
    assists: r?.assists ?? 0,
    motm: r?.motm ?? 0,
    winRate: r?.matches ? Math.round(((r.wins ?? 0) / r.matches) * 100) : null,
    rating: r?.rating ?? null,
  };
}

export type Hattrick = { matchId: string; gamertag: string; goals: number; opponent: string; gf: number; ga: number; playedAt: string };

/** Every 3+ goal game in the archive, newest first. */
export async function hattricks(gamertag?: string): Promise<Hattrick[]> {
  await ensureSchema();
  const rows = (await db().query(
    `SELECT mp.match_id, mp.gamertag, mp.goals, m.opponent_name, m.goals_for, m.goals_against, m.played_at
     FROM ea_match_players mp JOIN ea_matches m USING (match_id)
     WHERE mp.goals >= 3 ${gamertag ? "AND lower(mp.gamertag) = lower($1)" : ""}
     ORDER BY m.played_at DESC`,
    gamertag ? [gamertag] : [],
  )) as {
    match_id: string;
    gamertag: string;
    goals: number;
    opponent_name: string | null;
    goals_for: number;
    goals_against: number;
    played_at: string;
  }[];
  return rows.map((r) => ({
    matchId: r.match_id,
    gamertag: r.gamertag,
    goals: r.goals,
    opponent: r.opponent_name ?? "Unknown",
    gf: r.goals_for,
    ga: r.goals_against,
    playedAt: new Date(r.played_at).toISOString(),
  }));
}

export const MILESTONES = {
  goals: { label: "Goals", steps: [10, 25, 50, 75, 100, 150, 200, 250, 300, 400, 500, 750, 1000] },
  assists: { label: "Assists", steps: [10, 25, 50, 75, 100, 150, 200, 250, 300, 400, 500, 750, 1000] },
  matches: { label: "Matches", steps: [10, 25, 50, 100, 150, 200, 250, 300, 400, 500, 750, 1000] },
  motm: { label: "Man of the Match", steps: [5, 10, 25, 50, 75, 100, 150, 200] },
} as const;
export type MilestoneStat = keyof typeof MILESTONES;
export type Milestone = { stat: MilestoneStat; n: number };

/** Milestones reached, from EA club-career totals (highest first per stat). */
export function milestonesFor(t: { goals: number; assists: number; gamesPlayed: number; motm: number } | null): Milestone[] {
  if (!t) return [];
  const val: Record<MilestoneStat, number> = { goals: t.goals, assists: t.assists, matches: t.gamesPlayed, motm: t.motm };
  const out: Milestone[] = [];
  (Object.keys(MILESTONES) as MilestoneStat[]).forEach((stat) => {
    const reached = MILESTONES[stat].steps.filter((n) => val[stat] >= n);
    reached.reverse().forEach((n) => out.push({ stat, n }));
  });
  return out;
}
