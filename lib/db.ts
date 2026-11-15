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
  `CREATE TABLE IF NOT EXISTS matchdays (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    scheduled_at timestamptz NOT NULL,
    formation text NOT NULL DEFAULT '4-3-3',
    kit text NOT NULL DEFAULT 'home' CHECK (kit IN ('home', 'away', 'third')),
    note text,
    status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
    created_by uuid REFERENCES players (id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS matchday_attendance (
    matchday_id uuid NOT NULL REFERENCES matchdays (id) ON DELETE CASCADE,
    player_id uuid NOT NULL REFERENCES players (id) ON DELETE CASCADE,
    status text NOT NULL CHECK (status IN ('ready', 'on_the_way', 'out')),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (matchday_id, player_id)
  )`,
  `CREATE TABLE IF NOT EXISTS lineup_slots (
    matchday_id uuid NOT NULL REFERENCES matchdays (id) ON DELETE CASCADE,
    slot int NOT NULL CHECK (slot BETWEEN 0 AND 10),
    player_id uuid NOT NULL REFERENCES players (id) ON DELETE CASCADE,
    PRIMARY KEY (matchday_id, slot),
    UNIQUE (matchday_id, player_id)
  )`,
  `CREATE TABLE IF NOT EXISTS clips (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    week_key text NOT NULL,
    category text NOT NULL CHECK (category IN ('gotw', 'notw')),
    submitted_by uuid NOT NULL REFERENCES players (id) ON DELETE CASCADE,
    featuring uuid REFERENCES players (id) ON DELETE SET NULL,
    url text NOT NULL,
    provider text NOT NULL,
    embed_id text NOT NULL,
    caption text,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS clips_week_idx ON clips (week_key, category)`,
  `CREATE TABLE IF NOT EXISTS clip_votes (
    week_key text NOT NULL,
    category text NOT NULL,
    voter_id uuid NOT NULL REFERENCES players (id) ON DELETE CASCADE,
    clip_id uuid NOT NULL REFERENCES clips (id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (week_key, category, voter_id)
  )`,
  // v5 — FC 27 positions: CF→CAM, LWB→LB, RWB→RB; "4-3-3 (5)" no longer exists.
  `UPDATE players SET primary_position = CASE primary_position WHEN 'CF' THEN 'CAM' WHEN 'LWB' THEN 'LB' WHEN 'RWB' THEN 'RB' ELSE primary_position END
     WHERE primary_position IN ('CF','LWB','RWB')`,
  `UPDATE players SET secondary_positions = ARRAY(SELECT DISTINCT x FROM unnest(array_replace(array_replace(array_replace(secondary_positions,'CF','CAM'),'LWB','LB'),'RWB','RB')) x WHERE x <> primary_position)
     WHERE secondary_positions && ARRAY['CF','LWB','RWB']`,
  `UPDATE matchdays SET formation = '4-3-3 (2)' WHERE formation = '4-3-3 (5)'`,
  // v6 — Web Push subscriptions (one row per device)
  `CREATE TABLE IF NOT EXISTS push_subs (
    endpoint text PRIMARY KEY,
    player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    p256dh text NOT NULL,
    auth text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS push_subs_player ON push_subs (player_id)`,
  // v7 — when "Full time" was pressed (matchday recap window)
  `ALTER TABLE matchdays ADD COLUMN IF NOT EXISTS ended_at timestamptz`,
  // v8 — one-off fix: Namcuy signed up with the wrong EA gamertag
  `UPDATE players SET ea_gamertag = 'MikahNmkl777'
     WHERE lower(display_name) = 'namcuy' AND lower(ea_gamertag) <> 'mikahnmkl777'
       AND NOT EXISTS (SELECT 1 FROM players o WHERE lower(o.ea_gamertag) = 'mikahnmkl777')`,
];

/** Bump when SCHEMA changes so existing databases get the new tables. */
const SCHEMA_VERSION = 8;

let ready: Promise<void> | null = null;

/** Creates tables on first use. After that it costs a single query per server instance. */
export function ensureSchema() {
  if (!ready) {
    ready = (async () => {
      const sql = db();
      try {
        const rows = (await sql`SELECT version FROM schema_meta LIMIT 1`) as { version: number }[];
        if ((rows[0]?.version ?? 0) >= SCHEMA_VERSION) return;
      } catch {
        /* schema_meta missing — first run */
      }
      for (const stmt of SCHEMA) await sql.query(stmt);
      await sql.query(`CREATE TABLE IF NOT EXISTS schema_meta (version int NOT NULL)`);
      await sql.query(`DELETE FROM schema_meta`);
      await sql.query(`INSERT INTO schema_meta (version) VALUES (${SCHEMA_VERSION})`);
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
