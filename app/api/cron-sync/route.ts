import { timingSafeEqual } from "node:crypto";
import { triggerResync } from "@/lib/resync";

export const dynamic = "force-dynamic";

/** Hit every 15 min by cron-job.org → starts the GitHub Actions EA sync on time (GitHub's own schedule runs late). */
export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key") ?? "";
  const secret = process.env.CRON_SECRET ?? "";
  const ok = secret.length > 0 && key.length === secret.length && timingSafeEqual(Buffer.from(key), Buffer.from(secret));
  if (!ok) return Response.json({ error: "Forbidden" }, { status: 403 });
  const r = await triggerResync("cron");
  // a manual sync in the last 5 min counts as done
  if (!r.ok && r.status === 429) return Response.json({ ok: true, skipped: "recent sync" });
  return Response.json(r, { status: r.ok ? 200 : r.status });
}
