export type Kit = "home" | "away" | "third";

export const KIT_ORDER: Kit[] = ["home", "away", "third"];

export const KITS: Record<Kit, { label: string; name: string; tagline: string; swatch: [string, string] }> = {
  home: {
    label: "Home",
    name: "Monochrome",
    tagline: "White with a split black spine. Where it all started.",
    swatch: ["#F5F5F7", "#000000"],
  },
  away: {
    label: "Away",
    name: "Royal Marble",
    tagline: "Royal blue marble with a volt edge. Built for the road.",
    swatch: ["#2A56A1", "#D7FF3A"],
  },
  third: {
    label: "Third",
    name: "Midnight",
    tagline: "Midnight navy, indigo slashes. Lights-out football.",
    swatch: ["#0D0F1E", "#2E3388"],
  },
};

export function isKit(v: unknown): v is Kit {
  return v === "home" || v === "away" || v === "third";
}
