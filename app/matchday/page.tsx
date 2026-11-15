import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Matchday" };

export default function Page() {
  return <ComingSoon eyebrow="Matchday" title="Line up." muted="Lock in." description="Live attendance, every EA FC formation and the matchday kit — set from your phone." phase={4} />;
}
