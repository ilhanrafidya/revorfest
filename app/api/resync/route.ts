import { resyncStatus, triggerResync } from "@/lib/resync";
import { currentPlayer } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await currentPlayer())) return Response.json({ error: "Log in first." }, { status: 401 });
  return Response.json(await resyncStatus(), { headers: { "cache-control": "no-store" } });
}

export async function POST() {
  const me = await currentPlayer();
  if (!me) return Response.json({ error: "Log in first." }, { status: 401 });
  const r = await triggerResync(me.id);
  if (!r.ok) return Response.json({ error: r.error, ...(await resyncStatus()) }, { status: r.status });
  return Response.json(await resyncStatus());
}
