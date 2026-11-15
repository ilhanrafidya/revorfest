"use server";

import { revalidatePath } from "next/cache";
import { db, ensureSchema } from "@/lib/db";
import { currentPlayer } from "@/lib/session";
import { parseClipUrl } from "@/lib/clip-url";
import { windowState } from "@/lib/clips";

type Result = { ok: true } | { ok: false; error: string };

const MAX_PER_WEEK = 3;

export async function submitClip(category: string, url: string, caption: string, featuring: string): Promise<Result> {
  const me = await currentPlayer();
  if (!me) return { ok: false, error: "Log in to submit a clip." };
  if (category !== "gotw" && category !== "notw") return { ok: false, error: "Pick a category." };
  const w = windowState();
  if (!w.submissionsOpen) return { ok: false, error: "Submissions are closed on Sunday — voting day. Come back Monday." };
  const parsed = parseClipUrl(url);
  if (!parsed) {
    return {
      ok: false,
      error: "Paste a full YouTube, Streamable or TikTok link (for TikTok short links, open it first and copy the full URL).",
    };
  }
  await ensureSchema();
  const sql = db();
  const [{ n }] = (await sql`SELECT count(*)::int AS n FROM clips WHERE week_key = ${w.key} AND category = ${category} AND submitted_by = ${me.id}`) as { n: number }[];
  if (n >= MAX_PER_WEEK) return { ok: false, error: `Max ${MAX_PER_WEEK} clips per category per week.` };
  const feat = /^[0-9a-f-]{36}$/i.test(featuring) ? featuring : null;
  await sql`INSERT INTO clips (week_key, category, submitted_by, featuring, url, provider, embed_id, caption)
            VALUES (${w.key}, ${category}, ${me.id}, ${feat}, ${url.trim()}, ${parsed.provider}, ${parsed.id}, ${caption.trim().slice(0, 120) || null})`;
  revalidatePath("/showdown");
  revalidatePath("/");
  return { ok: true };
}

export async function voteClip(clipId: string): Promise<Result> {
  const me = await currentPlayer();
  if (!me) return { ok: false, error: "Log in to vote." };
  const sql = db();
  const [clip] = (await sql`SELECT id, week_key, category, submitted_by FROM clips WHERE id = ${clipId}`) as {
    id: string;
    week_key: string;
    category: string;
    submitted_by: string;
  }[];
  if (!clip) return { ok: false, error: "Clip not found." };
  if (clip.week_key !== windowState().key) return { ok: false, error: "Voting for that week is closed." };
  if (clip.submitted_by === me.id) return { ok: false, error: "You can't vote for your own clip." };
  await sql`INSERT INTO clip_votes (week_key, category, voter_id, clip_id) VALUES (${clip.week_key}, ${clip.category}, ${me.id}, ${clip.id})
            ON CONFLICT (week_key, category, voter_id) DO UPDATE SET clip_id = excluded.clip_id, created_at = now()`;
  revalidatePath("/showdown");
  return { ok: true };
}

export async function removeClip(clipId: string): Promise<Result> {
  const me = await currentPlayer();
  if (!me) return { ok: false, error: "Log in first." };
  const sql = db();
  if (me.role === "admin") await sql`DELETE FROM clips WHERE id = ${clipId}`;
  else await sql`DELETE FROM clips WHERE id = ${clipId} AND submitted_by = ${me.id}`;
  revalidatePath("/showdown");
  return { ok: true };
}
