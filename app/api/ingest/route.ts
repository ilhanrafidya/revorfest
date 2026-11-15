import { revalidatePath } from "next/cache";
import { db, ensureSchema } from "@/lib/db";
import { parseMatches, type ParsedMatch, type ParsedMatchPlayer } from "@/lib/ea";
import { authorizeIngest } from "@/lib/ingest-auth";
import { announcePending } from "@/lib/push";

export const maxDuration = 30;

type Payload = {
  source?: string;
  fetched?: Record<string, unknown>;
  errors?: Record<string, string>;
};

const MATCH_TYPES = ["leagueMatch", "playoffMatch", "friendlyMatch"];

export async function POST(req: Request) {
  const who = await authorizeIngest(req);
  if (!who) return Response.json({ error: "unauthorized" }, { status: 401 });

  let body: Payload;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return Response.json({ error: "bad json" }, { status: 400 });
  }

  await ensureSchema();
  const sql = db();
  const fetched = body.fetched ?? {};
  const errors = body.errors ?? {};

  // Raw snapshots (overall, info, members, leaderboard) — latest wins.
  for (const kind of ["overall", "info", "members", "leaderboard"]) {
    if (fetched[kind] != null) {
      await sql`INSERT INTO ea_state (kind, data, fetched_at) VALUES (${kind}, ${JSON.stringify(fetched[kind])}::jsonb, now())
                ON CONFLICT (kind) DO UPDATE SET data = excluded.data, fetched_at = excluded.fetched_at`;
    }
  }

  // Matches — EA only returns the most recent few, so every sync archives what it sees.
  const matches: ParsedMatch[] = [];
  const players: ParsedMatchPlayer[] = [];
  for (const type of MATCH_TYPES) {
    const parsed = parseMatches(fetched[type], type);
    matches.push(...parsed.matches);
    players.push(...parsed.players);
  }

  let added = 0;
  if (matches.length) {
    const inserted = (await sql.query(
      `INSERT INTO ea_matches (match_id, match_type, played_at, goals_for, goals_against, result, opponent_id, opponent_name, raw)
       SELECT match_id, match_type, played_at, goals_for, goals_against, result, opponent_id, opponent_name, raw
       FROM jsonb_to_recordset($1::jsonb) AS x(match_id text, match_type text, played_at timestamptz, goals_for int,
            goals_against int, result text, opponent_id text, opponent_name text, raw jsonb)
       ON CONFLICT (match_id) DO NOTHING
       RETURNING match_id`,
      [JSON.stringify(matches)],
    )) as { match_id: string }[];
    added = inserted.length;
  }
  if (players.length) {
    await sql.query(
      `INSERT INTO ea_match_players (match_id, gamertag, position, rating, goals, assists, shots, passes_made, pass_attempts,
              tackles_made, tackle_attempts, saves, clean_sheet, motm, red_cards)
       SELECT * FROM jsonb_to_recordset($1::jsonb) AS x(match_id text, gamertag text, position text, rating real, goals int,
            assists int, shots int, passes_made int, pass_attempts int, tackles_made int, tackle_attempts int, saves int,
            clean_sheet boolean, motm boolean, red_cards int)
       ON CONFLICT (match_id, gamertag) DO NOTHING`,
      [JSON.stringify(players)],
    );
  }

  const ok = Object.keys(fetched).length > 0;
  await sql`INSERT INTO sync_runs (source, ok, matches_added, details)
            VALUES (${body.source ?? who}, ${ok}, ${added},
                    ${JSON.stringify({ fetched: Object.keys(fetched), errors, seen: matches.length })}::jsonb)`;
  await sql`DELETE FROM sync_runs WHERE id NOT IN (SELECT id FROM sync_runs ORDER BY id DESC LIMIT 200)`;

  if (ok) revalidatePath("/", "layout");
  // weekly POTW / Player of the Weak + season awards → push, once each
  const announced = ok ? await announcePending().catch(() => []) : [];
  return Response.json({ ok, added, seen: matches.length, errors, announced });
}
