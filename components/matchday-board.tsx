"use client";

import { AnimatePresence, m } from "motion/react";
import { useMemo, useOptimistic, useState, useTransition } from "react";
import {
  assignSlot,
  clearLineup,
  closeMatchday,
  createMatchday,
  setAttendance,
  setFormation,
  setKit,
} from "@/app/actions/matchday";
import { FORMATIONS, fitsSlot, formationSlots } from "@/lib/formations";
import { KITS, KIT_ORDER, type Kit } from "@/lib/kits";
import { EASE, SPRING_SNAPPY } from "@/lib/motion";
import { PlayerAvatar } from "./player-avatar";
import { ShareButton } from "./share-button";
import { Button, ErrorText, Input } from "./ui";

type Status = "ready" | "on_the_way" | "out";
type P = { id: string; name: string; slug: string; number: number; positions: string[]; avatar: string | null; status: Status | null };
type MD = { id: string; scheduled_at: string; formation: string; kit: Kit; note: string | null };

const STATUS: { key: Status; label: string; dot: string; active: string }[] = [
  { key: "ready", label: "Ready", dot: "bg-accent", active: "bg-accent text-on-accent" },
  { key: "on_the_way", label: "On the way", dot: "bg-gold", active: "bg-gold text-black" },
  { key: "out", label: "Out", dot: "bg-depleted", active: "bg-depleted text-white" },
];

function whenLabel(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
}

export function MatchdayBoard({
  matchday,
  roster,
  lineup: serverLineup,
  meId,
  manage,
}: {
  matchday: MD;
  roster: P[];
  lineup: (string | null)[];
  meId: string | null;
  manage: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState<number | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const [state, apply] = useOptimistic(
    { lineup: serverLineup, formation: matchday.formation, kit: matchday.kit, roster },
    (cur, action: { type: "slot"; slot: number; id: string | null } | { type: "formation"; v: string } | { type: "kit"; v: Kit } | { type: "status"; id: string; v: Status } | { type: "clear" }) => {
      switch (action.type) {
        case "slot": {
          const lineup = cur.lineup.map((x) => (x === action.id ? null : x));
          lineup[action.slot] = action.id;
          return { ...cur, lineup };
        }
        case "formation":
          return { ...cur, formation: action.v };
        case "kit":
          return { ...cur, kit: action.v };
        case "status":
          return {
            ...cur,
            roster: cur.roster.map((p) => (p.id === action.id ? { ...p, status: action.v } : p)),
            lineup: action.v === "out" ? cur.lineup.map((x) => (x === action.id ? null : x)) : cur.lineup,
          };
        case "clear":
          return { ...cur, lineup: Array(11).fill(null) };
      }
    },
  );

  const byId = useMemo(() => new Map(state.roster.map((p) => [p.id, p])), [state.roster]);
  const slots = formationSlots(state.formation);
  const me = meId ? byId.get(meId) : undefined;
  const inLineup = new Set(state.lineup.filter(Boolean) as string[]);

  function run(action: Parameters<typeof apply>[0], fn: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null);
    startTransition(async () => {
      apply(action);
      const res = await fn();
      if (!res.ok) setError(res.error);
    });
  }

  const put = (slot: number, id: string | null) => run({ type: "slot", slot, id }, () => assignSlot(matchday.id, slot, id));

  const groups = STATUS.map((s) => ({ ...s, players: state.roster.filter((p) => p.status === s.key) }));
  const noReply = state.roster.filter((p) => !p.status);
  const bench = [...state.roster]
    .filter((p) => p.status !== "out" && !inLineup.has(p.id))
    .sort((a, b) => (a.status === "ready" ? 0 : a.status === "on_the_way" ? 1 : 2) - (b.status === "ready" ? 0 : b.status === "on_the_way" ? 1 : 2));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="tile p-6 md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="eyebrow">Next matchday</p>
            <p className="text-display mt-2 text-4xl md:text-5xl">{whenLabel(matchday.scheduled_at)}</p>
            {matchday.note && <p className="mt-2 text-mute">{matchday.note}</p>}
            <p className="mt-3 text-sm text-mute">
              <span className="font-semibold text-accent">{groups[0].players.length} ready</span> · {groups[1].players.length} on the way ·{" "}
              {groups[2].players.length} out · {noReply.length} no reply
            </p>
          </div>
          <img src={`/kits/${state.kit}.png`} alt={`${KITS[state.kit].label} kit`} className="size-24 self-start object-contain drop-shadow-[0_15px_25px_rgba(0,0,0,0.6)] md:size-28" />
        </div>

        {me && (
          <div className="mt-6">
            <p className="mb-2 text-sm font-medium">Are you in?</p>
            <div className="grid grid-cols-3 gap-2">
              {STATUS.map((s) => {
                const active = me.status === s.key;
                return (
                  <button
                    key={s.key}
                    type="button"
                    disabled={pending}
                    onClick={() => run({ type: "status", id: me.id, v: s.key }, () => setAttendance(matchday.id, s.key))}
                    className={`rounded-2xl px-3 py-3.5 text-sm font-semibold transition active:scale-95 ${
                      active ? s.active : "bg-white/[0.06] text-chalk hover:bg-white/10"
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {!meId && <p className="mt-6 text-sm text-mute">Log in to set your status.</p>}
      </div>

      <ErrorText>{error}</ErrorText>

      {/* Tactical board */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="tile p-4 md:p-6">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {manage ? (
              <select
                value={state.formation}
                disabled={pending}
                onChange={(e) => run({ type: "formation", v: e.target.value }, () => setFormation(matchday.id, e.target.value))}
                className="hairline rounded-full bg-white/[0.06] px-4 py-2 text-sm font-semibold"
              >
                {FORMATIONS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            ) : (
              <span className="rounded-full bg-white/[0.06] px-4 py-2 text-sm font-semibold">{state.formation}</span>
            )}
            {manage && (
              <div className="glass hairline inline-flex rounded-full p-1">
                {KIT_ORDER.map((k) => (
                  <button
                    key={k}
                    type="button"
                    disabled={pending}
                    onClick={() => run({ type: "kit", v: k }, () => setKit(matchday.id, k))}
                    className={`relative rounded-full px-3 py-1.5 text-xs font-semibold ${state.kit === k ? "text-chalk" : "text-mute"}`}
                  >
                    {state.kit === k && <m.span layoutId="md-kit" transition={SPRING_SNAPPY} className="absolute inset-0 rounded-full bg-white/12" />}
                    <span className="relative">{KITS[k].label}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="ml-auto flex gap-2">
              {manage && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run({ type: "clear" }, () => clearLineup(matchday.id))}
                  className="rounded-full bg-white/[0.06] px-3 py-2 text-xs font-semibold text-mute hover:text-chalk"
                >
                  Clear
                </button>
              )}
              <ShareButton
                url={`/share/lineup?id=${matchday.id}`}
                filename="revorfest-lineup.png"
                title="Revorfest lineup"
                className="bg-accent/15 text-accent"
              />
            </div>
          </div>

          {/* Pitch */}
          <div
            className="relative mx-auto aspect-[3/4] w-full max-w-[520px] overflow-hidden rounded-3xl"
            style={{
              background:
                "repeating-linear-gradient(0deg, #0b3d22 0 9%, #0e4627 9% 18%), radial-gradient(80% 60% at 50% 50%, rgba(255,255,255,0.05), transparent)",
            }}
          >
            <PitchLines />
            {slots.map((s, i) => {
              const pid = state.lineup[i];
              const p = pid ? byId.get(pid) : undefined;
              const warn = p && !fitsSlot(s.label, p.positions);
              return (
                <div
                  key={`${state.formation}-${i}`}
                  className="absolute -translate-x-1/2 translate-y-1/2"
                  style={{ left: `${s.x}%`, bottom: `${s.y}%` }}
                  onDragOver={(e) => manage && e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData("text/plain") || dragId;
                    if (manage && id) put(i, id);
                    setDragId(null);
                  }}
                >
                  <button
                    type="button"
                    disabled={!manage}
                    draggable={manage && !!p}
                    onDragStart={(e) => {
                      if (!p) return;
                      e.dataTransfer.setData("text/plain", p.id);
                      setDragId(p.id);
                    }}
                    onClick={() => manage && setPicking(i)}
                    className="flex w-16 flex-col items-center md:w-20"
                  >
                    {p ? (
                      <span className="relative block">
                        <img src={`/kits/${state.kit}.png`} alt="" className="size-11 object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.5)] md:size-14" draggable={false} />
                        <span
                          className={`absolute inset-0 grid place-items-center pt-1 text-sm font-bold md:text-base ${
                            state.kit === "home" ? "text-black" : state.kit === "away" ? "text-volt" : "text-white"
                          }`}
                          style={{ textShadow: state.kit === "home" ? "0 0 3px #fff" : "0 1px 2px #000" }}
                        >
                          {p.number}
                        </span>
                        {warn && (
                          <span title="Out of position" className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-gold text-[10px] font-black text-black">
                            !
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="grid size-11 place-items-center rounded-full border-2 border-dashed border-white/35 bg-black/25 text-[10px] font-bold text-white/80 md:size-14">
                        {s.label}
                      </span>
                    )}
                    <span className="mt-1 max-w-full truncate rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white md:text-xs">
                      {p ? p.name : s.label}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
          {manage && <p className="mt-3 text-center text-xs text-mute">Tap a spot to pick a player — or drag from the bench on desktop. ! = out of position.</p>}
        </div>

        {/* Bench + attendance */}
        <div className="space-y-4">
          {manage && (
            <div className="tile p-4">
              <p className="eyebrow mb-3">Bench</p>
              {bench.length === 0 ? (
                <p className="text-sm text-mute">Everyone available is on the pitch.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {bench.map((p) => (
                    <span
                      key={p.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", p.id);
                        setDragId(p.id);
                      }}
                      className="flex cursor-grab items-center gap-2 rounded-full bg-white/[0.06] py-1 pl-1 pr-3 text-xs font-medium active:cursor-grabbing"
                    >
                      <PlayerAvatar name={p.name} src={p.avatar} className="size-6 text-[9px]" />#{p.number} {p.name}
                      <span className={`size-1.5 rounded-full ${p.status === "ready" ? "bg-accent" : p.status === "on_the_way" ? "bg-gold" : "bg-white/30"}`} />
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
          {[...groups, { key: "none", label: "No reply", dot: "bg-white/30", active: "", players: noReply }].map((g) => (
            <div key={g.key} className="tile p-4">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <span className={`size-2 rounded-full ${g.dot}`} />
                {g.label} <span className="text-mute">{g.players.length}</span>
              </p>
              {g.players.length === 0 ? (
                <p className="text-xs text-mute">—</p>
              ) : (
                <ul className="space-y-2">
                  {g.players.map((p) => (
                    <li key={p.id} className="flex items-center gap-2 text-sm">
                      <PlayerAvatar name={p.name} src={p.avatar} className="size-7 text-[10px]" />
                      <span className="tabular-nums text-mute">#{p.number}</span>
                      <span className="truncate">{p.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          {manage && (
            <button
              type="button"
              onClick={() => run({ type: "clear" }, () => closeMatchday(matchday.id))}
              className="w-full rounded-full bg-white/[0.04] px-4 py-3 text-xs font-semibold text-mute hover:text-chalk"
            >
              Mark matchday as finished
            </button>
          )}
        </div>
      </div>

      {/* Player picker sheet */}
      <AnimatePresence>
        {picking !== null && manage && (
          <m.div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 md:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPicking(null)}>
            <m.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
              onClick={(e) => e.stopPropagation()}
              className="glass hairline max-h-[75svh] w-full max-w-md overflow-y-auto rounded-t-[28px] p-5 pb-[calc(20px+env(safe-area-inset-bottom))] md:rounded-[28px]"
            >
              <p className="text-lg font-semibold">
                {slots[picking].label} <span className="text-mute">· pick a player</span>
              </p>
              <ul className="mt-4 space-y-1">
                {[...state.roster]
                  .filter((p) => p.status !== "out")
                  .sort((a, b) => Number(fitsSlot(slots[picking].label, b.positions)) - Number(fitsSlot(slots[picking].label, a.positions)) || (a.status === "ready" ? -1 : 1))
                  .map((p) => {
                    const fit = fitsSlot(slots[picking].label, p.positions);
                    const here = state.lineup[picking] === p.id;
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => {
                            put(picking, p.id);
                            setPicking(null);
                          }}
                          className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-white/[0.06] ${here ? "bg-white/[0.08]" : ""}`}
                        >
                          <PlayerAvatar name={p.name} src={p.avatar} className="size-9 text-xs" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">
                              #{p.number} {p.name}
                            </span>
                            <span className="block text-xs text-mute">
                              {p.positions.join(" · ")}
                              {inLineup.has(p.id) && !here ? " · in lineup" : ""}
                            </span>
                          </span>
                          <span className={`size-2 rounded-full ${p.status === "ready" ? "bg-accent" : p.status === "on_the_way" ? "bg-gold" : "bg-white/30"}`} />
                          {!fit && <span className="text-xs text-gold">off-pos</span>}
                        </button>
                      </li>
                    );
                  })}
              </ul>
              {state.lineup[picking] && (
                <Button
                  variant="danger"
                  className="mt-4 w-full"
                  onClick={() => {
                    put(picking, null);
                    setPicking(null);
                  }}
                >
                  Remove from spot
                </Button>
              )}
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PitchLines() {
  return (
    <svg viewBox="0 0 300 400" className="pointer-events-none absolute inset-0 size-full" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1.5">
      <rect x="10" y="10" width="280" height="380" rx="4" />
      <line x1="10" y1="200" x2="290" y2="200" />
      <circle cx="150" cy="200" r="36" />
      <rect x="80" y="10" width="140" height="56" />
      <rect x="115" y="10" width="70" height="20" />
      <rect x="80" y="334" width="140" height="56" />
      <rect x="115" y="370" width="70" height="20" />
    </svg>
  );
}

export function ScheduleForm({ hasCurrent }: { hasCurrent: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const today = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  const [when, setWhen] = useState(`${today}T21:00`);
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(!hasCurrent);

  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-sm font-semibold text-accent">
        + Schedule a new matchday
      </button>
    );

  return (
    <div className="tile space-y-4 p-6">
      <p className="text-lg font-semibold">Schedule a matchday</p>
      {hasCurrent && <p className="text-xs text-mute">This replaces the current matchday (it will be marked finished).</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (e.g. Div 6 push)" maxLength={80} />
      </div>
      <ErrorText>{error}</ErrorText>
      <Button
        className="w-full"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await createMatchday(when, note);
            if (!res.ok) setError(res.error);
            else setOpen(false);
          })
        }
      >
        {pending ? "Saving…" : "Create matchday"}
      </Button>
      <p className="text-xs text-mute">Time is in WIB.</p>
    </div>
  );
}
