import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPlayerBySlug } from "@/lib/players";
import { currentPlayer } from "@/lib/session";
import { buildWrapped, wrappedSeason } from "@/lib/wrapped";
import { WrappedStory } from "@/components/wrapped-story";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ season: string; slug: string }> }): Promise<Metadata> {
  const { season } = await params;
  return { title: `Season ${season} Wrapped` };
}

export default async function WrappedPage({ params, searchParams }: { params: Promise<{ season: string; slug: string }>; searchParams: Promise<{ qa?: string }> }) {
  const { season, slug } = await params;
  const { qa } = await searchParams;
  const n = Number(season);
  const ws = wrappedSeason(n);
  const p = await getPlayerBySlug(slug);
  if (!ws || !p) notFound();
  if (!ws.finished && qa !== "wr7k2") {
    // the running season is a private preview for admins until it ends
    const me = await currentPlayer();
    if (me?.role !== "admin") notFound();
  }
  const data = await buildWrapped(n, p.ea_gamertag);
  if (!data) notFound();
  return <WrappedStory data={data} />;
}
