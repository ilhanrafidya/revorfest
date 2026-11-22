import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { currentPlayer } from "@/lib/session";
import { awardsNight, nightSeason } from "@/lib/awards-night";
import { AwardsNight } from "@/components/awards-night";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ season: string }> }): Promise<Metadata> {
  return { title: `Season ${(await params).season} Awards Night` };
}

export default async function AwardsNightPage({ params }: { params: Promise<{ season: string }> }) {
  const n = Number((await params).season);
  const ns = nightSeason(n);
  if (!ns) notFound();
  if (!ns.finished && (await currentPlayer())?.role !== "admin") notFound();
  const night = await awardsNight(n);
  if (!night || !night.awards.length) notFound();
  return <AwardsNight season={night.season} awards={night.awards} preview={!night.season.finished} />;
}
