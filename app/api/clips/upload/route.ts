import { revalidatePath } from "next/cache";
import { storeClip } from "@/lib/clip-storage";
import { windowState } from "@/lib/clips";
import { db, ensureSchema } from "@/lib/db";
import { currentPlayer } from "@/lib/session";

export const maxDuration = 30;

const MAX_BYTES = 4_300_000; // Vercel function request bodies cap at ~4.5 MB; trimmed 15s/720p clips land ~2–4 MB
const MAX_PER_WEEK = 3;

/** Receives a clip already trimmed + compressed on the phone, stores it in Blob and adds it to this week's Showdown. */
export async function POST(req: Request) {
  const me = await currentPlayer();
  if (!me) return Response.json({ error: "Log in to submit a clip." }, { status: 401 });
  const form = await req.formData().catch(() => null);
  if (!form) return Response.json({ error: "Upload failed — try again." }, { status: 400 });
  const video = form.get("video");
  const poster = form.get("poster");
  const category = String(form.get("category") ?? "");
  const caption = String(form.get("caption") ?? "").trim().slice(0, 120);
  const featuring = String(form.get("featuring") ?? "");
  if (!(video instanceof File) || !/^video\/(mp4|webm|quicktime)/.test(video.type || "video/mp4")) return Response.json({ error: "That's not a video." }, { status: 400 });
  if (video.size > MAX_BYTES) return Response.json({ error: "Clip is too big — pick a shorter part." }, { status: 413 });
  if (category !== "gotw" && category !== "notw") return Response.json({ error: "Pick a category." }, { status: 400 });

  await ensureSchema();
  const w = windowState();
  const sql = db();
  const [{ n }] = (await sql`SELECT count(*)::int AS n FROM clips WHERE week_key = ${w.key} AND category = ${category} AND submitted_by = ${me.id}`) as { n: number }[];
  if (n >= MAX_PER_WEEK) return Response.json({ error: `Max ${MAX_PER_WEEK} clips per category per week.` }, { status: 429 });

  let stored: { url: string; poster: string };
  try {
    stored = await storeClip(w.key, video, poster instanceof File && poster.size < 500_000 ? poster : null);
  } catch {
    return Response.json({ error: "Storage is unavailable right now — try a link instead." }, { status: 502 });
  }
  const feat = /^[0-9a-f-]{36}$/i.test(featuring) ? featuring : null;
  await sql`INSERT INTO clips (week_key, category, submitted_by, featuring, url, provider, embed_id, caption)
            VALUES (${w.key}, ${category}, ${me.id}, ${feat}, ${stored.url}, 'upload', ${stored.poster}, ${caption || null})`;
  revalidatePath("/showdown");
  revalidatePath("/");
  return Response.json({ ok: true });
}
