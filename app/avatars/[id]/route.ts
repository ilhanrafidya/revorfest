import { db, ensureSchema } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });
  await ensureSchema();
  const [row] = (await db()`SELECT avatar_b64, avatar_type FROM players WHERE id = ${id}`) as {
    avatar_b64: string | null;
    avatar_type: string | null;
  }[];
  if (!row?.avatar_b64) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(row.avatar_b64, "base64"), {
    headers: {
      "Content-Type": row.avatar_type ?? "image/webp",
      // URLs carry ?v=<version>, so a new upload busts the cache.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
