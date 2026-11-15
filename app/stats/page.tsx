import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/motion-primitives";
import { PlayerAvatar } from "@/components/player-avatar";
import { ShareButton } from "@/components/share-button";
import { ResultPill, WhoLink } from "@/components/stat-bits";
import { MIN_MATCHES, honorsFor, weekStart, type WeeklyLine } from "@/lib/honors";
import { MATCH_TYPE_LABEL, matchDate, timeAgo } from "@/lib/format";
import { lastSync, leaderboards, recentMatches, type BoardEntry } from "@/lib/stats";

export const metadata: Metadata = { title: "Stats" };

export default async function StatsPage() {
  const thisWeek = weekStart();
  const lastWeek = new Date(thisWeek.getTime() - 7 * 86400000);
  const [sync, boards, matches, now, prev] = await Promise.all([
    lastSync(),
    leaderboards(),
    recentMatches(15),
    honorsFor(thisWeek),
    honorsFor(lastWeek),
  ]);

  return (
    <section className="mx-auto max-w-6xl px-4 pb-40 pt-24 md:px-6 md:pt-32">
      <Reveal blur className="flex flex-col gap-4 px-1 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">Stats</p>
          <h1 className="text-display mt-3 text-5xl md:text-7xl">
            The numbers.
            <br />
            <span className="text-gradient">Straight from EA.</span>
          </h1>
        </div>
        <SyncChip sync={sync} />
      </Reveal>

      {/* Weekly honors */}
      <div className="mt-14">
        <SectionTitle eyebrow="Weekly spotlight" title={`Last week · ${prev.label}`} />
        <div className="grid gap-3 md:grid-cols-2 md:gap-4">
          <HonorCard kind="potw" line={prev.potw} weekKey={prev.key} />
          <HonorCard kind="wpotw" line={prev.wpotw} weekKey={prev.key} />
        </div>
      </div>

      <div className="mt-14">
        <SectionTitle eyebrow="Live race" title={`This week · ${now.label}`} />
        <RaceTable table={now.table} />
        <p className="mt-4 text-xs leading-relaxed text-mute">
          <span className="font-semibold text-chalk">How it&apos;s calculated:</span> minimum {MIN_MATCHES} matches in the week
          (Mon–Sun WIB). Score = avg rating × 10 + (goals + 0.75 × assists) per match × 4 + clean sheets per match × 6 for
          GK/defenders (× 2 for others) + tackles per match × 0.4 + saves per match × 0.8 for keepers + 2 per Man of the
          Match. Player of the Weak = lowest average rating among qualified players. Winners lock in on Monday.
        </p>
      </div>

      {/* Leaderboards */}
      <div className="mt-16">
        <SectionTitle eyebrow="Leaderboards" title="Club career (EA)" />
        {boards.all.length === 0 ? (
          <Empty>Leaderboards appear after the first successful EA sync.</Empty>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-4">
            <Board title="Golden Boot" unit="goals" rows={boards.goals} value={(m) => m.goals} />
            <Board title="Playmaker" unit="assists" rows={boards.assists} value={(m) => m.assists} />
            <Board title="Brick wall" unit="clean sheets" rows={boards.cleanSheets} value={(m) => m.cleanSheets} />
            <Board title="MVP" unit="avg rating" rows={boards.mvp} value={(m) => m.ratingAve} decimals={1} />
          </div>
        )}
      </div>

      {/* Matches */}
      <div className="mt-16">
        <SectionTitle eyebrow="Match archive" title="Recent matches" />
        {matches.length === 0 ? (
          <Empty>No matches archived yet.</Empty>
        ) : (
          <ul className="tile divide-y divide-white/[0.06] p-1">
            {matches.map((m) => (
              <li key={m.match_id}>
                <Link href={`/matches/${m.match_id}`} className="flex items-center gap-4 rounded-2xl px-4 py-3.5 transition hover:bg-white/[0.04]">
                  <ResultPill result={m.result} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">vs {m.opponent_name ?? "Unknown"}</p>
                    <p className="text-xs text-mute">
                      {MATCH_TYPE_LABEL[m.match_type] ?? m.match_type} · {matchDate(m.played_at)}
                    </p>
                  </div>
                  <p className="text-xl font-semibold tabular-nums">
                    {m.goals_for}–{m.goals_against}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function SyncChip({ sync }: { sync: Awaited<ReturnType<typeof lastSync>> }) {
  if (!sync) return <span className="glass hairline rounded-full px-4 py-2 text-sm text-mute">Waiting for first EA sync</span>;
  return (
    <span className="glass hairline inline-flex items-center gap-2 self-start rounded-full px-4 py-2 text-sm md:self-auto">
      <span className={`size-2 rounded-full ${sync.ok ? "bg-accent" : "bg-depleted"}`} />
      {sync.ok ? "EA synced" : "EA sync failed"} · {timeAgo(sync.at)}
    </span>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-5 px-1">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">{title}</h2>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="tile p-6 text-sm text-mute">{children}</p>;
}

function HonorCard({ kind, line, weekKey }: { kind: "potw" | "wpotw"; line: WeeklyLine | null; weekKey: string }) {
  const gold = kind === "potw";
  return (
    <div className={`tile p-6 md:p-7 ${gold ? "ring-1 ring-gold/25" : "ring-1 ring-depleted/20"}`}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: gold
            ? "radial-gradient(80% 70% at 90% 0%, rgb(221 177 104 / 0.2), transparent 70%)"
            : "radial-gradient(80% 70% at 90% 0%, rgb(255 69 58 / 0.14), transparent 70%)",
        }}
      />
      <div className="relative">
        <p className={`text-sm font-semibold ${gold ? "text-gold" : "text-depleted"}`}>
          {gold ? "Player of the Week" : "Player of the Weak · Stamina depleted"}
        </p>
        {line ? (
          <>
            <div className="mt-5 flex items-center gap-4">
              <PlayerAvatar name={line.name} src={line.avatar} className="size-16 text-lg" />
              <div className="min-w-0">
                <p className="text-display truncate text-4xl">{line.name}</p>
                <p className="text-sm text-mute">{line.matches} matches</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/[0.08] pt-4 text-center">
              <Mini label="Avg rating" value={line.avgRating.toFixed(1)} />
              <Mini label="Goals" value={line.goals} />
              <Mini label="Assists" value={line.assists} />
            </div>
            <ShareButton
              url={`/share/honors?kind=${kind}&week=${weekKey}`}
              filename={`revorfest-${kind}-${weekKey}.png`}
              title={gold ? "Revorfest Player of the Week" : "Revorfest Player of the Weak"}
              className={`mt-5 ${gold ? "bg-gold/15 text-gold" : "bg-depleted/15 text-depleted"}`}
            />
          </>
        ) : (
          <p className="mt-4 text-sm text-mute">Nobody played {MIN_MATCHES}+ synced matches that week.</p>
        )}
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-mute">{label}</p>
    </div>
  );
}

function RaceTable({ table }: { table: WeeklyLine[] }) {
  if (table.length === 0) return <Empty>No synced matches this week yet.</Empty>;
  return (
    <div className="tile overflow-x-auto p-1">
      <table className="w-full min-w-[560px] text-sm">
        <thead className="text-left text-xs text-mute">
          <tr>
            <th className="px-4 py-3 font-medium">Player</th>
            <th className="px-2 py-3 text-right font-medium">MP</th>
            <th className="px-2 py-3 text-right font-medium">Rating</th>
            <th className="px-2 py-3 text-right font-medium">G</th>
            <th className="px-2 py-3 text-right font-medium">A</th>
            <th className="px-4 py-3 text-right font-medium">Score</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.06]">
          {table.map((l, i) => (
            <tr key={l.gamertag} className={l.matches < MIN_MATCHES ? "opacity-45" : ""}>
              <td className="px-4 py-3">
                <WhoLink who={{ name: l.name, slug: l.slug, avatar: l.avatar, number: l.number }} size="size-8 text-[10px]" />
              </td>
              <td className="px-2 py-3 text-right tabular-nums">{l.matches}</td>
              <td className="px-2 py-3 text-right tabular-nums">{l.avgRating.toFixed(1)}</td>
              <td className="px-2 py-3 text-right tabular-nums">{l.goals}</td>
              <td className="px-2 py-3 text-right tabular-nums">{l.assists}</td>
              <td className={`px-4 py-3 text-right font-semibold tabular-nums ${i === 0 && l.matches >= MIN_MATCHES ? "text-gold" : ""}`}>
                {l.score.toFixed(1)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Board({
  title,
  unit,
  rows,
  value,
  decimals = 0,
}: {
  title: string;
  unit: string;
  rows: BoardEntry[];
  value: (m: BoardEntry) => number;
  decimals?: number;
}) {
  return (
    <div className="tile p-5">
      <p className="eyebrow">{title}</p>
      <p className="text-xs text-mute">{unit}</p>
      <ol className="mt-4 space-y-3">
        {rows.length === 0 && <li className="text-sm text-mute">—</li>}
        {rows.map((m, i) => (
          <li key={m.name} className="flex items-center gap-3">
            <span className={`w-4 text-sm font-semibold tabular-nums ${i === 0 ? "text-accent" : "text-mute"}`}>{i + 1}</span>
            <div className="min-w-0 flex-1">
              <WhoLink who={m.who} size="size-8 text-[10px]" />
            </div>
            <span className={`font-semibold tabular-nums ${i === 0 ? "text-accent" : ""}`}>{value(m).toFixed(decimals)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
