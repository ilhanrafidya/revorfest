import "server-only";
import { db, ensureSchema } from "./db";

export const COOLDOWN_MS = 5 * 60_000; // one manual sync per 5 minutes, for everyone
export const EXPECTED_MS = 120_000; // GitHub Actions + EA usually finish within ~2 min
const GIVE_UP_MS = 8 * 60_000;
const REPO = "ilhanrafidya/revorfest";
const WORKFLOW = "ea-sync.yml";

export type ResyncStatus = {
  triggeredAt: string | null;
  lastSyncAt: string | null;
  running: boolean;
  cooldownUntil: string | null;
  configured: boolean;
};

export async function resyncStatus(): Promise<ResyncStatus> {
  await ensureSchema();
  const [[m], [s]] = (await Promise.all([
    db()`SELECT fetched_at FROM ea_state WHERE kind = 'manual_sync'`,
    db()`SELECT at FROM sync_runs ORDER BY id DESC LIMIT 1`,
  ])) as [{ fetched_at: string }[], { at: string }[]];
  const trig = m ? new Date(m.fetched_at) : null;
  const last = s ? new Date(s.at) : null;
  const now = Date.now();
  const running = !!trig && (!last || last < trig) && now - trig.getTime() < GIVE_UP_MS;
  const until = trig ? new Date(trig.getTime() + COOLDOWN_MS) : null;
  return {
    triggeredAt: trig?.toISOString() ?? null,
    lastSyncAt: last?.toISOString() ?? null,
    running,
    cooldownUntil: until && until.getTime() > now ? until.toISOString() : null,
    configured: !!process.env.GITHUB_SYNC_TOKEN,
  };
}

/** Starts the GitHub Actions EA sync now. Cooldown is claimed atomically in the DB. */
export async function triggerResync(playerId: string, opts: { force?: boolean } = {}): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const token = process.env.GITHUB_SYNC_TOKEN;
  if (!token) return { ok: false, error: "Sync button isn't set up yet.", status: 503 };
  await ensureSchema();
  const claimed = (await db()`
    INSERT INTO ea_state (kind, data, fetched_at) VALUES ('manual_sync', ${JSON.stringify({ by: playerId })}::jsonb, now())
    ON CONFLICT (kind) DO UPDATE SET data = EXCLUDED.data, fetched_at = now()
    WHERE ea_state.fetched_at < now() - interval '5 minutes'
    RETURNING kind`) as unknown[];
  if (!claimed.length) {
    if (!opts.force) return { ok: false, error: "Just synced — try again in a few minutes.", status: 429 };
    // Full time: still dispatch — GitHub queues it behind any running sync (concurrency group)
    await db()`UPDATE ea_state SET data = ${JSON.stringify({ by: playerId })}::jsonb, fetched_at = now() WHERE kind = 'manual_sync'`;
  }

  const res = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}/dispatches`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "user-agent": "revorfest-app",
    },
    body: JSON.stringify({ ref: "main" }),
  }).catch(() => null);

  if (!res || res.status !== 204) {
    if (opts.force) return { ok: false, error: "GitHub didn't accept the sync request.", status: 502 };
    // release the cooldown so someone can retry
    await db()`UPDATE ea_state SET fetched_at = now() - interval '1 hour' WHERE kind = 'manual_sync'`;
    return { ok: false, error: "GitHub didn't accept the sync request.", status: 502 };
  }
  return { ok: true };
}
