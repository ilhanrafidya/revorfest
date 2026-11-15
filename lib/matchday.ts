import "server-only";
import { db, ensureSchema } from "./db";
import { avatarUrl } from "./players";
import type { Kit } from "./kits";

export type AttendanceStatus = "ready" | "on_the_way" | "out";

export type MatchdayPlayer = {
  id: string;
  name: string;
  slug: string;
  number: number;
  positions: string[];
  avatar: string | null;
  status: AttendanceStatus | null;
};

export type Matchday = {
  id: string;
  scheduled_at: string;
  formation: string;
  kit: Kit;
  note: string | null;
  status: "open" | "done";
};

/** The current matchday: the next/ongoing open one (or the most recent open). */
export async function currentMatchday(): Promise<Matchday | null> {
  await ensureSchema();
  const rows = (await db()`
    SELECT id, scheduled_at, formation, kit, note, status FROM matchdays
    WHERE status = 'open'
    ORDER BY (scheduled_at < now() - interval '6 hours'), scheduled_at ASC
    LIMIT 1`) as Matchday[];
  const m = rows[0];
  return m ? { ...m, scheduled_at: new Date(m.scheduled_at).toISOString() } : null;
}

export async function matchdayById(id: string): Promise<Matchday | null> {
  await ensureSchema();
  const [m] = (await db()`SELECT id, scheduled_at, formation, kit, note, status FROM matchdays WHERE id = ${id}`) as Matchday[];
  return m ? { ...m, scheduled_at: new Date(m.scheduled_at).toISOString() } : null;
}

export async function matchdayRoster(matchdayId: string) {
  const sql = db();
  const [players, slots] = await Promise.all([
    sql`
      SELECT p.id, p.display_name, p.slug, p.jersey_number, p.primary_position, p.secondary_positions,
             p.avatar_version, (p.avatar_b64 IS NOT NULL) AS has_avatar, a.status
      FROM players p
      LEFT JOIN matchday_attendance a ON a.player_id = p.id AND a.matchday_id = ${matchdayId}
      WHERE p.active
      ORDER BY p.jersey_number` as unknown as Promise<
      {
        id: string;
        display_name: string;
        slug: string;
        jersey_number: number;
        primary_position: string;
        secondary_positions: string[];
        avatar_version: number;
        has_avatar: boolean;
        status: AttendanceStatus | null;
      }[]
    >,
    sql`SELECT slot, player_id FROM lineup_slots WHERE matchday_id = ${matchdayId}` as unknown as Promise<
      { slot: number; player_id: string }[]
    >,
  ]);
  const roster: MatchdayPlayer[] = players.map((p) => ({
    id: p.id,
    name: p.display_name,
    slug: p.slug,
    number: p.jersey_number,
    positions: [p.primary_position, ...p.secondary_positions],
    avatar: avatarUrl(p),
    status: p.status,
  }));
  const lineup: (string | null)[] = Array(11).fill(null);
  for (const s of slots) if (s.slot >= 0 && s.slot < 11) lineup[s.slot] = s.player_id;
  return { roster, lineup };
}

export function canManage(role: string | undefined) {
  return role === "admin" || role === "captain";
}
