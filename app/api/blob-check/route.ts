// TEMP: verifies Blob auth (OIDC) works in production. Removed right after testing.
import { del, put } from "@vercel/blob";

export async function GET(req: Request) {
  if (new URL(req.url).searchParams.get("key") !== process.env.CRON_SECRET) return new Response("no", { status: 403 });
  try {
    const b = await put(`healthcheck/${Date.now()}.txt`, "ok", { access: "public", contentType: "text/plain" });
    await del(b.url);
    return Response.json({ ok: true, host: new URL(b.url).host, oidc: !!process.env.VERCEL_OIDC_TOKEN, store: !!process.env.BLOB_STORE_ID });
  } catch (e) {
    return Response.json({ ok: false, error: String((e as Error).message), oidc: !!process.env.VERCEL_OIDC_TOKEN, store: !!process.env.BLOB_STORE_ID }, { status: 500 });
  }
}
