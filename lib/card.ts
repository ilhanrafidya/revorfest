import "server-only";
import { allAwards, seasonStats, type CardStats, type PlayerAwards } from "./awards";
import { avatarUrl, type PlayerCard } from "./players";
import { memberStats } from "./stats";

export type CardData = {
  slug: string;
  name: string;
  number: number;
  positions: string[];
  avatar: string | null;
  stats: CardStats;
  awards: PlayerAwards;
  gold: boolean;
};

export async function cardFor(p: PlayerCard, awardsMap?: Map<string, PlayerAwards>): Promise<CardData> {
  const [awards, season] = await Promise.all([awardsMap ? Promise.resolve(awardsMap) : allAwards(), seasonStats(p.ea_gamertag)]);
  let stats = season;
  if (!season.matches) {
    const career = await memberStats(p.ea_gamertag).catch(() => null);
    if (career)
      stats = {
        scope: "Career",
        matches: career.gamesPlayed,
        goals: career.goals,
        assists: career.assists,
        motm: career.motm,
        winRate: career.winRate,
        rating: career.ratingAve || null,
      };
  }
  const a = awards.get(p.id) ?? { potw: 0, weak: 0, season: [] };
  return {
    slug: p.slug,
    name: p.display_name,
    number: p.jersey_number,
    positions: [p.primary_position, ...p.secondary_positions],
    avatar: avatarUrl(p),
    stats,
    awards: a,
    gold: a.season.some((s) => s.kind === "pots"),
  };
}
