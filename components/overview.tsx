import { FormStrip, Reveal, Ticker, TiltCard, WinRing } from "./motion-primitives";
import { CurrentKitChip } from "./kit-showcase";
import { PlayFilled } from "./icons";
import { club, gotw, nextMatchday, potw, topAssist, topScorer, wpotw } from "@/lib/mock";

function Initials({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span className={`grid place-items-center rounded-full font-semibold ${className}`}>
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}

export function Overview() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-24 md:px-6 md:pb-36">
      <Reveal blur className="px-1 pb-10 md:pb-14">
        <p className="eyebrow">Club Overview</p>
        <h2 className="text-display mt-3 text-5xl md:text-7xl">
          The numbers
          <br />
          <span className="text-mute">don&apos;t lie.</span>
        </h2>
      </Reveal>

      <div className="grid grid-flow-dense grid-cols-2 gap-3 md:auto-rows-[200px] md:grid-cols-4 md:gap-4">
        {/* Season record */}
        <Reveal className="col-span-2 md:row-span-2">
          <TiltCard className="p-6 md:p-8">
            <img
              src="/brand/crest.png"
              alt=""
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-6 size-64 opacity-[0.06] md:size-80"
            />
            <div className="flex h-full flex-col justify-between gap-8">
              <div>
                <p className="eyebrow">Season record</p>
                <p className="mt-1 text-sm text-mute">
                  <Ticker value={club.matches} /> matches played
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Won", v: club.record.w, c: "text-accent" },
                  { label: "Drawn", v: club.record.d, c: "text-chalk" },
                  { label: "Lost", v: club.record.l, c: "text-mute" },
                ].map((s) => (
                  <div key={s.label}>
                    <Ticker
                      value={s.v}
                      className={`text-display block text-6xl transition-colors duration-700 md:text-8xl ${s.c}`}
                    />
                    <p className="mt-2 text-sm text-mute">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-8 border-t border-white/[0.08] pt-5 text-sm">
                <p>
                  <Ticker value={club.goalsFor} className="text-xl font-semibold" />
                  <span className="ml-2 text-mute">scored</span>
                </p>
                <p>
                  <Ticker value={club.goalsAgainst} className="text-xl font-semibold" />
                  <span className="ml-2 text-mute">conceded</span>
                </p>
              </div>
            </div>
          </TiltCard>
        </Reveal>

        {/* Win rate */}
        <Reveal delay={0.05} className="col-span-1">
          <TiltCard className="p-5">
            <div className="flex h-full flex-col items-center justify-center gap-3 py-2">
              <WinRing value={club.winRate} size={112} />
              <p className="eyebrow">Win rate</p>
            </div>
          </TiltCard>
        </Reveal>

        {/* Skill rating */}
        <Reveal delay={0.1} className="col-span-1">
          <TiltCard className="p-5">
            <div className="flex h-full flex-col justify-between gap-6">
              <p className="eyebrow">Skill rating</p>
              <div>
                <Ticker value={club.skillRating} className="text-display block text-5xl" />
                <p className="mt-2 text-sm text-accent transition-colors duration-700">{club.division}</p>
              </div>
            </div>
          </TiltCard>
        </Reveal>

        {/* Form */}
        <Reveal delay={0.05} className="col-span-2">
          <TiltCard className="p-5 md:p-6">
            <div className="flex h-full flex-col justify-between gap-6">
              <div className="flex items-baseline justify-between">
                <p className="eyebrow">Last 5</p>
                <p className="text-sm text-mute">
                  vs {club.lastMatch.opponent} <span className="font-semibold text-chalk">{club.lastMatch.score}</span>
                </p>
              </div>
              <FormStrip results={club.form} />
            </div>
          </TiltCard>
        </Reveal>

        {/* POTW */}
        <Reveal className="col-span-2 md:row-span-2">
          <TiltCard className="p-6 md:p-8 ring-1 ring-gold/25">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(80% 60% at 85% 0%, rgb(217 180 90 / 0.22), transparent 70%), radial-gradient(60% 50% at 0% 100%, rgb(217 180 90 / 0.08), transparent 70%)",
              }}
            />
            <div className="relative flex h-full flex-col justify-between gap-8">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gold">Player of the Week</p>
                <span className="rounded-full bg-gold/15 px-3 py-1 text-xs font-medium text-gold">
                  {potw.matches} matches
                </span>
              </div>
              <div className="flex items-end gap-5">
                <Initials
                  name={potw.name}
                  className="size-20 bg-linear-to-br from-gold to-[#8a6a22] text-2xl text-black md:size-24"
                />
                <div>
                  <p className="text-display text-5xl md:text-6xl">{potw.name}</p>
                  <p className="mt-2 text-sm text-mute">
                    #{potw.number} · {potw.position}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 border-t border-gold/15 pt-5">
                <div>
                  <Ticker value={potw.avgRating} decimals={1} className="text-3xl font-semibold text-gold" />
                  <p className="mt-1 text-xs text-mute">Avg rating</p>
                </div>
                <div>
                  <Ticker value={potw.goals} className="text-3xl font-semibold" />
                  <p className="mt-1 text-xs text-mute">Goals</p>
                </div>
                <div>
                  <Ticker value={potw.assists} className="text-3xl font-semibold" />
                  <p className="mt-1 text-xs text-mute">Assists</p>
                </div>
              </div>
            </div>
          </TiltCard>
        </Reveal>

        {/* Next matchday */}
        <Reveal delay={0.05} className="col-span-2">
          <TiltCard className="p-5 md:p-6">
            <div className="flex h-full items-center justify-between gap-4">
              <div className="flex h-full flex-col justify-between gap-5">
                <div>
                  <p className="eyebrow">Next matchday</p>
                  <p className="mt-1 text-2xl font-semibold tracking-tight">{nextMatchday.when}</p>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
                  <span className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-accent transition-colors duration-700" />
                    {nextMatchday.ready} Ready
                  </span>
                  <span className="flex items-center gap-2 text-mute">
                    <span className="size-2 rounded-full bg-gold" />
                    {nextMatchday.onTheWay} On the way
                  </span>
                  <span className="flex items-center gap-2 text-mute">
                    <span className="size-2 rounded-full bg-depleted" />
                    {nextMatchday.out} Out
                  </span>
                </div>
              </div>
              <CurrentKitChip />
            </div>
          </TiltCard>
        </Reveal>

        {/* Golden boot */}
        <Reveal delay={0.05} className="col-span-1">
          <TiltCard className="p-5">
            <div className="flex h-full flex-col justify-between gap-6">
              <p className="eyebrow">Golden Boot</p>
              <div>
                <Ticker value={topScorer.goals} className="text-display block text-5xl" />
                <p className="mt-2 text-sm text-mute">
                  goals · <span className="text-chalk">{topScorer.name}</span>
                </p>
              </div>
            </div>
          </TiltCard>
        </Reveal>

        {/* Playmaker */}
        <Reveal delay={0.1} className="col-span-1">
          <TiltCard className="p-5">
            <div className="flex h-full flex-col justify-between gap-6">
              <p className="eyebrow">Playmaker</p>
              <div>
                <Ticker value={topAssist.assists} className="text-display block text-5xl" />
                <p className="mt-2 text-sm text-mute">
                  assists · <span className="text-chalk">{topAssist.name}</span>
                </p>
              </div>
            </div>
          </TiltCard>
        </Reveal>

        {/* GOTW clip */}
        <Reveal className="col-span-2">
          <TiltCard className="p-0">
            <div className="flex h-full min-h-[180px] flex-col justify-end">
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(70% 90% at 75% 20%, color-mix(in oklab, var(--accent-2) 60%, transparent), transparent 70%), linear-gradient(160deg, #07072e, #000 70%)",
                }}
              />
              <div className="glass hairline absolute right-5 top-5 grid size-12 place-items-center rounded-full">
                <PlayFilled className="ml-0.5 size-5" />
              </div>
              <div className="relative p-5 md:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent transition-colors duration-700">
                  Goal of the Week
                </p>
                <p className="mt-1 text-xl font-semibold tracking-tight">{gotw.title}</p>
                <p className="mt-1 text-sm text-mute">
                  {gotw.player} · {gotw.votes} votes
                </p>
              </div>
            </div>
          </TiltCard>
        </Reveal>

        {/* WPOTW */}
        <Reveal delay={0.05} className="col-span-1">
          <TiltCard className="p-5 ring-1 ring-depleted/20">
            <div className="flex h-full flex-col justify-between gap-6">
              <p className="text-[13px] font-semibold text-depleted">Stamina depleted</p>
              <div>
                <p className="text-3xl font-semibold tracking-tight">{wpotw.name}</p>
                <p className="mt-1 text-sm text-mute">
                  <Ticker value={wpotw.avgRating} decimals={1} className="text-chalk" /> avg · Worst of the Week
                </p>
              </div>
            </div>
          </TiltCard>
        </Reveal>

        {/* Sync status */}
        <Reveal delay={0.1} className="col-span-1">
          <TiltCard className="p-5" glow={false}>
            <div className="flex h-full flex-col justify-between gap-6">
              <p className="eyebrow">EA sync</p>
              <div>
                <p className="flex items-center gap-2 text-sm font-medium">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full rounded-full bg-gold opacity-60 motion-safe:animate-ping" />
                    <span className="relative inline-flex size-2 rounded-full bg-gold" />
                  </span>
                  Demo data
                </p>
                <p className="mt-1 text-sm text-mute">Live stats from EA are coming soon.</p>
              </div>
            </div>
          </TiltCard>
        </Reveal>
      </div>
    </section>
  );
}
