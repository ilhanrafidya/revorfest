import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Squad" };

export default function Page() {
  return <ComingSoon eyebrow="Squad" title="The roster." muted="Every number, claimed." description="Self-service signup with the club invite code, unique jersey numbers and player profiles." phase={2} />;
}
