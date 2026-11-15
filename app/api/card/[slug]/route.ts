import { cardFor } from "@/lib/card";
import { getPlayerBySlug } from "@/lib/players";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const p = await getPlayerBySlug((await params).slug);
  if (!p) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json(await cardFor(p), { headers: { "cache-control": "private, max-age=30" } });
}
