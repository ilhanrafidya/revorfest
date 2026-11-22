import type { Hattrick, Maestro, Milestone, PlayerAwards } from "@/lib/awards";
import { MILESTONES } from "@/lib/awards";
import { weekFromKey, weekLabel } from "@/lib/honors";
import { TrophyShelf, type Shelf } from "./trophy-shelf";

export type Item = {
  group: string;
  key: string;
  tone: "gold" | "goldSolid" | "red" | "volt" | "blue";
  icon: string;
  title: string;
  sub: string;
  url: string;
  file: string;
};

export type Tone = Record<Item["tone"], { box: string; icon: string; btn: string }>;
const TONE: Tone = {
  goldSolid: { box: "ring-1 ring-gold/50 bg-gold/[0.08]", icon: "bg-gold text-[#2b1d03]", btn: "bg-gold/20 text-gold" },
  gold: { box: "ring-1 ring-gold/25", icon: "bg-gold/15 text-gold", btn: "bg-gold/15 text-gold" },
  red: { box: "ring-1 ring-depleted/25", icon: "bg-depleted/15 text-[#FF6B61]", btn: "bg-depleted/15 text-[#FF6B61]" },
  volt: { box: "ring-1 ring-accent/25", icon: "bg-accent/15 text-accent", btn: "bg-accent/15 text-accent" },
  blue: { box: "ring-1 ring-white/10", icon: "bg-white/10 text-chalk", btn: "bg-white/[0.08] text-chalk" },
};

const SEASON = {
  pots: { title: "Player of the Season", icon: "crown" },
  boot: { title: "Golden Boot", icon: "boot" },
  assist: { title: "Playmaker", icon: "assist" },
} as const;

export function TrophyCabinet({
  slug,
  name,
  awards,
  hattricks,
  maestros = [],
  milestones,
}: {
  slug: string;
  name: string;
  awards: PlayerAwards | null;
  hattricks: Hattrick[];
  maestros?: Maestro[];
  milestones: Milestone[];
}) {
  const items: Item[] = [];
  for (const a of awards?.season ?? [])
    items.push({
      group: a.kind,
      key: `s-${a.kind}-${a.n}`,
      tone: a.kind === "pots" ? "goldSolid" : "gold",
      icon: SEASON[a.kind].icon,
      title: SEASON[a.kind].title,
      sub: `${a.season}${a.kind === "boot" ? ` · ${a.value} goals` : a.kind === "assist" ? ` · ${a.value} assists` : ""}`,
      url: `/share/award?kind=${a.kind}&season=${a.n}`,
      file: `revorfest-${a.kind}-s${a.n}.png`,
    });
  for (const w of awards?.potwWeeks ?? [])
    items.push({ group: "potw", key: `p-${w}`, tone: "gold", icon: "trophy", title: "Player of the Week", sub: weekLabel(weekFromKey(w)), url: `/share/honors?kind=potw&week=${w}`, file: `revorfest-potw-${w}.png` });
  for (const h of hattricks)
    items.push({
      group: "hattrick",
      key: `h-${h.matchId}`,
      tone: "volt",
      icon: "boot",
      title: h.goals >= 5 ? "Five-star show" : h.goals === 4 ? "Poker" : "Hattrick Hero",
      sub: `${h.goals} goals vs ${h.opponent} · ${h.gf}–${h.ga}`,
      url: `/share/hattrick?match=${h.matchId}&tag=${encodeURIComponent(h.gamertag)}`,
      file: `revorfest-hattrick-${h.matchId}.png`,
    });
  for (const m of maestros)
    items.push({
      group: "maestro",
      key: `ma-${m.matchId}`,
      tone: "blue",
      icon: "trophy",
      title: m.assists >= 5 ? "Assist machine" : m.assists === 4 ? "Grand Maestro" : "Maestro",
      sub: `${m.assists} assists vs ${m.opponent} · ${m.gf}–${m.ga}`,
      url: `/share/hattrick?kind=assist&match=${m.matchId}&tag=${encodeURIComponent(m.gamertag)}`,
      file: `revorfest-maestro-${m.matchId}.png`,
    });
  // only the highest milestone per stat — the lower ones are implied
  const top = milestones.filter((m, i) => milestones.findIndex((x) => x.stat === m.stat) === i);
  for (const m of top)
    items.push({
      group: "milestone",
      key: `m-${m.stat}-${m.n}`,
      tone: "blue",
      icon: "trophy",
      title: `${m.n} ${MILESTONES[m.stat].label}`,
      sub: "Club career milestone",
      url: `/share/milestone?slug=${slug}&stat=${m.stat}&n=${m.n}`,
      file: `revorfest-${slug}-${m.n}-${m.stat}.png`,
    });
  for (const w of awards?.weakWeeks ?? [])
    items.push({ group: "weak", key: `w-${w}`, tone: "red", icon: "sad", title: "Player of the Weak", sub: weekLabel(weekFromKey(w)), url: `/share/honors?kind=wpotw&week=${w}`, file: `revorfest-weak-${w}.png` });

  const ORDER: { group: string; title: string }[] = [
    { group: "pots", title: "Player of the Season" },
    { group: "boot", title: "Golden Boot" },
    { group: "assist", title: "Playmaker" },
    { group: "potw", title: "Player of the Week" },
    { group: "hattrick", title: "Hattricks this week" },
    { group: "maestro", title: "Maestro this week" },
    { group: "milestone", title: "Career milestones" },
    { group: "weak", title: "Player of the Weak" },
  ];
  const shelves = ORDER.map((o) => {
    const list = items.filter((i) => i.group === o.group);
    return list.length ? { ...o, tone: list[0].tone, icon: list[0].icon, items: list } : null;
  }).filter(Boolean) as Shelf[];

  return <TrophyShelf name={name} shelves={shelves} tones={TONE} />;
}
