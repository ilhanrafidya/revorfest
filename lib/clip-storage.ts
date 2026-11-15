import "server-only";
import { del, put } from "@vercel/blob";
import { db, ensureSchema } from "./db";
import { windowState } from "./clips";
import { weekKey, weekStart } from "./honors";
import { seasonAt } from "./seasons";

/** Uploads a trimmed clip (+ poster) to Vercel Blob. Auth is automatic on Vercel (OIDC + BLOB_STORE_ID). */
export async function storeClip(weekKey: string, video: File, poster: File | null) {
  const id = crypto.randomUUID();
  const ext = video.type.includes("webm") ? "webm" : "mp4";
  const v = await put(`clips/${weekKey}/${id}.${ext}`, video, { access: "public", contentType: video.type || "video/mp4" });
  const p = poster ? await put(`clips/${weekKey}/${id}.jpg`, poster, { access: "public", contentType: "image/jpeg" }).catch(() => null) : null;
  return { url: v.url, poster: p?.url ?? "" };
}

export async function deleteStored(urls: string[]) {
  const list = urls.filter((u) => u?.startsWith("https://"));
  if (list.length) await del(list).catch(() => null);
}

/**
 * After a week's vote is over, uploaded clips that didn't win are deleted (file + row) so storage stays small.
 * Winners stay for the Hall of Fame / Wall of Shame.
 */
export async function cleanupLosingUploads() {
  await ensureSchema();
  const w = windowState();
  const rows = (await db()`
    SELECT c.id, c.week_key, c.category, c.url, c.embed_id, c.created_at,
           (SELECT count(*)::int FROM clip_votes v WHERE v.clip_id = c.id) AS votes
    FROM clips c WHERE c.week_key < ${w.key}`) as {
    id: string;
    week_key: string;
    category: string;
    url: string;
    embed_id: string;
    created_at: string;
    votes: number;
    provider?: string;
  }[];
  const uploads = (await db()`SELECT id FROM clips WHERE provider = 'upload' AND week_key < ${w.key}`) as { id: string }[];
  const uploadIds = new Set(uploads.map((u) => u.id));
  const best = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    if (r.week_key === w.votingKey || r.votes < 1) continue;
    const k = `${r.week_key}:${r.category}`;
    const cur = best.get(k);
    if (!cur || r.votes > cur.votes || (r.votes === cur.votes && new Date(r.created_at).getTime() < new Date(cur.created_at).getTime())) best.set(k, r);
  }
  const winners = new Set([...best.values()].map((r) => r.id));
  const losers = rows.filter((r) => uploadIds.has(r.id) && r.week_key !== w.votingKey && !winners.has(r.id));
  for (const l of losers) {
    await deleteStored([l.url, l.embed_id]);
    await db()`DELETE FROM clips WHERE id = ${l.id}`;
  }

  // Winners keep their video for one EA season. After that only the poster stays (trophies + names are untouched).
  const cutoff = weekKey(weekStart(seasonAt().start));
  const old = (await db()`SELECT id, url FROM clips WHERE provider = 'upload' AND url <> '' AND week_key < ${cutoff}`) as { id: string; url: string }[];
  for (const o of old) {
    await deleteStored([o.url]);
    await db()`UPDATE clips SET url = '' WHERE id = ${o.id}`;
  }
  return losers.length + old.length;
}
