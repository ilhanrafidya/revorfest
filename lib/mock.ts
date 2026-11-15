// Placeholder data for Phase 1. Replaced by the EA sync engine in Phase 3.

export type Result = "W" | "D" | "L";

export const club = {
  record: { w: 48, d: 9, l: 15 },
  matches: 72,
  goalsFor: 186,
  goalsAgainst: 92,
  winRate: 66.7,
  skillRating: 1342,
  division: "Division 2",
  form: ["W", "W", "D", "L", "W"] as Result[],
  lastMatch: { opponent: "Garuda United", score: "3–1" },
};

export const potw = { name: "Dimas", number: 10, position: "ST", avgRating: 8.6, goals: 6, assists: 3, matches: 5 };
export const wpotw = { name: "Yoga", number: 4, position: "CB", avgRating: 5.4, matches: 4 };
export const topScorer = { name: "Raka", number: 9, goals: 31 };
export const topAssist = { name: "Bagas", number: 8, assists: 24 };
export const gotw = { player: "Fajar", title: "Bicycle kick, 89th minute", votes: 12 };
export const nextMatchday = { when: "Tonight · 21:00 WIB", ready: 7, onTheWay: 2, out: 2 };
