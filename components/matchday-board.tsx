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
import { CardSheet } from "./player-card";
import { ShareButton } from "./share-button";
import { Reveal } from "./motion-primitives";
import { Button, ErrorText, Input } from "./ui";

type Status = "ready" | "on_the_way" | "out";
type P = { id: string; name: string; slug: string; number: number; positions: string[]; avatar: string | null; status: Status | null };
type MD = { id: string; scheduled_at: string; formation: string; kit: Kit; note: string | null };

const STATUS: { key: Status; label: string; dot: string; active: string }[] = [
  { key: "ready", label: "Ready", dot: "bg-accent", active: "bg-accent text-on-accent" },
  { key: "on_the_way", label: "On the way", dot: "bg-gold", active: "bg-gold text-black" },
  { key: "out", label: "Out", dot: "bg-depleted", active: "bg-depleted text-white" },
];

function whenParts(iso: string) {
  const d = new Date(iso);
  const f = (o: Intl.DateTimeFormatOptions) => d.toLocaleString("en-GB", { ...o, timeZone: "Asia/Jakarta" });
  return { weekday: f({ weekday: "long" }), date: f({ day: "numeric", month: "long" }), time: f({ hour: "2-digit", minute: "2-digit" }) };
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

  const when = useMemo(() => whenParts(matchday.scheduled_at), [matchday.scheduled_at]);
  const [focus, setFocus] = useState<number | null>(null);
  const [cardSlug, setCardSlug] = useState<string | null>(null);
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
      <Reveal className="tile relative overflow-hidden p-6 md:p-10">
        <img
          src={`/kits/${state.kit}.png`}
          alt=""
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-6 size-56 rotate-[8deg] object-contain opacity-[0.16] blur-[1px] md:-right-6 md:size-72"
        />
        <div className="relative">
          <p className="eyebrow">Next matchday</p>
          {matchday.note && <p className="mt-2 text-lg font-semibold tracking-tight text-chalk/90 md:text-xl">{matchday.note}</p>}
          <p className="text-display mt-3 text-6xl leading-[0.9] md:text-8xl">{when.weekday}</p>
          <p className="text-gradient mt-2 text-2xl font-semibold tracking-tight md:text-4xl">
            {when.date} <span className="text-mute/70">·</span> {when.time} <span className="text-base font-medium text-mute md:text-lg">WIB</span>
          </p>

          <dl className="mt-8 grid grid-cols-4 gap-px overflow-hidden rounded-2xl bg-white/[0.06]">
            {[
              { k: "Ready", v: groups[0].players.length, c: "text-accent" },
              { k: "On the way", v: groups[1].players.length, c: "text-gold" },
              { k: "Out", v: groups[2].players.length, c: "text-depleted" },
              { k: "No reply", v: noReply.length, c: "text-chalk/70" },
            ].map((x) => (
              <div key={x.k} className="bg-carbon/80 px-3 py-4 text-center md:py-5">
                <dd className={`text-display text-3xl tabular-nums md:text-4xl ${x.c}`}>{x.v}</dd>
                <dt className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-mute md:text-[11px]">{x.k}</dt>
              </div>
            ))}
          </dl>
        </div>

        {me && (
          <div className="relative mt-6">
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
        {!meId && <p className="relative mt-6 text-sm text-mute">Log in to set your status.</p>}
      </Reveal>

      <ErrorText>{error}</ErrorText>

      {/* Tactical board */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Reveal delay={0.08} className="tile p-4 md:p-6">
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
                url={`/share/lineup?id=${matchday.id}&v=${encodeURIComponent(`${state.formation}.${state.kit}.${state.lineup.map((x) => x?.slice(0, 4) ?? "-").join("")}`)}`}
                filename="revorfest-lineup.png"
                title="Revorfest lineup"
                className="bg-accent/15 text-accent"
              />
            </div>
          </div>

          {/* Pitch */}
          <div
            className="relative mx-auto aspect-[3/4] w-full max-w-[540px] overflow-hidden rounded-[28px] ring-1 ring-white/10"
            style={{
              background:
                "radial-gradient(120% 70% at 50% 0%, rgba(255,255,255,0.07), transparent 60%), radial-gradient(100% 60% at 50% 100%, rgba(0,0,0,0.45), transparent 70%), repeating-linear-gradient(180deg, #0c2e1d 0 10%, #0f3523 10% 20%)",
            }}
            onClick={() => setFocus(null)}
          >
            <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_80px_rgba(0,0,0,0.55)]" />
            <PitchLines />
            <div className="pointer-events-none absolute left-5 top-4 md:left-6 md:top-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">Formation</p>
              <p className="text-display text-2xl text-white/90 md:text-3xl">{state.formation}</p>
            </div>
            <div className="pointer-events-none absolute right-5 top-4 text-right md:right-6 md:top-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">Kit</p>
              <p className="text-sm font-semibold text-white/80 md:text-base">{KITS[state.kit].label}</p>
            </div>
            {slots.map((s, i) => {
              const pid = state.lineup[i];
              const p = pid ? byId.get(pid) : undefined;
              const warn = p && !fitsSlot(s.label, p.positions);
              const open = focus === i && !!p;
              // keep the option pills inside the pitch for touchline slots
              const side = s.x < 24 ? "right" : s.x > 76 ? "left" : "split";
              const removeCls = side === "split" ? "right-full top-3 mr-1.5 md:top-4" : side === "right" ? "left-full -top-3 ml-1.5" : "right-full -top-3 mr-1.5";
              const viewCls = side === "split" ? "left-full top-3 ml-1.5 md:top-4" : side === "right" ? "left-full top-7 ml-1.5" : "right-full top-7 mr-1.5";
              return (
                <div
                  key={`${state.formation}-${i}`}
                  className={`absolute -translate-x-1/2 translate-y-1/2 ${open ? "z-20" : "z-10"}`}
                  style={{ left: `${s.x}%`, bottom: `${s.y}%` }}
                  onDragOver={(e) => manage && e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData("text/plain") || dragId;
                    if (manage && id) put(i, id);
                    setDragId(null);
                  }}
                >
                  <AnimatePresence>
                    {open && p && (
                      <>
                        {manage && (
                          <m.button
                            type="button"
                            initial={{ opacity: 0, x: 8, scale: 0.8 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 8, scale: 0.8 }}
                            transition={SPRING_SNAPPY}
                            onClick={(e) => {
                              e.stopPropagation();
                              put(i, null);
                              setFocus(null);
                            }}
                            aria-label={`Remove ${p.name}`}
                            className={`absolute ${removeCls} flex items-center gap-1 whitespace-nowrap rounded-full bg-depleted px-3 py-2 text-[11px] font-semibold text-white shadow-[0_8px_20px_rgba(0,0,0,0.45)]`}
                          >
                            <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
                            Remove
                          </m.button>
                        )}
                        <m.button
                          type="button"
                          initial={{ opacity: 0, x: -8, scale: 0.8 }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          exit={{ opacity: 0, x: -8, scale: 0.8 }}
                          transition={SPRING_SNAPPY}
                          onClick={(e) => {
                            e.stopPropagation();
                            setFocus(null);
                            setCardSlug(p.slug);
                          }}
                          className={`absolute ${viewCls} flex items-center gap-1 whitespace-nowrap rounded-full bg-chalk px-3 py-2 text-[11px] font-semibold text-black shadow-[0_8px_20px_rgba(0,0,0,0.45)]`}
                        >
                          <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="5" y="3" width="14" height="18" rx="2.5" /><circle cx="12" cy="10" r="2.5" /><path d="M8.5 16.5c.8-1.6 2-2.4 3.5-2.4s2.7.8 3.5 2.4" /></svg>
                          View card
                        </m.button>
                      </>
                    )}
                  </AnimatePresence>
                  <button
                    type="button"
                    disabled={!manage && !p}
                    draggable={manage && !!p}
                    onDragStart={(e) => {
                      if (!p) return;
                      e.dataTransfer.setData("text/plain", p.id);
                      setDragId(p.id);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (p) setFocus(open ? null : i);
                      else if (manage) {
                        setFocus(null);
                        setPicking(i);
                      }
                    }}
                    className="group flex w-[72px] flex-col items-center md:w-24"
                  >
                    {p ? (
                      <m.span animate={{ scale: open ? 1.08 : 1 }} transition={SPRING_SNAPPY} className="relative block">
                        <span className={`absolute inset-x-1 bottom-0 h-2 rounded-full bg-black/60 blur-md transition ${open ? "opacity-100" : "opacity-70"}`} />
                        <img src={`/kits/${state.kit}.png`} alt="" className="relative size-11 object-contain md:size-14" draggable={false} />
                        {warn && (
                          <span title="Out of position" className="absolute -right-1.5 -top-1 grid size-4 place-items-center rounded-full bg-gold text-[10px] font-black text-black ring-2 ring-black/40">
                            !
                          </span>
                        )}
                      </m.span>
                    ) : (
                      <span className="grid size-11 place-items-center rounded-full border border-dashed border-white/30 bg-white/[0.04] text-[10px] font-semibold tracking-wider text-white/70 backdrop-blur-sm transition group-hover:border-white/60 group-hover:text-white md:size-14 md:text-xs">
                        {manage ? "+" : s.label}
                      </span>
                    )}
                    {p ? (
                      <span
                        className={`mt-1.5 flex max-w-full items-center gap-1.5 rounded-full py-[3px] pl-[3px] pr-2.5 backdrop-blur-md transition ${
                          open ? "bg-chalk text-black" : "bg-black/65 text-white ring-1 ring-white/10"
                        }`}
                      >
                        <span className={`grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10px] font-bold tabular-nums md:h-5 md:min-w-5 md:text-[11px] ${open ? "bg-black text-chalk" : "bg-accent text-on-accent"}`}>
                          {p.number}
                        </span>
                        <span className="truncate text-[10px] font-semibold md:text-xs">{p.name}</span>
                      </span>
                    ) : (
                      <span className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55 md:text-[11px]">{s.label}</span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-center text-xs text-mute">
            {manage ? "Tap an empty spot to pick a player · tap a player for options · drag from the bench on desktop" : "Tap a player to view their card"}
            {manage && <span className="text-gold"> · ! = out of position</span>}
          </p>
        </Reveal>

        {/* Bench + attendance */}
        <Reveal delay={0.16} className="space-y-4">
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
          {manage && <FullTime onConfirm={() => run({ type: "clear" }, () => closeMatchday(matchday.id))} />}
        </Reveal>
      </div>

      <CardSheet slug={cardSlug} onClose={() => setCardSlug(null)} />

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
    <svg viewBox="0 0 300 400" className="pointer-events-none absolute inset-0 size-full" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.1">
      <rect x="12" y="12" width="276" height="376" rx="3" />
      <line x1="12" y1="200" x2="288" y2="200" />
      <circle cx="150" cy="200" r="34" />
      <circle cx="150" cy="200" r="1.8" fill="rgba(255,255,255,0.35)" stroke="none" />
      <rect x="78" y="12" width="144" height="58" />
      <rect x="114" y="12" width="72" height="20" />
      <path d="M124 70a30 30 0 0 0 52 0" />
      <circle cx="150" cy="52" r="1.6" fill="rgba(255,255,255,0.35)" stroke="none" />
      <rect x="78" y="330" width="144" height="58" />
      <rect x="114" y="368" width="72" height="20" />
      <path d="M124 330a30 30 0 0 1 52 0" />
      <circle cx="150" cy="348" r="1.6" fill="rgba(255,255,255,0.35)" stroke="none" />
      <path d="M12 20a8 8 0 0 0 8-8M280 12a8 8 0 0 0 8 8M12 380a8 8 0 0 1 8 8M280 388a8 8 0 0 1 8-8" />
    </svg>
  );
}

/** Hold-to-confirm "full time" control — no accidental taps. */
function FullTime({ onConfirm }: { onConfirm: () => void }) {
  const [holding, setHolding] = useState(false);
  const [done, setDone] = useState(false);
  const HOLD = 1.1;
  return (
    <div className="tile relative overflow-hidden p-4">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/[0.06]">
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
          </svg>
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">Full time</p>
          <p className="text-xs text-mute">Closes the board and archives this lineup.</p>
        </div>
      </div>
      <button
        type="button"
        disabled={done}
        onPointerDown={() => setHolding(true)}
        onPointerUp={() => setHolding(false)}
        onPointerLeave={() => setHolding(false)}
        onPointerCancel={() => setHolding(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setDone(true);
            onConfirm();
          }
        }}
        className="relative mt-4 w-full select-none overflow-hidden rounded-full bg-white/[0.06] px-4 py-3.5 text-sm font-semibold text-chalk ring-1 ring-white/10 transition active:scale-[0.98]"
      >
        <m.span
          aria-hidden
          className="absolute inset-y-0 left-0 bg-accent"
          initial={false}
          animate={{ width: holding || done ? "100%" : "0%" }}
          transition={{ duration: holding ? HOLD : 0.3, ease: holding ? "linear" : EASE }}
          onAnimationComplete={() => {
            if (holding && !done) {
              setDone(true);
              setHolding(false);
              onConfirm();
            }
          }}
        />
        <span className={`relative transition-colors ${holding || done ? "text-on-accent" : ""}`}>
          {done ? "Matchday finished ✓" : holding ? "Keep holding…" : "Hold to blow the final whistle"}
        </span>
      </button>
    </div>
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
      <div className="grid gap-3 sm:grid-cols-2 [&>*]:min-w-0">
        <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="block min-w-0 max-w-full appearance-none text-left [&::-webkit-date-and-time-value]:text-left" />
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Matchday title (e.g. Road to Div 4)" maxLength={80} />
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
