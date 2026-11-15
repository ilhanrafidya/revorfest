import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let client: NeonQueryFunction<false, false> | null = null;

/** Neon HTTP client (one per server instance). */
export function db() {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    client = neon(url);
  }
  return client;
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS players (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text UNIQUE NOT NULL,
    display_name text NOT NULL,
    ea_gamertag text NOT NULL,
    jersey_number smallint NOT NULL CHECK (jersey_number BETWEEN 1 AND 99),
    primary_position text NOT NULL,
    secondary_positions text[] NOT NULL DEFAULT '{}',
    avatar_b64 text,
    avatar_type text,
    avatar_version int NOT NULL DEFAULT 0,
    pin_hash text NOT NULL,
    role text NOT NULL DEFAULT 'player' CHECK (role IN ('player', 'captain', 'admin')),
    active boolean NOT NULL DEFAULT true,
    failed_pins int NOT NULL DEFAULT 0,
    locked_until timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS players_gamertag_uq ON players (lower(ea_gamertag))`,
  `CREATE UNIQUE INDEX IF NOT EXISTS players_jersey_active_uq ON players (jersey_number) WHERE active`,
  `CREATE TABLE IF NOT EXISTS club_settings (
    id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    invite_code_hash text,
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `INSERT INTO club_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING`,
];

let ready: Promise<void> | null = null;

/** Creates tables on first use (idempotent). */
export function ensureSchema() {
  if (!ready) {
    ready = (async () => {
      const sql = db();
      for (const stmt of SCHEMA) await sql.query(stmt);
    })().catch((err) => {
      ready = null;
      throw err;
    });
  }
  return ready;
}

/** Postgres unique-violation helper. */
export function uniqueViolation(err: unknown): string | null {
  const e = err as { code?: string; constraint?: string };
  return e?.code === "23505" ? (e.constraint ?? "unique") : null;
}
