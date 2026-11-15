import type { Metadata } from "next";
import { ClipArchive } from "@/components/clip-archive";
import { winners } from "@/lib/clips";

export const metadata: Metadata = { title: "Hall of Fame" };

export default async function HallOfFame() {
  return <ClipArchive kind="gotw" items={await winners("gotw")} />;
}
