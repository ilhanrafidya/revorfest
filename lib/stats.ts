import "server-only";
import type { WeeklyLine } from "./honors";
import { db, ensureSchema } from "./db";
import { parseMembers, parseOverall, squadFromRaw, type ClubOverall, type MemberStat } from "./ea";
import { avatarUrl } from "./players";

export type Linked = { name: string; slug: string | null; avatar: string | null; number: number | null };

type PlayerRow = { id: string; slug: string; display_name: string; ea_gamertag: string; jersey_number: number; avatar_version: number; has_avatar: boolean };

async function rosterIndex() {
  const rows = (await db()`
    SELECT id, slug, display_name, ea_gamertag, jersey_number, avatar_version, (avatar_b64 IS NOT NULL) AS has_avatar
    FROM players WHERE active`) as PlayerRow[];
  const map = new Map<string, PlayerRow>();
  for (const r of rows) map.set(r.ea_gamertag.toLowerCase(), r);
  return map;
}

function link(index: Map<string, PlayerRow>, gamertag: string): Linked {
  const p = index.get(gamertag.toLowerCase());
  return p
    ? { name: p.display_name, slug: p.slug, avatar: avatarUrl(p), number: p.jersey_number }
    : { name: gamertag, slug: null, avatar: null, number: null };
}

export type SyncStatus = { at: string; ok: boolean; added: number; errors: Record<string, string> } | null;

export async function lastSync(): Promise<SyncStatus> {
  await ensureSchema();
  const [r] = (await db()`SELECT at, ok, matches_added, details FROM sync_runs ORDER BY id DESC LIMIT 1`) as {
    at: string;
    ok: boolean;
    matches_added: number;
    details: { errors?: Record<string, string> } | null;
  }[];
  return r ? { at: new Date(r.at).toISOString(), ok: r.ok, added: r.matches_added, errors: r.details?.errors ?? {} } : null;
}

async function state(kind: string): Promise<unknown> {
  const [r] = (await db()`SELECT data FROM ea_state WHERE kind = ${kind}`) as { data: unknown }[];
  return r?.data ?? null;
}

export async function clubOverall(): Promise<ClubOverall | null> {
  await ensureSchema();
  const [overall, leaderboard] = await Promise.all([state("overall"), state("leaderboard")]);
  return parseOverall(overall, leaderboard);
}

export type MatchRow = {
  match_id: string;
  match_type: string;
  played_at: string;
  goals_for: number;
  goals_against: number;
  result: "W" | "D" | "L";
  opponent_id: string | null;
  opponent_name: string | null;
};

export async function recentMatches(limit = 20): Promise<MatchRow[]> {
  await ensureSchema();
  const rows = (await db()`
    SELECT match_id, match_type, played_at, goals_for, goals_against, result, opponent_id, opponent_name
    FROM ea_matches ORDER BY played_at DESC LIMIT ${limit}`) as MatchRow[];
  return rows.map((r) => ({ ...r, played_at: new Date(r.played_at).toISOString() }));
}

export async function matchDetail(id: string) {
  await ensureSchema();
  const sql = db();
  const [m] = (await sql`
    SELECT match_id, match_type, played_at, goals_for, goals_against, result, opponent_id, opponent_name, raw
    FROM ea_matches WHERE match_id = ${id}`) as (MatchRow & { raw: unknown })[];
  if (!m) return null;
  const opponents = squadFromRaw(m.raw, m.opponent_id).map((r) => ({
    ...r,
    who: { name: r.gamertag, slug: null, avatar: null, number: null } as Linked,
  }));
  const [rows, index, h2h] = await Promise.all([
    sql`SELECT * FROM ea_match_players WHERE match_id = ${id} ORDER BY rating DESC NULLS LAST` as unknown as Promise<
      {
        gamertag: string;
        position: string | null;
        rating: number | null;
        goals: number;
        assists: number;
        shots: number;
        passes_made: number;
        pass_attempts: number;
        tackles_made: number;
        tackle_attempts: number;
        saves: number;
        motm: boolean;
        red_cards: number;
      }[]
    >,
    rosterIndex(),
    m.opponent_id
      ? (sql`SELECT result, count(*)::int AS n FROM ea_matches WHERE opponent_id = ${m.opponent_id} GROUP BY result` as unknown as Promise<
          { result: string; n: number }[]
        >)
      : Promise.resolve([] as { result: string; n: number }[]),
  ]);
  const record = { W: 0, D: 0, L: 0 };
  for (const r of h2h) if (r.result in record) record[r.result as "W" | "D" | "L"] = r.n;
  return {
    match: {
      match_id: m.match_id,
      match_type: m.match_type,
      played_at: new Date(m.played_at).toISOString(),
      goals_for: m.goals_for,
      goals_against: m.goals_against,
      result: m.result,
      opponent_id: m.opponent_id,
      opponent_name: m.opponent_name,
    },
    opponents,
    players: rows.map((r) => ({ ...r, who: link(index, r.gamertag) })),
    h2h: record,
  };
}

export type BoardEntry = MemberStat & { who: Linked };

/** Leaderboards from EA's member stats (club career), linked to registered players. */
export async function leaderboards() {
  await ensureSchema();
  const [members, index] = await Promise.all([state("members"), rosterIndex()]);
  const list: BoardEntry[] = parseMembers(members).map((m) => ({ ...m, who: link(index, m.name) }));
  const top = (key: (m: BoardEntry) => number, min = 0) =>
    list
      .filter((m) => m.gamesPlayed >= min && key(m) > 0)
      .sort((a, b) => key(b) - key(a))
      .slice(0, 5);
  return {
    all: list,
    goals: top((m) => m.goals),
    assists: top((m) => m.assists),
    cleanSheets: top((m) => m.cleanSheets),
    played: top((m) => m.gamesPlayed),
    mvp: top((m) => m.ratingAve + m.motm * 0.01, 5),
  };
}

/** Same four boards, but only for matches stored for one EA season (our own archive). */
export async function seasonBoards(table: WeeklyLine[]) {
  const index = await rosterIndex();
  const list: BoardEntry[] = table.map((l) => ({
    name: l.gamertag,
    gamesPlayed: l.matches,
    goals: l.goals,
    assists: l.assists,
    ratingAve: l.avgRating,
    motm: l.motm,
    cleanSheets: l.cleanSheets,
    position: null,
    winRate: null,
    who: link(index, l.gamertag),
  }));
  const top = (key: (m: BoardEntry) => number, min = 0) =>
    list
      .filter((m) => m.gamesPlayed >= min && key(m) > 0)
      .sort((a, b) => key(b) - key(a) || a.gamesPlayed - b.gamesPlayed)
      .slice(0, 5);
  return {
    all: list,
    goals: top((m) => m.goals),
    assists: top((m) => m.assists),
    cleanSheets: top((m) => m.cleanSheets),
    played: top((m) => m.gamesPlayed),
    mvp: top((m) => m.ratingAve + m.motm * 0.01, 3),
  };
}

export async function memberStats(gamertag: string): Promise<MemberStat | null> {
  await ensureSchema();
  const list = parseMembers(await state("members"));
  return list.find((m) => m.name.toLowerCase() === gamertag.toLowerCase()) ?? null;
}

export async function recentRatings(gamertag: string, limit = 8) {
  await ensureSchema();
  const rows = (await db()`
    SELECT mp.match_id, mp.rating, mp.goals, mp.assists, m.result, m.played_at, m.opponent_name
    FROM ea_match_players mp JOIN ea_matches m USING (match_id)
    WHERE lower(mp.gamertag) = lower(${gamertag})
    ORDER BY m.played_at DESC LIMIT ${limit}`) as {
    match_id: string;
    rating: number | null;
    goals: number;
    assists: number;
    result: string;
    played_at: string;
    opponent_name: string | null;
  }[];
  return rows;
}

/** EA names seen in synced data that don't match any registered player. */
export async function unlinkedGamertags(): Promise<string[]> {
  await ensureSchema();
  const [members, index, seen] = await Promise.all([
    state("members"),
    rosterIndex(),
    db()`SELECT DISTINCT gamertag FROM ea_match_players` as unknown as Promise<{ gamertag: string }[]>,
  ]);
  const names = new Set<string>([...parseMembers(members).map((m) => m.name), ...seen.map((s) => s.gamertag)]);
  return [...names].filter((n) => !index.has(n.toLowerCase())).sort((a, b) => a.localeCompare(b));
}


/** Remembers skill rating / league points / division — one row per change, at most hourly otherwise. */
export async function recordClubHistory() {
  const o = await clubOverall();
  if (!o || (o.skillRating == null && o.points == null)) return;
  const [last] = (await db()`SELECT at, skill, points, division FROM club_history ORDER BY at DESC LIMIT 1`) as {
    at: string;
    skill: number | null;
    points: number | null;
    division: number | null;
  }[];
  const changed = !last || last.skill !== o.skillRating || last.points !== o.points || last.division !== o.currentDivision;
  const stale = !last || Date.now() - new Date(last.at).getTime() > 6 * 3600_000;
  if (changed || stale) await db()`INSERT INTO club_history (skill, points, division) VALUES (${o.skillRating}, ${o.points}, ${o.currentDivision}) ON CONFLICT DO NOTHING`;
}

export async function clubHistory(days = 30) {
  await ensureSchema();
  const since = new Date(Date.now() - days * 86400000).toISOString();
  return (await db()`SELECT at, skill, points, division FROM club_history WHERE at >= ${since} ORDER BY at`) as {
    at: string;
    skill: number | null;
    points: number | null;
    division: number | null;
  }[];
}

/** Last few league results (oldest → newest). */
export async function leagueForm(limit = 5) {
  await ensureSchema();
  const rows = (await db()`SELECT result FROM ea_matches WHERE match_type = 'leagueMatch' ORDER BY played_at DESC LIMIT ${limit}`) as { result: "W" | "D" | "L" }[];
  return rows.map((r) => r.result).reverse();
}
