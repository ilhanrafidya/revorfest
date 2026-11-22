import "server-only";
import { db, ensureSchema } from "./db";
import { potwScore } from "./honors";
import { avatarUrl } from "./players";

export const EARLY_MS = 60 * 60_000; // count matches up to 1h before the scheduled kick-off
export const MAX_SESSION_MS = 6 * 3600_000; // forgot "Full time"? the session closes 6h after kick-off
const PRIOR = 2; // "phantom" team-average matches each player gets, so 1 lucky match can't top a 7-match night

export type RecapLine = {
  gamertag: string;
  name: string;
  slug: string | null;
  playerId: string | null;
  number: number | null;
  avatar: string | null;
  matches: number;
  goals: number;
  assists: number;
  motm: number;
  avgRating: number;
  passMade: number;
  passAtt: number;
  passPct: number | null;
  score: number;
};

export type RecapMatch = { id: string; playedAt: string; gf: number; ga: number; result: "W" | "D" | "L"; opponent: string };

export type Recap = {
  window: { start: string; end: string; closed: boolean };
  matches: RecapMatch[];
  record: { W: number; D: number; L: number; gf: number; ga: number };
  lines: RecapLine[];
  awards: {
    mvp: RecapLine | null;
    rating: RecapLine | null;
    passing: RecapLine | null;
    scorer: RecapLine | null;
    assister: RecapLine | null;
    motm: RecapLine | null;
  };
};

export function recapWindow(md: { scheduled_at: string; ended_at?: string | null }) {
  const kick = new Date(md.scheduled_at).getTime();
  const start = new Date(kick - EARLY_MS);
  const cap = new Date(kick + MAX_SESSION_MS);
  const ended = md.ended_at ? new Date(md.ended_at) : null;
  const end = ended && ended < cap ? ended : new Date(Math.min(cap.getTime(), Date.now()));
  return { start, end, closed: !!ended || Date.now() >= cap.getTime() };
}

/** Everything played during one matchday session, with fair (shrunk) awards. */
export async function matchdayRecap(md: { scheduled_at: string; ended_at?: string | null }): Promise<Recap> {
  const { start, end, closed } = recapWindow(md);
  return rangeRecap(start, end, closed);
}

/** Same recap for any time range (inclusive end), e.g. a whole week. */
export async function rangeRecap(start: Date, end: Date, closed = true): Promise<Recap> {
  await ensureSchema();
  const sql = db();
  const [matches, rows] = (await Promise.all([
    sql`SELECT match_id, played_at, goals_for, goals_against, result, opponent_name FROM ea_matches
        WHERE played_at >= ${start.toISOString()} AND played_at <= ${end.toISOString()} ORDER BY played_at`,
    sql`SELECT mp.gamertag, count(*)::int AS matches, coalesce(avg(mp.rating), 0)::float8 AS avg_rating,
               sum(mp.goals)::int AS goals, sum(mp.assists)::int AS assists,
               sum(CASE WHEN mp.motm THEN 1 ELSE 0 END)::int AS motm,
               sum(CASE WHEN mp.clean_sheet THEN 1 ELSE 0 END)::int AS clean_sheets,
               sum(mp.tackles_made)::int AS tackles, sum(mp.saves)::int AS saves,
               sum(mp.passes_made)::int AS pass_made, sum(mp.pass_attempts)::int AS pass_att,
               mode() WITHIN GROUP (ORDER BY mp.position) AS position,
               p.id AS player_id, p.slug, p.display_name, p.jersey_number, p.avatar_version, (p.avatar_b64 IS NOT NULL) AS has_avatar
        FROM ea_match_players mp JOIN ea_matches m USING (match_id)
        LEFT JOIN players p ON lower(p.ea_gamertag) = lower(mp.gamertag) AND p.active
        WHERE m.played_at >= ${start.toISOString()} AND m.played_at <= ${end.toISOString()}
        GROUP BY mp.gamertag, p.id`,
  ])) as [
    { match_id: string; played_at: string; goals_for: number; goals_against: number; result: "W" | "D" | "L"; opponent_name: string | null }[],
    {
      gamertag: string;
      matches: number;
      avg_rating: number;
      goals: number;
      assists: number;
      motm: number;
      clean_sheets: number;
      tackles: number;
      saves: number;
      pass_made: number;
      pass_att: number;
      position: string | null;
      player_id: string | null;
      slug: string | null;
      display_name: string | null;
      jersey_number: number | null;
      avatar_version: number | null;
      has_avatar: boolean | null;
    }[],
  ];

  const role = (pos: string | null) => {
    const p = (pos ?? "").toLowerCase();
    if (p.includes("goal")) return "gk" as const;
    if (p.includes("def")) return "def" as const;
    if (p.includes("for") || p.includes("att")) return "att" as const;
    return "mid" as const;
  };

  const lines: RecapLine[] = rows.map((r) => ({
    gamertag: r.gamertag,
    name: r.display_name ?? r.gamertag,
    slug: r.slug,
    playerId: r.player_id,
    number: r.jersey_number,
    avatar: r.player_id ? avatarUrl({ id: r.player_id, avatar_version: r.avatar_version ?? 0, has_avatar: !!r.has_avatar }) : null,
    matches: r.matches,
    goals: r.goals,
    assists: r.assists,
    motm: r.motm,
    avgRating: r.avg_rating,
    passMade: r.pass_made,
    passAtt: r.pass_att,
    passPct: r.pass_att > 0 ? (r.pass_made / r.pass_att) * 100 : null,
    score: potwScore({
      gamertag: r.gamertag,
      matches: r.matches,
      avgRating: r.avg_rating,
      goals: r.goals,
      assists: r.assists,
      cleanSheets: r.clean_sheets,
      tackles: r.tackles,
      saves: r.saves,
      motm: r.motm,
      role: role(r.position),
    }),
  }));

  // ---- fair ranking without a minimum: pull small samples toward the team average ----
  const totalApps = lines.reduce((a, l) => a + l.matches, 0) || 1;
  const teamRating = lines.reduce((a, l) => a + l.avgRating * l.matches, 0) / totalApps;
  const teamScore = lines.reduce((a, l) => a + l.score * l.matches, 0) / totalApps;
  const passMadeAll = lines.reduce((a, l) => a + l.passMade, 0);
  const passAttAll = lines.reduce((a, l) => a + l.passAtt, 0);
  const teamPass = passAttAll ? passMadeAll / passAttAll : 0;
  const shrink = (value: number, n: number, team: number) => (n * value + PRIOR * team) / (n + PRIOR);
  const best = (key: (l: RecapLine) => number | null) =>
    lines.reduce<RecapLine | null>((top, l) => {
      const v = key(l);
      if (v == null) return top;
      const t = top ? key(top) : null;
      return t == null || v > t ? l : top;
    }, null);
  const mostBy = (k: "goals" | "assists" | "motm") =>
    [...lines].filter((l) => l[k] > 0).sort((a, b) => b[k] - a[k] || a.matches - b.matches || b.avgRating - a.avgRating)[0] ?? null;

  const record = { W: 0, D: 0, L: 0, gf: 0, ga: 0 };
  for (const m of matches) {
    record[m.result]++;
    record.gf += m.goals_for;
    record.ga += m.goals_against;
  }

  return {
    window: { start: start.toISOString(), end: end.toISOString(), closed },
    matches: matches.map((m) => ({
      id: m.match_id,
      playedAt: new Date(m.played_at).toISOString(),
      gf: m.goals_for,
      ga: m.goals_against,
      result: m.result,
      opponent: m.opponent_name ?? "Unknown",
    })),
    record,
    lines: [...lines].sort((a, b) => shrink(b.score, b.matches, teamScore) - shrink(a.score, a.matches, teamScore)),
    awards: {
      mvp: best((l) => shrink(l.score, l.matches, teamScore)),
      rating: best((l) => shrink(l.avgRating, l.matches, teamRating)),
      passing: best((l) => (l.passAtt >= 1 ? shrink(l.passMade / l.passAtt, l.matches, teamPass) : null)),
      scorer: mostBy("goals"),
      assister: mostBy("assists"),
      motm: mostBy("motm"),
    },
  };
}
