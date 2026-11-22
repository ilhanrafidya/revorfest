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
  ended_at?: string | null;
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
  const [m] = (await db()`SELECT id, scheduled_at, ended_at, formation, kit, note, status FROM matchdays WHERE id = ${id}`) as Matchday[];
  return m ? { ...m, scheduled_at: new Date(m.scheduled_at).toISOString(), ended_at: m.ended_at ? new Date(m.ended_at).toISOString() : null } : null;
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

/** Any logged-in member can run a matchday (schedule, lineup, attendance, full time). */
export function canManage(role: string | undefined) {
  return !!role;
}

/** Captains and admins can also delete anyone's matchday; everyone else only their own. */
export function canModerate(role: string | undefined) {
  return role === "admin" || role === "captain";
}

export type MatchdayAlert = { id: string; when: string; by: string; byId: string | null; avatar: string | null; note: string | null };

/** Latest open matchday + who scheduled it — drives the in-app "new matchday" notice. */
export async function latestMatchdayAlert(): Promise<MatchdayAlert | null> {
  try {
    await ensureSchema();
    const rows = (await db()`
      SELECT m.id, m.scheduled_at, m.note, p.id AS pid, p.display_name, p.avatar_version, (p.avatar_b64 IS NOT NULL) AS has_avatar
      FROM matchdays m LEFT JOIN players p ON p.id = m.created_by
      WHERE m.status = 'open' AND m.created_at > now() - interval '7 days'
      ORDER BY m.created_at DESC LIMIT 1`) as {
      id: string;
      scheduled_at: string;
      note: string | null;
      pid: string | null;
      display_name: string | null;
      avatar_version: number;
      has_avatar: boolean;
    }[];
    const r = rows[0];
    if (!r) return null;
    return {
      id: r.id,
      when: new Date(r.scheduled_at).toISOString(),
      by: r.display_name ?? "A captain",
      byId: r.pid,
      avatar: r.pid ? avatarUrl({ id: r.pid, avatar_version: r.avatar_version, has_avatar: r.has_avatar }) : null,
      note: r.note,
    };
  } catch {
    return null;
  }
}

export type PastMatchday = {
  id: string;
  created_by: string | null;
  scheduled_at: string;
  ended_at: string | null;
  formation: string;
  kit: Kit;
  note: string | null;
  by: string | null;
  ready: number;
  lineup: { slot: number; name: string; number: number }[];
};

/** Finished matchdays, newest first, with their saved lineup. */
export async function pastMatchdays(limit = 30): Promise<PastMatchday[]> {
  await ensureSchema();
  const sql = db();
  const rows = (await sql`
    SELECT m.id, m.scheduled_at, m.ended_at, m.formation, m.kit, m.note, m.created_by, c.display_name AS by,
           (SELECT count(*)::int FROM matchday_attendance a WHERE a.matchday_id = m.id AND a.status = 'ready') AS ready
    FROM matchdays m LEFT JOIN players c ON c.id = m.created_by
    WHERE m.status = 'done'
    ORDER BY m.scheduled_at DESC LIMIT ${limit}`) as Omit<PastMatchday, "lineup">[];
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const slots = (await sql`
    SELECT l.matchday_id, l.slot, p.display_name AS name, p.jersey_number AS number
    FROM lineup_slots l JOIN players p ON p.id = l.player_id
    WHERE l.matchday_id = ANY(${ids}::uuid[])
    ORDER BY l.slot`) as { matchday_id: string; slot: number; name: string; number: number }[];
  return rows.map((r) => ({
    ...r,
    scheduled_at: new Date(r.scheduled_at).toISOString(),
    ended_at: r.ended_at ? new Date(r.ended_at).toISOString() : null,
    lineup: slots.filter((s) => s.matchday_id === r.id).map(({ slot, name, number }) => ({ slot, name, number })),
  }));
}
