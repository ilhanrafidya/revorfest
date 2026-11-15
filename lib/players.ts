import "server-only";
import { db, ensureSchema } from "./db";

export type PlayerCard = {
  id: string;
  slug: string;
  display_name: string;
  ea_gamertag: string;
  jersey_number: number;
  primary_position: string;
  secondary_positions: string[];
  role: "player" | "captain" | "admin";
  avatar_version: number;
  has_avatar: boolean;
  active: boolean;
  created_at: string;
};

const COLS = `id, slug, display_name, ea_gamertag, jersey_number, primary_position, secondary_positions, role,
  avatar_version, (avatar_b64 IS NOT NULL) AS has_avatar, active, created_at`;

export async function listPlayers(opts: { includeInactive?: boolean } = {}): Promise<PlayerCard[]> {
  await ensureSchema();
  const rows = await db().query(
    `SELECT ${COLS} FROM players ${opts.includeInactive ? "" : "WHERE active"} ORDER BY active DESC, jersey_number ASC`,
  );
  return rows as PlayerCard[];
}

export async function getPlayerBySlug(slug: string): Promise<PlayerCard | null> {
  await ensureSchema();
  const rows = await db().query(`SELECT ${COLS} FROM players WHERE slug = $1 AND active`, [slug]);
  return (rows[0] as PlayerCard) ?? null;
}

export async function getPlayerById(id: string): Promise<PlayerCard | null> {
  await ensureSchema();
  const rows = await db().query(`SELECT ${COLS} FROM players WHERE id = $1`, [id]);
  return (rows[0] as PlayerCard) ?? null;
}

export async function takenNumbers(): Promise<{ number: number; name: string; id: string }[]> {
  await ensureSchema();
  const rows = await db()`SELECT jersey_number AS number, display_name AS name, id FROM players WHERE active`;
  return rows as { number: number; name: string; id: string }[];
}

export function avatarUrl(p: { id: string; avatar_version: number; has_avatar: boolean }) {
  return p.has_avatar ? `/avatars/${p.id}?v=${p.avatar_version}` : null;
}

export function slugify(name: string) {
  const base = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return base || "player";
}

export async function uniqueSlug(name: string, excludeId?: string) {
  const base = slugify(name);
  const rows = (await db().query(`SELECT slug FROM players WHERE (slug = $1 OR slug LIKE $1 || '-%') AND id IS DISTINCT FROM $2`, [
    base,
    excludeId ?? null,
  ])) as { slug: string }[];
  const used = new Set(rows.map((r) => r.slug));
  if (!used.has(base)) return base;
  for (let i = 2; ; i++) if (!used.has(`${base}-${i}`)) return `${base}-${i}`;
}
