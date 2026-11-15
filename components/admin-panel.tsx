"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { linkGamertag, resetPin, setActive, setInviteCode, setRole } from "@/app/actions/admin";
import type { SyncStatus } from "@/lib/stats";
import { PlayerAvatar } from "./player-avatar";
import { Button, ErrorText, Input } from "./ui";

export type AdminPlayer = {
  id: string;
  name: string;
  slug: string;
  number: number;
  gamertag: string;
  role: string;
  active: boolean;
  avatar: string | null;
};

export function AdminPanel({
  players,
  meId,
  unlinked,
  sync,
}: {
  players: AdminPlayer[];
  meId: string;
  unlinked: string[];
  sync: SyncStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [code, setCode] = useState("");
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  function run(fn: () => Promise<{ ok: true; message?: string } | { ok: false; error: string }>, success?: (m?: string) => string) {
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        setNotice(success ? { ok: true, text: success(res.message) } : null);
        router.refresh();
      } else setNotice({ ok: false, text: res.error });
    });
  }

  return (
    <div className="space-y-8">
      {notice &&
        (notice.ok ? (
          <p className="rounded-2xl bg-accent/10 px-4 py-3 text-sm text-accent">{notice.text}</p>
        ) : (
          <ErrorText>{notice.text}</ErrorText>
        ))}

      <div className="tile space-y-3 p-6">
        <p className="text-lg font-semibold">EA sync</p>
        {sync ? (
          <>
            <p className="text-sm">
              <span className={sync.ok ? "text-accent" : "text-depleted"}>{sync.ok ? "Last sync OK" : "Last sync failed"}</span>
              <span className="text-mute"> · {new Date(sync.at).toLocaleString("en-GB", { timeZone: "Asia/Jakarta" })} WIB · {sync.added} new matches</span>
            </p>
            {Object.entries(sync.errors).length > 0 && (
              <ul className="space-y-1 text-xs text-mute">
                {Object.entries(sync.errors).map(([k, v]) => (
                  <li key={k}>
                    <span className="text-depleted">{k}</span>: {v}
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className="text-sm text-mute">No sync has reached the app yet.</p>
        )}
        <p className="text-xs text-mute">
          Runs automatically every 15 min from 19:00–03:00 WIB (hourly otherwise). To sync right now: GitHub → ilhanrafidya/revorfest →
          Actions → EA sync → Run workflow.
        </p>
      </div>

      {unlinked.length > 0 && (
        <div className="tile space-y-4 p-6">
          <div>
            <p className="text-lg font-semibold">Unlinked EA names</p>
            <p className="text-sm text-mute">These EA IDs appear in synced stats but don&apos;t match any player. Link them so stats show up.</p>
          </div>
          <ul className="space-y-2">
            {unlinked.map((tag) => (
              <li key={tag} className="flex flex-wrap items-center gap-3">
                <span className="min-w-32 font-medium">{tag}</span>
                <select
                  defaultValue=""
                  disabled={pending}
                  onChange={(e) => {
                    const id = e.target.value;
                    if (id) run(() => linkGamertag(id, tag), () => `Linked ${tag}.`);
                  }}
                  className="hairline rounded-full bg-white/[0.06] px-3 py-2 text-sm"
                >
                  <option value="">Link to player…</option>
                  {players
                    .filter((p) => p.active)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        #{p.number} {p.name} ({p.gamertag})
                      </option>
                    ))}
                </select>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="tile space-y-4 p-6">
        <div>
          <p className="text-lg font-semibold">Club invite code</p>
          <p className="text-sm text-mute">New players need this to sign up. Changing it stops the old code from working.</p>
        </div>
        <div className="flex gap-3">
          <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="NEW CODE" className="font-semibold tracking-widest" />
          <Button onClick={() => run(() => setInviteCode(code), (m) => m ?? "Saved.")} disabled={pending || code.length < 4}>
            Save
          </Button>
        </div>
      </div>

      <div className="tile p-2 md:p-3">
        <p className="px-4 pb-2 pt-4 text-lg font-semibold">Players ({players.length})</p>
        <ul className="divide-y divide-white/[0.06]">
          {players.map((p) => (
            <li key={p.id} className={`flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center ${p.active ? "" : "opacity-50"}`}>
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <PlayerAvatar name={p.name} src={p.avatar} className="size-11 text-sm" />
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    <span className="tabular-nums text-accent">#{p.number}</span> {p.name}
                    {!p.active && <span className="ml-2 text-xs text-depleted">inactive</span>}
                  </p>
                  <p className="truncate text-xs text-mute">{p.gamertag}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={p.role}
                  disabled={pending || p.id === meId}
                  onChange={(e) => run(() => setRole(p.id, e.target.value), () => `${p.name} is now ${e.target.value}.`)}
                  className="hairline rounded-full bg-white/[0.06] px-3 py-2 text-sm"
                >
                  <option value="player">Player</option>
                  <option value="captain">Captain</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    run(() => resetPin(p.id), (pin) => `${p.name}'s new PIN is ${pin}. Send it to them — it won't be shown again.`)
                  }
                  className="hairline rounded-full bg-white/[0.06] px-3 py-2 text-sm"
                >
                  Reset PIN
                </button>
                {p.id !== meId && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => setActive(p.id, !p.active), () => `${p.name} ${p.active ? "deactivated" : "reactivated"}.`)}
                    className={`rounded-full px-3 py-2 text-sm ${p.active ? "bg-depleted/15 text-depleted" : "bg-accent/15 text-accent"}`}
                  >
                    {p.active ? "Deactivate" : "Reactivate"}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
