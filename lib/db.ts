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
  `CREATE TABLE IF NOT EXISTS ea_matches (
    match_id text PRIMARY KEY,
    match_type text NOT NULL,
    played_at timestamptz NOT NULL,
    goals_for int NOT NULL,
    goals_against int NOT NULL,
    result text NOT NULL,
    opponent_id text,
    opponent_name text,
    raw jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS ea_matches_played_idx ON ea_matches (played_at DESC)`,
  `CREATE TABLE IF NOT EXISTS ea_match_players (
    match_id text NOT NULL REFERENCES ea_matches (match_id) ON DELETE CASCADE,
    gamertag text NOT NULL,
    position text,
    rating real,
    goals int NOT NULL DEFAULT 0,
    assists int NOT NULL DEFAULT 0,
    shots int NOT NULL DEFAULT 0,
    passes_made int NOT NULL DEFAULT 0,
    pass_attempts int NOT NULL DEFAULT 0,
    tackles_made int NOT NULL DEFAULT 0,
    tackle_attempts int NOT NULL DEFAULT 0,
    saves int NOT NULL DEFAULT 0,
    clean_sheet boolean NOT NULL DEFAULT false,
    motm boolean NOT NULL DEFAULT false,
    red_cards int NOT NULL DEFAULT 0,
    PRIMARY KEY (match_id, gamertag)
  )`,
  `CREATE INDEX IF NOT EXISTS ea_match_players_tag_idx ON ea_match_players (lower(gamertag))`,
  `CREATE TABLE IF NOT EXISTS ea_state (
    kind text PRIMARY KEY,
    data jsonb NOT NULL,
    fetched_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS sync_runs (
    id bigserial PRIMARY KEY,
    at timestamptz NOT NULL DEFAULT now(),
    source text,
    ok boolean NOT NULL,
    matches_added int NOT NULL DEFAULT 0,
    details jsonb
  )`,
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
