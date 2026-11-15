import "server-only";
import { db, ensureSchema } from "./db";
import { avatarUrl } from "./players";

export const MIN_MATCHES = 3;
const WIB_MS = 7 * 60 * 60 * 1000;

/** Monday 00:00 WIB of the week containing `d`, as a UTC Date. */
export function weekStart(d = new Date()) {
  const wib = new Date(d.getTime() + WIB_MS);
  const day = (wib.getUTCDay() + 6) % 7; // Monday = 0
  const start = Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate() - day);
  return new Date(start - WIB_MS);
}

export function weekKey(start: Date) {
  return new Date(start.getTime() + WIB_MS).toISOString().slice(0, 10);
}

export function weekFromKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) - WIB_MS);
}

export function weekLabel(start: Date) {
  const s = new Date(start.getTime() + WIB_MS);
  const e = new Date(s.getTime() + 6 * 86400000);
  const f = (x: Date) => x.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  return `${f(s)} – ${f(e)}`;
}

export type WeeklyLine = {
  gamertag: string;
  matches: number;
  avgRating: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  tackles: number;
  saves: number;
  motm: number;
  role: "gk" | "def" | "mid" | "att";
  score: number;
  name: string;
  slug: string | null;
  avatar: string | null;
  playerId: string | null;
  number: number | null;
};

function roleOf(pos: string | null): WeeklyLine["role"] {
  const p = (pos ?? "").toLowerCase();
  if (p.includes("goal") || p === "gk") return "gk";
  if (p.includes("def") || ["cb", "lb", "rb", "lwb", "rwb"].includes(p)) return "def";
  if (p.includes("for") || p.includes("att") || ["st", "cf", "lw", "rw"].includes(p)) return "att";
  return "mid";
}

/**
 * POTW score (shown on the Stats page):
 *  rating × 10 + (goals + 0.75 × assists) per match × 4
 *  + clean sheets per match × (6 for GK/DEF, 2 otherwise) + tackles per match × 0.4
 *  + saves per match × 0.8 (GK) + 2 per MOTM
 */
export function potwScore(l: Omit<WeeklyLine, "score" | "name" | "slug" | "avatar" | "playerId" | "number">) {
  const per = (v: number) => v / Math.max(l.matches, 1);
  const defensive = l.role === "gk" || l.role === "def";
  return (
    l.avgRating * 10 +
    per(l.goals + 0.75 * l.assists) * 4 +
    per(l.cleanSheets) * (defensive ? 6 : 2) +
    per(l.tackles) * 0.4 +
    (l.role === "gk" ? per(l.saves) * 0.8 : 0) +
    l.motm * 2
  );
}

export function weeklyTable(start: Date): Promise<WeeklyLine[]> {
  return rangeTable(start, new Date(start.getTime() + 7 * 86400000));
}

/** Per-player aggregates for any window (a week, an EA season…), best POTW score first. */
export async function rangeTable(start: Date, end: Date): Promise<WeeklyLine[]> {
  await ensureSchema();
  const rows = (await db()`
    SELECT mp.gamertag,
           count(*)::int AS matches,
           coalesce(avg(mp.rating), 0)::float8 AS avg_rating,
           sum(mp.goals)::int AS goals, sum(mp.assists)::int AS assists,
           sum(CASE WHEN mp.clean_sheet THEN 1 ELSE 0 END)::int AS clean_sheets,
           sum(mp.tackles_made)::int AS tackles, sum(mp.saves)::int AS saves,
           sum(CASE WHEN mp.motm THEN 1 ELSE 0 END)::int AS motm,
           mode() WITHIN GROUP (ORDER BY mp.position) AS position,
           p.id AS player_id, p.slug, p.display_name, p.jersey_number, p.avatar_version, (p.avatar_b64 IS NOT NULL) AS has_avatar
    FROM ea_match_players mp
    JOIN ea_matches m USING (match_id)
    LEFT JOIN players p ON lower(p.ea_gamertag) = lower(mp.gamertag) AND p.active
    WHERE m.played_at >= ${start.toISOString()} AND m.played_at < ${end.toISOString()}
    GROUP BY mp.gamertag, p.id`) as {
    gamertag: string;
    matches: number;
    avg_rating: number;
    goals: number;
    assists: number;
    clean_sheets: number;
    tackles: number;
    saves: number;
    motm: number;
    position: string | null;
    player_id: string | null;
    slug: string | null;
    display_name: string | null;
    jersey_number: number | null;
    avatar_version: number | null;
    has_avatar: boolean | null;
  }[];

  return rows
    .map((r) => {
      const base = {
        gamertag: r.gamertag,
        matches: r.matches,
        avgRating: r.avg_rating,
        goals: r.goals,
        assists: r.assists,
        cleanSheets: r.clean_sheets,
        tackles: r.tackles,
        saves: r.saves,
        motm: r.motm,
        role: roleOf(r.position),
      };
      return {
        ...base,
        score: potwScore(base),
        name: r.display_name ?? r.gamertag,
        slug: r.slug,
        playerId: r.player_id,
        number: r.jersey_number,
        avatar: r.player_id
          ? avatarUrl({ id: r.player_id, avatar_version: r.avatar_version ?? 0, has_avatar: !!r.has_avatar })
          : null,
      };
    })
    .sort((a, b) => b.score - a.score);
}

export function pickHonors(table: WeeklyLine[]) {
  const qualified = table.filter((l) => l.matches >= MIN_MATCHES);
  const potw = qualified[0] ?? null;
  const wpotw =
    [...qualified]
      .filter((l) => l !== potw)
      .sort((a, b) => a.avgRating - b.avgRating || a.goals + a.assists - (b.goals + b.assists))[0] ?? null;
  return { potw, wpotw, qualified };
}

export async function honorsFor(start: Date) {
  const table = await weeklyTable(start);
  return { start, key: weekKey(start), label: weekLabel(start), table, ...pickHonors(table) };
}
