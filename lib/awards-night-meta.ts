// Shared (client + server) Awards Night types.

export type Nominee = {
  name: string;
  slug: string | null;
  playerId: string | null;
  avatar: string | null;
  number: number | null;
  matches: number;
  value: string;
};

export type NightAward = {
  key: "weak" | "engine" | "motm" | "assist" | "boot" | "pots";
  title: string;
  tagline: string;
  color: string;
  unit: string;
  /** winner first */
  nominees: Nominee[];
};
