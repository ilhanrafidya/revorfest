import type { Metadata } from "next";
import { BackLink } from "@/components/back-link";
import { notFound } from "next/navigation";
import { Reveal } from "@/components/motion-primitives";
import { ResultPill, WhoLink } from "@/components/stat-bits";
import { MATCH_TYPE_LABEL, matchDate } from "@/lib/format";
import { matchDetail } from "@/lib/stats";
import { ShareButton } from "@/components/share-button";

export const metadata: Metadata = { title: "Match" };

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const data = await matchDetail((await params).id);
  if (!data) notFound();
  const { match: m, players, h2h } = data;
  const verdict = m.result === "W" ? "Win" : m.result === "L" ? "Loss" : "Draw";

  return (
    <section className="mx-auto max-w-4xl px-4 pb-40 pt-24 md:px-6 md:pt-32">
      <BackLink href="/stats" label="Stats" />

      <Reveal blur className="text-center md:mt-6">
        <p className="eyebrow">
          {MATCH_TYPE_LABEL[m.match_type] ?? m.match_type} · {matchDate(m.played_at)}
        </p>
        <div className="mt-6 flex items-center justify-center gap-5 md:gap-10">
          <div className="flex-1 text-right">
            <p className="text-xl font-semibold md:text-3xl">Revorfest</p>
          </div>
          <p className="text-display text-7xl tabular-nums md:text-9xl">
            {m.goals_for}
            <span className="text-mute">–</span>
            {m.goals_against}
          </p>
          <div className="flex-1 text-left">
            <p className="text-xl font-semibold md:text-3xl">{m.opponent_name ?? "Unknown"}</p>
          </div>
        </div>
        <div className="mt-6 flex items-center justify-center gap-2">
          <ResultPill result={m.result} />
          <span className="text-sm text-mute">{verdict}</span>
        </div>
        <ShareButton url={`/share/match?id=${m.match_id}`} filename={`revorfest-${m.match_id}.png`} title="Revorfest full time" className="mt-6 bg-accent/15 text-accent" />
      </Reveal>

      <Reveal delay={0.1} className="tile mt-10 p-5 text-center">
        <p className="eyebrow">Head-to-head vs {m.opponent_name ?? "this club"}</p>
        <p className="mt-3 text-lg">
          <span className="font-semibold text-accent">{h2h.W}W</span> · <span className="font-semibold">{h2h.D}D</span> ·{" "}
          <span className="font-semibold text-depleted">{h2h.L}L</span>
          <span className="text-mute"> in archived matches</span>
        </p>
        {m.opponent_id && (
          <ShareButton url={`/share/rival?opp=${m.opponent_id}`} filename={`revorfest-vs-${m.opponent_id}.png`} title={`Revorfest vs ${m.opponent_name ?? "rival"}`} label="Share head-to-head" className="mt-4 glass hairline" />
        )}
      </Reveal>

      <Reveal delay={0.15} className="tile mt-4 overflow-x-auto p-1">
        <table className="w-full min-w-[620px] text-sm">
          <thead className="text-left text-xs text-mute">
            <tr>
              <th className="px-4 py-3 font-medium">Player</th>
              <th className="px-2 py-3 font-medium">Pos</th>
              <th className="px-2 py-3 text-right font-medium">Rating</th>
              <th className="px-2 py-3 text-right font-medium">G</th>
              <th className="px-2 py-3 text-right font-medium">A</th>
              <th className="px-2 py-3 text-right font-medium">Shots</th>
              <th className="px-2 py-3 text-right font-medium">Pass</th>
              <th className="px-4 py-3 text-right font-medium">Tackles</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {players.map((p) => (
              <tr key={p.gamertag}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <WhoLink who={p.who} size="size-8 text-[10px]" />
                    {p.motm && <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-semibold text-gold">MOTM</span>}
                  </div>
                </td>
                <td className="px-2 py-3 capitalize text-mute">{p.position ?? "—"}</td>
                <td className="px-2 py-3 text-right font-semibold tabular-nums">{p.rating != null ? Number(p.rating).toFixed(1) : "—"}</td>
                <td className="px-2 py-3 text-right tabular-nums">{p.goals}</td>
                <td className="px-2 py-3 text-right tabular-nums">{p.assists}</td>
                <td className="px-2 py-3 text-right tabular-nums">{p.shots}</td>
                <td className="px-2 py-3 text-right tabular-nums">
                  {p.passes_made}/{p.pass_attempts}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {p.tackles_made}/{p.tackle_attempts}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Reveal>
    </section>
  );
}
