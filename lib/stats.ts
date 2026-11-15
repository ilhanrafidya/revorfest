import "server-only";
import { db, ensureSchema } from "./db";
import { parseMembers, parseOverall, type ClubOverall, type MemberStat } from "./ea";
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
    SELECT match_id, match_type, played_at, goals_for, goals_against, result, opponent_id, opponent_name
    FROM ea_matches WHERE match_id = ${id}`) as MatchRow[];
  if (!m) return null;
  const [rows, index, h2h] = await Promise.all([
    sql`SELECT * FROM ea_match_players WHERE match_id = ${id} ORDER BY rating DESC NULLS LAST` as Promise<
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
      ? (sql`SELECT result, count(*)::int AS n FROM ea_matches WHERE opponent_id = ${m.opponent_id} GROUP BY result` as Promise<
          { result: string; n: number }[]
        >)
      : Promise.resolve([] as { result: string; n: number }[]),
  ]);
  const record = { W: 0, D: 0, L: 0 };
  for (const r of h2h) if (r.result in record) record[r.result as "W" | "D" | "L"] = r.n;
  return {
    match: { ...m, played_at: new Date(m.played_at).toISOString() },
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
    mvp: top((m) => m.ratingAve + m.motm * 0.01, 5),
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
    db()`SELECT DISTINCT gamertag FROM ea_match_players` as Promise<{ gamertag: string }[]>,
  ]);
  const names = new Set<string>([...parseMembers(members).map((m) => m.name), ...seen.map((s) => s.gamertag)]);
  return [...names].filter((n) => !index.has(n.toLowerCase())).sort((a, b) => a.localeCompare(b));
}
