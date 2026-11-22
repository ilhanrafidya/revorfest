// Shared (client + server) Wrapped types and labels.

export type Archetype = "sniper" | "maestro" | "wall" | "consistent" | "engine" | "hothead";

export const ARCHETYPES: Record<Archetype, { title: string; emoji: string; blurb: string; color: string }> = {
  sniper: { title: "The Sniper", emoji: "🎯", blurb: "Give them half a chance and it's in the net.", color: "#D7FF3A" },
  maestro: { title: "The Maestro", emoji: "🧠", blurb: "Sees the pass before anyone else does.", color: "#8AB4FF" },
  wall: { title: "The Wall", emoji: "🧱", blurb: "Nobody gets through. Nobody.", color: "#7EE0C3" },
  consistent: { title: "Mr. Consistent", emoji: "📈", blurb: "Never a bad night. Every single time.", color: "#DDB168" },
  engine: { title: "The Engine", emoji: "🔋", blurb: "Always on. Never misses a session.", color: "#FF9F43" },
  hothead: { title: "Si Paling Emosi", emoji: "🟥", blurb: "Passion. A little too much of it.", color: "#FF453A" },
};

export type Mate = { name: string; slug: string | null; playerId: string | null; avatar: string | null; number: number | null };

export type Wrapped = {
  season: { n: number; name: string; start: string; end: string; finished: boolean };
  player: Mate & { gamertag: string; position: string | null };
  matches: number;
  nights: number;
  clubPlayers: number;
  rank: { matches: number; goals: number; assists: number };
  goals: number;
  assists: number;
  motm: number;
  avgRating: number;
  record: { W: number; D: number; L: number };
  best: { opponent: string; gf: number; ga: number; rating: number; goals: number; assists: number; playedAt: string } | null;
  victim: { opponent: string; goals: number; W: number; D: number; L: number; played: number } | null;
  partner: (Mate & { together: number; wins: number; rate: number }) | null;
  signature: { label: string; value: string; rank: number } | null;
  awards: { potw: number; weak: number; hattricks: number; maestros: number; season: string[] };
  archetype: Archetype;
  archetypeStats: { label: string; value: string }[];
  club: {
    record: { W: number; D: number; L: number };
    gf: number;
    ga: number;
    matches: number;
    top: (Mate & { rating: number; matches: number })[];
  };
};

