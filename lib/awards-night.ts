import "server-only";
import { MIN_SEASON_MATCHES } from "./awards";
import { MIN_MATCHES, rangeTable, type WeeklyLine } from "./honors";
import { finishedSeasons, seasonAt, seasonByNumber } from "./seasons";
import type { NightAward } from "./awards-night-meta";

export type { NightAward, Nominee } from "./awards-night-meta";

/** Finished seasons always; the running one only as an admin preview (checked by the caller). */
export function nightSeason(n: number) {
  const s = seasonByNumber(n);
  if (!s) return null;
  const finished = finishedSeasons().some((f) => f.n === s.n);
  if (!finished && s.n !== seasonAt().n) return null;
  return { season: s, finished };
}

const nominee = (l: WeeklyLine, value: string) => ({
  name: l.name,
  slug: l.slug,
  playerId: l.playerId,
  avatar: l.avatar,
  number: l.number,
  matches: l.matches,
  value,
});

/**
 * The ceremony running order: lightest first, Player of the Season last.
 * Winners match the official season awards (same rules as the trophy cabinet).
 */
export async function awardsNight(n: number): Promise<{ season: { n: number; name: string; finished: boolean }; awards: NightAward[] } | null> {
  const ns = nightSeason(n);
  if (!ns) return null;
  const { season, finished } = ns;
  const table = await rangeTable(season.start, finished ? season.end : new Date());
  const linked = table.filter((l) => l.playerId && l.matches >= MIN_MATCHES);
  const regulars = table.filter((l) => l.playerId && l.matches >= MIN_SEASON_MATCHES);
  const top3 = (list: WeeklyLine[], cmp: (a: WeeklyLine, b: WeeklyLine) => number) => [...list].sort(cmp).slice(0, 3);

  const awards: NightAward[] = [];
  const add = (a: Omit<NightAward, "nominees">, list: WeeklyLine[], fmt: (l: WeeklyLine) => string) => {
    if (list.length) awards.push({ ...a, nominees: list.map((l) => nominee(l, fmt(l))) });
  };

  add(
    { key: "weak", title: "Player of the Weak", tagline: "Lowest average rating of the season", color: "#FF453A", unit: "avg rating" },
    top3(regulars.length >= 2 ? regulars : linked, (a, b) => a.avgRating - b.avgRating),
    (l) => l.avgRating.toFixed(1),
  );
  add(
    { key: "engine", title: "Ever-present", tagline: "Most matches played", color: "#FF9F43", unit: "matches" },
    top3(linked, (a, b) => b.matches - a.matches || b.avgRating - a.avgRating),
    (l) => String(l.matches),
  );
  add(
    { key: "motm", title: "Mr. Man of the Match", tagline: "Most MOTM awards", color: "#8AB4FF", unit: "MOTM" },
    top3(
      linked.filter((l) => l.motm > 0),
      (a, b) => b.motm - a.motm || a.matches - b.matches,
    ),
    (l) => `${l.motm}×`,
  );
  add(
    { key: "assist", title: "Playmaker", tagline: "Most assists", color: "#7EE0C3", unit: "assists" },
    top3(
      linked.filter((l) => l.assists > 0),
      (a, b) => b.assists - a.assists || a.matches - b.matches,
    ),
    (l) => String(l.assists),
  );
  add(
    { key: "boot", title: "Golden Boot", tagline: "Most goals", color: "#D7FF3A", unit: "goals" },
    top3(
      linked.filter((l) => l.goals > 0),
      (a, b) => b.goals - a.goals || a.matches - b.matches,
    ),
    (l) => String(l.goals),
  );
  // rangeTable is already ranked by the POTW score
  add(
    { key: "pots", title: "Player of the Season", tagline: `The best of ${season.name}`, color: "#DDB168", unit: "avg rating" },
    regulars.slice(0, 3),
    (l) => l.avgRating.toFixed(1),
  );

  return { season: { n: season.n, name: season.name, finished }, awards };
}
