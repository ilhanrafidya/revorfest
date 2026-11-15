import type { Metadata } from "next";
import { ClipArchive } from "@/components/clip-archive";
import { winners } from "@/lib/clips";

export const metadata: Metadata = { title: "Wall of Shame" };

export default async function WallOfShame() {
  return <ClipArchive kind="notw" items={await winners("notw")} />;
}
