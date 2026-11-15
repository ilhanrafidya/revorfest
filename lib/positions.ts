export const POSITIONS = [
  "GK", "CB", "LB", "RB", "LWB", "RWB", "CDM", "CM", "CAM", "LM", "RM", "LW", "RW", "CF", "ST",
] as const;

export type Position = (typeof POSITIONS)[number];

export const POSITION_GROUPS: { label: string; items: Position[] }[] = [
  { label: "Goalkeeper", items: ["GK"] },
  { label: "Defence", items: ["CB", "LB", "RB", "LWB", "RWB"] },
  { label: "Midfield", items: ["CDM", "CM", "CAM", "LM", "RM"] },
  { label: "Attack", items: ["LW", "RW", "CF", "ST"] },
];

export function isPosition(v: unknown): v is Position {
  return typeof v === "string" && (POSITIONS as readonly string[]).includes(v);
}
