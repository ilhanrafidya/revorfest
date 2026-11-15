// EA SPORTS FC 27 season calendar (EA Launch Rewards Pitch Notes, 17 Sep 2026).
// Seasons roll over on Thursdays around 07:00 UTC (14:00 WIB). Season 2 onwards are 42 days each;
// anything past the published calendar is projected on the same 42-day rhythm.

export type Season = { n: number; name: string; start: Date; end: Date; projected?: boolean };

const ROLL = "T07:00:00Z";
const DAY = 86400000;
const PUBLISHED: { name: string; start: string; end: string }[] = [
  { name: "Season 1", start: "2026-09-17", end: "2026-10-22" },
  { name: "Season 2", start: "2026-10-22", end: "2026-12-03" },
  { name: "Season 3", start: "2026-12-03", end: "2027-01-14" },
  { name: "Season 4", start: "2027-01-14", end: "2027-02-25" },
  { name: "Season 5", start: "2027-02-25", end: "2027-04-08" },
];

export const SEASONS: Season[] = PUBLISHED.map((s, i) => ({
  n: i + 1,
  name: s.name,
  start: new Date(s.start + ROLL),
  end: new Date(s.end + ROLL),
}));

export function seasonAt(d = new Date()): Season {
  const hit = SEASONS.find((s) => d >= s.start && d < s.end);
  if (hit) return hit;
  if (d < SEASONS[0].start) return SEASONS[0];
  // project 42-day seasons past the published calendar
  const last = SEASONS[SEASONS.length - 1];
  const k = Math.floor((d.getTime() - last.end.getTime()) / (42 * DAY));
  const start = new Date(last.end.getTime() + k * 42 * DAY);
  return { n: last.n + k + 1, name: `Season ${last.n + k + 1}`, start, end: new Date(start.getTime() + 42 * DAY), projected: true };
}

/** Seasons that have already finished, newest first. */
export function finishedSeasons(now = new Date()): Season[] {
  const out: Season[] = [];
  let s = seasonAt(new Date(SEASONS[0].start.getTime() + 1));
  while (s.end <= now) {
    out.push(s);
    s = seasonAt(new Date(s.end.getTime() + 1));
  }
  return out.reverse();
}

export function seasonByNumber(n: number): Season | null {
  if (!Number.isInteger(n) || n < 1 || n > 60) return null;
  let s = SEASONS[0] as Season;
  while (s.n < n) s = seasonAt(new Date(s.end.getTime() + 1));
  return s;
}
