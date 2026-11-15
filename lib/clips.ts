import "server-only";
import { db, ensureSchema } from "./db";
import { weekKey, weekLabel, weekFromKey, weekStart } from "./honors";
import { avatarUrl } from "./players";

export type Category = "gotw" | "notw";

export type ClipView = {
  id: string;
  provider: string;
  embedId: string;
  url: string;
  caption: string | null;
  createdAt: string;
  submitter: { id: string; name: string; slug: string; avatar: string | null };
  featuring: { name: string; slug: string } | null;
  votes: number | null;
  myVote: boolean;
};

const WIB_MS = 7 * 3600 * 1000;

/**
 * Schedule: clips can be submitted all week (Mon 00:00 – Sun 23:59 WIB).
 * Voting for that week happens the following Monday (00:00 – 23:59 WIB); winners show from Tuesday.
 */
export function windowState(now = new Date()) {
  const start = weekStart(now);
  const prevStart = new Date(start.getTime() - 7 * 86400000);
  const isMonday = new Date(now.getTime() + WIB_MS).getUTCDay() === 1;
  return {
    key: weekKey(start),
    label: weekLabel(start),
    votingKey: isMonday ? weekKey(prevStart) : null,
    votingLabel: isMonday ? weekLabel(prevStart) : null,
  };
}

type Row = {
  id: string;
  provider: string;
  embed_id: string;
  url: string;
  caption: string | null;
  created_at: string;
  sub_id: string;
  sub_name: string;
  sub_slug: string;
  sub_av: number;
  sub_has: boolean;
  feat_name: string | null;
  feat_slug: string | null;
  votes: number;
  my_vote: boolean;
};

function view(r: Row, showVotes: boolean): ClipView {
  return {
    id: r.id,
    provider: r.provider,
    embedId: r.embed_id,
    url: r.url,
    caption: r.caption,
    createdAt: new Date(r.created_at).toISOString(),
    submitter: { id: r.sub_id, name: r.sub_name, slug: r.sub_slug, avatar: avatarUrl({ id: r.sub_id, avatar_version: r.sub_av, has_avatar: r.sub_has }) },
    featuring: r.feat_name && r.feat_slug ? { name: r.feat_name, slug: r.feat_slug } : null,
    votes: showVotes ? r.votes : null,
    myVote: r.my_vote,
  };
}

async function query(where: string, params: unknown[], meId: string | null) {
  await ensureSchema();
  return (await db().query(
    `SELECT c.id, c.provider, c.embed_id, c.url, c.caption, c.created_at, c.week_key, c.category,
            s.id AS sub_id, s.display_name AS sub_name, s.slug AS sub_slug, s.avatar_version AS sub_av, (s.avatar_b64 IS NOT NULL) AS sub_has,
            f.display_name AS feat_name, f.slug AS feat_slug,
            (SELECT count(*)::int FROM clip_votes v WHERE v.clip_id = c.id) AS votes,
            EXISTS (SELECT 1 FROM clip_votes v WHERE v.clip_id = c.id AND v.voter_id = $${params.length + 1}::uuid) AS my_vote
     FROM clips c
     JOIN players s ON s.id = c.submitted_by
     LEFT JOIN players f ON f.id = c.featuring
     WHERE ${where}
     ORDER BY c.created_at ASC`,
    [...params, meId ?? "00000000-0000-0000-0000-000000000000"],
  )) as (Row & { week_key: string; category: Category })[];
}

/** A week's clips. Vote counts stay hidden until voting for that week is over. */
export async function weekClips(key: string, category: Category, meId: string | null) {
  const rows = await query(`c.week_key = $1 AND c.category = $2`, [key, category], meId);
  return rows.map((r) => view(r, false));
}

export type Winner = ClipView & { weekKey: string; weekLabel: string };

/** Winners of finished weeks (most votes, earliest submission breaks ties). */
export async function winners(category: Category, limit = 52): Promise<Winner[]> {
  const w = windowState();
  const rows = (await query(`c.category = $1 AND c.week_key < $2`, [category, w.key], null)).filter(
    (r) => r.week_key !== w.votingKey, // still being voted on today
  );
  const best = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    if (r.votes < 1) continue;
    const cur = best.get(r.week_key);
    if (!cur || r.votes > cur.votes) best.set(r.week_key, r);
  }
  return [...best.values()]
    .sort((a, b) => b.week_key.localeCompare(a.week_key))
    .slice(0, limit)
    .map((r) => ({ ...view(r, true), weekKey: r.week_key, weekLabel: weekLabel(weekFromKey(r.week_key)) }));
}

export async function clipCounts(key: string) {
  await ensureSchema();
  const rows = (await db()`SELECT category, count(*)::int AS n FROM clips WHERE week_key = ${key} GROUP BY category`) as {
    category: Category;
    n: number;
  }[];
  return { gotw: rows.find((r) => r.category === "gotw")?.n ?? 0, notw: rows.find((r) => r.category === "notw")?.n ?? 0 };
}
