import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Showdown" };

export default function Page() {
  return <ComingSoon eyebrow="Showdown" title="Goal of the Week." muted="Nyunda of the Week." description="Drop your clips, vote once a week, and earn a place in the Hall of Fame — or the Wall of Shame." phase={4} />;
}
