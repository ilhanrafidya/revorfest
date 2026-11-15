export const POSITIONS = [
  "GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "LM", "RM", "LW", "RW", "ST",
] as const;

// FC 27 has 12 positions — CF, LWB and RWB were removed (since FC 25).
export type Position = (typeof POSITIONS)[number];

export const POSITION_GROUPS: { label: string; items: Position[] }[] = [
  { label: "Goalkeeper", items: ["GK"] },
  { label: "Defence", items: ["CB", "LB", "RB"] },
  { label: "Midfield", items: ["CDM", "CM", "CAM", "LM", "RM"] },
  { label: "Attack", items: ["LW", "RW", "ST"] },
];

export function isPosition(v: unknown): v is Position {
  return typeof v === "string" && (POSITIONS as readonly string[]).includes(v);
}
