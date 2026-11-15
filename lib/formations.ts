// EA SPORTS FC formations. Each row runs from defence to attack; slot order = flattened rows.

export type Slot = { label: string; x: number; y: number };

const ROWS: Record<string, string[][]> = {
  "3-1-4-2": [["CB", "CB", "CB"], ["CDM"], ["LM", "CM", "CM", "RM"], ["ST", "ST"]],
  "3-4-1-2": [["CB", "CB", "CB"], ["LM", "CM", "CM", "RM"], ["CAM"], ["ST", "ST"]],
  "3-4-2-1": [["CB", "CB", "CB"], ["LM", "CM", "CM", "RM"], ["CAM", "CAM"], ["ST"]],
  "3-4-3": [["CB", "CB", "CB"], ["LM", "CM", "CM", "RM"], ["LW", "ST", "RW"]],
  "3-5-2": [["CB", "CB", "CB"], ["CDM", "CDM"], ["LM", "CAM", "RM"], ["ST", "ST"]],
  "4-1-2-1-2": [["LB", "CB", "CB", "RB"], ["CDM"], ["LM", "RM"], ["CAM"], ["ST", "ST"]],
  "4-1-2-1-2 (2)": [["LB", "CB", "CB", "RB"], ["CDM"], ["CM", "CM"], ["CAM"], ["ST", "ST"]],
  "4-1-3-2": [["LB", "CB", "CB", "RB"], ["CDM"], ["LM", "CM", "RM"], ["ST", "ST"]],
  "4-1-4-1": [["LB", "CB", "CB", "RB"], ["CDM"], ["LM", "CM", "CM", "RM"], ["ST"]],
  "4-2-1-3": [["LB", "CB", "CB", "RB"], ["CDM", "CDM"], ["CAM"], ["LW", "ST", "RW"]],
  "4-2-2-2": [["LB", "CB", "CB", "RB"], ["CDM", "CDM"], ["CAM", "CAM"], ["ST", "ST"]],
  "4-2-3-1": [["LB", "CB", "CB", "RB"], ["CDM", "CDM"], ["CAM", "CAM", "CAM"], ["ST"]],
  "4-2-3-1 (2)": [["LB", "CB", "CB", "RB"], ["CDM", "CDM"], ["LM", "CAM", "RM"], ["ST"]],
  "4-2-4": [["LB", "CB", "CB", "RB"], ["CM", "CM"], ["LW", "ST", "ST", "RW"]],
  "4-3-1-2": [["LB", "CB", "CB", "RB"], ["CM", "CM", "CM"], ["CAM"], ["ST", "ST"]],
  "4-3-2-1": [["LB", "CB", "CB", "RB"], ["CM", "CM", "CM"], ["CAM", "CAM"], ["ST"]],
  "4-3-3": [["LB", "CB", "CB", "RB"], ["CM", "CM", "CM"], ["LW", "ST", "RW"]],
  "4-3-3 (2)": [["LB", "CB", "CB", "RB"], ["CDM"], ["CM", "CM"], ["LW", "ST", "RW"]],
  "4-3-3 (3)": [["LB", "CB", "CB", "RB"], ["CDM", "CDM"], ["CM"], ["LW", "ST", "RW"]],
  "4-3-3 (4)": [["LB", "CB", "CB", "RB"], ["CM", "CM"], ["CAM"], ["LW", "ST", "RW"]],
  "4-4-1-1 (2)": [["LB", "CB", "CB", "RB"], ["LM", "CM", "CM", "RM"], ["CAM"], ["ST"]],
  "4-4-2": [["LB", "CB", "CB", "RB"], ["LM", "CM", "CM", "RM"], ["ST", "ST"]],
  "4-4-2 (2)": [["LB", "CB", "CB", "RB"], ["CDM", "CDM"], ["LM", "RM"], ["ST", "ST"]],
  "4-5-1": [["LB", "CB", "CB", "RB"], ["CM"], ["LM", "CAM", "CAM", "RM"], ["ST"]],
  "4-5-1 (2)": [["LB", "CB", "CB", "RB"], ["LM", "CM", "CM", "CM", "RM"], ["ST"]],
  "5-2-1-2": [["LB", "CB", "CB", "CB", "RB"], ["CM", "CM"], ["CAM"], ["ST", "ST"]],
  "5-2-3": [["LB", "CB", "CB", "CB", "RB"], ["CM", "CM"], ["LW", "ST", "RW"]],
  "5-3-2": [["LB", "CB", "CB", "CB", "RB"], ["CM", "CDM", "CM"], ["ST", "ST"]],
  "5-4-1": [["LB", "CB", "CB", "CB", "RB"], ["LM", "CM", "CM", "RM"], ["ST"]],
};

export const FORMATIONS = Object.keys(ROWS);
export const DEFAULT_FORMATION = "4-3-3";

const Y: Record<string, number> = {
  GK: 8, CB: 24, LB: 27, RB: 27, CDM: 39, CM: 51, LM: 53, RM: 53,
  CAM: 66, LW: 77, RW: 77, ST: 85,
};

function spread(n: number, labels: string[]): number[] {
  const wide = labels.every((l) => ["LM", "RM", "LW", "RW"].includes(l));
  if (n === 1) return [50];
  if (n === 2) return wide ? [13, 87] : [36, 64];
  if (n === 3) return [22, 50, 78];
  if (n === 4) return [13, 38, 62, 87];
  return [9, 29.5, 50, 70.5, 91];
}

export function formationSlots(name: string): Slot[] {
  const rows = ROWS[name] ?? ROWS[DEFAULT_FORMATION];
  const slots: Slot[] = [{ label: "GK", x: 50, y: Y.GK }];
  for (const row of rows) {
    const xs = spread(row.length, row);
    row.forEach((label, i) => {
      // wide players in a mixed row sit slightly higher/lower like in-game
      slots.push({ label, x: xs[i], y: Y[label] ?? 50 });
    });
  }
  return slots;
}

export function isFormation(v: unknown): v is string {
  return typeof v === "string" && v in ROWS;
}

const FAMILY: Record<string, string[]> = {
  GK: ["GK"],
  CB: ["CB"],
  LB: ["LB"],
  RB: ["RB"],
  CDM: ["CDM", "CM"],
  CM: ["CM", "CDM", "CAM"],
  CAM: ["CAM", "CM", "ST"],
  LM: ["LM", "LW"],
  RM: ["RM", "RW"],
  LW: ["LW", "LM"],
  RW: ["RW", "RM"],
  ST: ["ST", "CAM"],
};

/** True when a player with these positions is comfortable in `slot`. */
export function fitsSlot(slot: string, positions: string[]) {
  const ok = FAMILY[slot] ?? [slot];
  return positions.some((p) => ok.includes(p));
}
