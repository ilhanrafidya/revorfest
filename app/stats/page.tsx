import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Stats" };

export default function Page() {
  return <ComingSoon eyebrow="Stats" title="Leaderboards." muted="Synced from EA." description="Golden Boot, Playmaker, clean sheets, MVP — plus Player and Worst Player of the Week." phase={3} />;
}
