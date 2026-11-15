import "server-only";
import { seasonWinners } from "./awards";
import { db, ensureSchema } from "./db";
import { pickHonors, rangeTable, weekKey, weekLabel, weekStart } from "./honors";
import { finishedSeasons } from "./seasons";
import { sendPush, type PushSub } from "./webpush";

export type PushMsg = { title: string; body: string; url: string; tag: string };

function vapid() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const raw = process.env.VAPID_PRIVATE_JWK;
  if (!publicKey || !raw) return null;
  return { publicKey, privateJwk: JSON.parse(raw) as JsonWebKey, subject: "https://revorfest.vercel.app" };
}

/** Sends a (possibly per-player) message to every subscribed device. Dead subscriptions are pruned. */
export async function notify(msgFor: (playerId: string) => PushMsg | null): Promise<{ sent: number; failed: number }> {
  const v = vapid();
  if (!v) return { sent: 0, failed: 0 };
  await ensureSchema();
  const subs = (await db()`SELECT endpoint, player_id, p256dh, auth FROM push_subs`) as (PushSub & { player_id: string })[];
  let sent = 0;
  let failed = 0;
  await Promise.all(
    subs.map(async (s) => {
      const msg = msgFor(s.player_id);
      if (!msg) return;
      try {
        const status = await sendPush(s, msg, v);
        if (status === 404 || status === 410) await db()`DELETE FROM push_subs WHERE endpoint = ${s.endpoint}`;
        if (status >= 200 && status < 300) sent++;
        else failed++;
      } catch {
        failed++;
      }
    }),
  );
  return { sent, failed };
}

function whenText(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
}

export async function notifyMatchday(creator: { id: string; display_name: string }, whenIso: string, note: string | null) {
  return notify((pid) =>
    pid === creator.id
      ? null
      : {
          title: note ? `⚽ ${note}` : "⚽ New matchday",
          body: `${creator.display_name} scheduled a matchday · ${whenText(whenIso)} WIB. Are you in?`,
          url: "/matchday",
          tag: "matchday",
        },
  );
}

/** Atomically moves a flag forward; returns true only for the caller that moved it (no double announcements). */
async function claim(kind: string, value: string): Promise<"claimed" | "seeded" | "done"> {
  const rows = (await db()`
    INSERT INTO ea_state (kind, data, fetched_at) VALUES (${kind}, ${JSON.stringify({ v: value, seeded: true })}::jsonb, now())
    ON CONFLICT (kind) DO NOTHING RETURNING kind`) as unknown[];
  if (rows.length) return "seeded"; // first ever run: remember where we are, don't announce the past
  const moved = (await db()`
    UPDATE ea_state SET data = ${JSON.stringify({ v: value })}::jsonb, fetched_at = now()
    WHERE kind = ${kind} AND data->>'v' IS DISTINCT FROM ${value} RETURNING kind`) as unknown[];
  return moved.length ? "claimed" : "done";
}

/** Called after every EA sync: announces last week's POTW / Player of the Weak and finished-season awards once. */
export async function announcePending() {
  if (!vapid()) return;
  await ensureSchema();
  const out: string[] = [];

  // Weekly honours — for the most recently completed Mon–Sun week.
  const last = new Date(weekStart().getTime() - 7 * 86400000);
  const key = weekKey(last);
  if ((await claim("announced_week", key)) === "claimed") {
    const { potw, wpotw } = pickHonors(await rangeTable(last, weekStart()));
    const label = weekLabel(last);
    if (potw) {
      const stats = `${potw.avgRating.toFixed(1)} avg · ${potw.goals} G · ${potw.assists} A`;
      await notify((pid) => ({
        title: "🏆 Player of the Week",
        body: pid === potw.playerId ? `You're Player of the Week, ${potw.name}! ${stats} (${label}). Go flex it 👀` : `${potw.name} is Player of the Week (${label}) · ${stats}`,
        url: "/stats",
        tag: `potw-${key}`,
      }));
      out.push("potw");
    }
    if (wpotw) {
      await notify((pid) => ({
        title: "😴 Player of the Weak",
        body:
          pid === wpotw.playerId
            ? `Stamina depleted, ${wpotw.name}… you're Player of the Weak (${label}) · ${wpotw.avgRating.toFixed(1)} avg`
            : `Stamina depleted… ${wpotw.name} is Player of the Weak (${label}) · ${wpotw.avgRating.toFixed(1)} avg`,
        url: "/stats",
        tag: `weak-${key}`,
      }));
      out.push("weak");
    }
  }

  // Season awards — once per finished EA season.
  const season = finishedSeasons()[0];
  if (season && (await claim("announced_season", String(season.n))) === "claimed") {
    const w = seasonWinners(await rangeTable(season.start, season.end));
    const awards = [
      w.pots && { who: w.pots, title: `👑 Player of ${season.name}`, other: `${w.pots.name} is Player of ${season.name} · ${w.pots.avgRating.toFixed(1)} avg`, me: `You're Player of ${season.name}, ${w.pots.name}! 👑` },
      w.boot && { who: w.boot, title: "⚽ Golden Boot", other: `${w.boot.name} wins the ${season.name} Golden Boot · ${w.boot.goals} goals`, me: `Golden Boot is yours, ${w.boot.name}! ${w.boot.goals} goals in ${season.name}` },
      w.assist && { who: w.assist, title: "🎯 Top Assist", other: `${w.assist.name} tops ${season.name} assists · ${w.assist.assists} assists`, me: `You top the ${season.name} assists, ${w.assist.name}! ${w.assist.assists} assists` },
    ].filter(Boolean) as { who: { playerId: string | null }; title: string; other: string; me: string }[];
    for (const [i, a] of awards.entries()) {
      await notify((pid) => ({ title: a.title, body: pid === a.who.playerId ? a.me : a.other, url: "/stats", tag: `season-${season.n}-${i}` }));
    }
    out.push(`season-${season.n}`);
  }
  return out;
}
