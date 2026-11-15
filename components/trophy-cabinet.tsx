import type { Hattrick, Milestone, PlayerAwards } from "@/lib/awards";
import { MILESTONES } from "@/lib/awards";
import { weekFromKey, weekLabel } from "@/lib/honors";
import { AwardIcon } from "./player-card";
import { ShareButton } from "./share-button";

type Item = {
  key: string;
  tone: "gold" | "goldSolid" | "red" | "volt" | "blue";
  icon: string;
  title: string;
  sub: string;
  url: string;
  file: string;
};

const TONE: Record<Item["tone"], { box: string; icon: string; btn: string }> = {
  goldSolid: { box: "ring-1 ring-gold/50 bg-gold/[0.08]", icon: "bg-gold text-[#2b1d03]", btn: "bg-gold/20 text-gold" },
  gold: { box: "ring-1 ring-gold/25", icon: "bg-gold/15 text-gold", btn: "bg-gold/15 text-gold" },
  red: { box: "ring-1 ring-depleted/25", icon: "bg-depleted/15 text-[#FF6B61]", btn: "bg-depleted/15 text-[#FF6B61]" },
  volt: { box: "ring-1 ring-accent/25", icon: "bg-accent/15 text-accent", btn: "bg-accent/15 text-accent" },
  blue: { box: "ring-1 ring-white/10", icon: "bg-white/10 text-chalk", btn: "bg-white/[0.08] text-chalk" },
};

const SEASON = {
  pots: { title: "Player of the Season", icon: "crown" },
  boot: { title: "Golden Boot", icon: "boot" },
  assist: { title: "Top Assist", icon: "assist" },
} as const;

export function TrophyCabinet({
  slug,
  name,
  awards,
  hattricks,
  milestones,
}: {
  slug: string;
  name: string;
  awards: PlayerAwards | null;
  hattricks: Hattrick[];
  milestones: Milestone[];
}) {
  const items: Item[] = [];
  for (const a of awards?.season ?? [])
    items.push({
      key: `s-${a.kind}-${a.n}`,
      tone: a.kind === "pots" ? "goldSolid" : "gold",
      icon: SEASON[a.kind].icon,
      title: SEASON[a.kind].title,
      sub: `${a.season}${a.kind === "boot" ? ` · ${a.value} goals` : a.kind === "assist" ? ` · ${a.value} assists` : ""}`,
      url: `/share/award?kind=${a.kind}&season=${a.n}`,
      file: `revorfest-${a.kind}-s${a.n}.png`,
    });
  for (const w of awards?.potwWeeks ?? [])
    items.push({ key: `p-${w}`, tone: "gold", icon: "trophy", title: "Player of the Week", sub: weekLabel(weekFromKey(w)), url: `/share/honors?kind=potw&week=${w}`, file: `revorfest-potw-${w}.png` });
  for (const h of hattricks)
    items.push({
      key: `h-${h.matchId}`,
      tone: "volt",
      icon: "boot",
      title: h.goals >= 5 ? "Five-star show" : h.goals === 4 ? "Poker" : "Hattrick Hero",
      sub: `${h.goals} goals vs ${h.opponent} · ${h.gf}–${h.ga}`,
      url: `/share/hattrick?match=${h.matchId}&tag=${encodeURIComponent(h.gamertag)}`,
      file: `revorfest-hattrick-${h.matchId}.png`,
    });
  // only the highest milestone per stat — the lower ones are implied
  const top = milestones.filter((m, i) => milestones.findIndex((x) => x.stat === m.stat) === i);
  for (const m of top)
    items.push({
      key: `m-${m.stat}-${m.n}`,
      tone: "blue",
      icon: "trophy",
      title: `${m.n} ${MILESTONES[m.stat].label}`,
      sub: "Club career milestone",
      url: `/share/milestone?slug=${slug}&stat=${m.stat}&n=${m.n}`,
      file: `revorfest-${slug}-${m.n}-${m.stat}.png`,
    });
  for (const w of awards?.weakWeeks ?? [])
    items.push({ key: `w-${w}`, tone: "red", icon: "sad", title: "Player of the Weak", sub: weekLabel(weekFromKey(w)), url: `/share/honors?kind=wpotw&week=${w}`, file: `revorfest-weak-${w}.png` });

  return (
    <div>
      <div className="mb-4 flex items-end justify-between px-1">
        <div>
          <p className="eyebrow">Trophy cabinet</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">{items.length ? `${items.length} to show off` : "Still empty"}</h2>
        </div>
      </div>
      {items.length === 0 ? (
        <p className="tile p-6 text-sm text-mute">
          {name} hasn&apos;t won anything yet. Weekly awards, hattricks, career milestones and EA season awards all land here — each with its own story to share.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((it) => (
            <li key={it.key} className={`tile flex items-center gap-4 p-4 ${TONE[it.tone].box}`}>
              <span className={`grid size-12 shrink-0 place-items-center rounded-full ${TONE[it.tone].icon}`}>
                <AwardIcon kind={it.icon} className="size-6" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{it.title}</p>
                <p className="truncate text-xs text-mute">{it.sub}</p>
              </div>
              <ShareButton url={it.url} filename={it.file} title={`Revorfest · ${it.title}`} label="Share" className={`shrink-0 px-3 ${TONE[it.tone].btn}`} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
