import { notify } from "@/lib/push";
import { currentPlayer } from "@/lib/session";

/** Sends a test notification to the caller's own devices. */
export async function POST() {
  const me = await currentPlayer();
  if (!me) return Response.json({ error: "Log in first." }, { status: 401 });
  const r = await notify((pid) =>
    pid === me.id ? { title: "✅ Notifications are on", body: `Nice, ${me.display_name}. You'll hear about matchdays and awards here.`, url: "/me", tag: "test" } : null,
  );
  return Response.json(r);
}
