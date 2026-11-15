import { db, ensureSchema } from "@/lib/db";
import { currentPlayer } from "@/lib/session";

/** Save this device's push subscription for the logged-in player. */
export async function POST(req: Request) {
  const me = await currentPlayer();
  if (!me) return Response.json({ error: "Log in first." }, { status: 401 });
  const sub = (await req.json().catch(() => null)) as { endpoint?: string; keys?: { p256dh?: string; auth?: string } } | null;
  const endpoint = sub?.endpoint;
  const p256dh = sub?.keys?.p256dh;
  const auth = sub?.keys?.auth;
  if (!endpoint || !p256dh || !auth || !/^https:\/\//.test(endpoint) || endpoint.length > 1000) return Response.json({ error: "Bad subscription." }, { status: 400 });
  await ensureSchema();
  await db()`INSERT INTO push_subs (endpoint, player_id, p256dh, auth) VALUES (${endpoint}, ${me.id}, ${p256dh}, ${auth})
            ON CONFLICT (endpoint) DO UPDATE SET player_id = EXCLUDED.player_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`;
  return Response.json({ ok: true });
}

/** Turn notifications off for this device. */
export async function DELETE(req: Request) {
  const me = await currentPlayer();
  if (!me) return Response.json({ error: "Log in first." }, { status: 401 });
  const { endpoint } = ((await req.json().catch(() => ({}))) ?? {}) as { endpoint?: string };
  if (endpoint) await db()`DELETE FROM push_subs WHERE endpoint = ${endpoint} AND player_id = ${me.id}`;
  return Response.json({ ok: true });
}
