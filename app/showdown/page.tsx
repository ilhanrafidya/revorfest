import type { Metadata } from "next";
import Link from "next/link";
import { ClipPlayer } from "@/components/clip-card";
import { ShowdownTabs } from "@/components/showdown-tabs";
import { Reveal } from "@/components/motion-primitives";
import { ShareButton } from "@/components/share-button";
import { weekClips, windowState, winners, type Category } from "@/lib/clips";
import { listPlayers } from "@/lib/players";
import { currentPlayer } from "@/lib/session";

export const metadata: Metadata = { title: "Showdown" };

export default async function ShowdownPage({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const cat: Category = (await searchParams).cat === "notw" ? "notw" : "gotw";
  const w = windowState();
  const me = await currentPlayer();
  const meId = me?.id ?? null;
  const [gList, nList, gVote, nVote, players, lastGotw, lastNotw] = await Promise.all([
    weekClips(w.key, "gotw", meId),
    weekClips(w.key, "notw", meId),
    w.votingKey ? weekClips(w.votingKey, "gotw", meId) : Promise.resolve([]),
    w.votingKey ? weekClips(w.votingKey, "notw", meId) : Promise.resolve([]),
    listPlayers(),
    winners("gotw", 1),
    winners("notw", 1),
  ]);

  return (
    <section className="mx-auto max-w-6xl px-4 pb-40 pt-24 md:px-6 md:pt-32">
      <Reveal blur className="px-1">
        <p className="eyebrow">Showdown · {w.label}</p>
        <h1 className="text-display mt-3 text-5xl md:text-7xl">
          Goal of the Week.
          <br />
          <span className="text-gradient">Nyunda of the Week.</span>
        </h1>
        <p className="mt-4 max-w-xl text-mute">
          Drop clips all week, Monday to Sunday 23:59. Voting is every <span className="font-semibold text-chalk">Monday</span>, all day —
          one vote per category, tallies hidden. Winners are revealed Tuesday.
        </p>
      </Reveal>

      {/* Archive buttons */}
      <div className="mt-8 grid grid-cols-2 gap-3 md:max-w-xl">
        <ArchiveButton href="/showdown/hall-of-fame" tone="fame" title="Hall of Fame" sub="Best goals" />
        <ArchiveButton href="/showdown/wall-of-shame" tone="shame" title="Wall of Shame" sub="Biggest blunders" />
      </div>

      {/* Last winners */}
      {(lastGotw[0] || lastNotw[0]) && (
        <div className="mt-10 grid gap-3 md:grid-cols-2 md:gap-4">
          {[
            { w: lastGotw[0], title: "Last Goal of the Week", tone: "gotw" as const, cls: "ring-1 ring-gold/25" },
            { w: lastNotw[0], title: "Last Nyunda of the Week", tone: "notw" as const, cls: "ring-1 ring-depleted/25" },
          ].map(
            (x) =>
              x.w && (
                <div key={x.title} className={`tile p-3 ${x.cls}`}>
                  <ClipPlayer provider={x.w.provider} embedId={x.w.embedId} url={x.w.url} tone={x.tone} />
                  <div className="px-2 pb-1 pt-3">
                    <p className={`text-sm font-semibold ${x.tone === "gotw" ? "text-gold" : "text-depleted"}`}>{x.title}</p>
                    {x.w.caption && <p className="mt-1 font-semibold">“{x.w.caption}”</p>}
                    <p className="mt-1 text-sm text-mute">
                      {x.w.featuring?.name ?? x.w.submitter.name} · {x.w.votes} votes
                    </p>
                    <ShareButton
                      url={`/share/showdown?cat=${x.tone}&week=${x.w.weekKey}`}
                      filename={`revorfest-${x.tone}-${x.w.weekKey}.png`}
                      title={x.title}
                      className={`mt-3 ${x.tone === "gotw" ? "bg-gold/15 text-gold" : "bg-depleted/15 text-depleted"}`}
                    />
                  </div>
                </div>
              ),
          )}
        </div>
      )}

      <ShowdownTabs
        initial={cat}
        data={{ gotw: { voting: gVote, list: gList }, notw: { voting: nVote, list: nList } }}
        week={w.label}
        voting={w.votingLabel}
        me={me ? { id: me.id, admin: me.role === "admin" } : null}
        players={players.map((p) => ({ id: p.id, name: p.display_name, number: p.jersey_number }))}
      />
    </section>
  );
}

function ArchiveButton({ href, tone, title, sub }: { href: string; tone: "fame" | "shame"; title: string; sub: string }) {
  const fame = tone === "fame";
  return (
    <Link
      href={href}
      className={`group tile flex flex-col gap-3 p-4 transition hover:-translate-y-0.5 active:scale-[0.97] sm:flex-row sm:items-center ${
        fame ? "ring-1 ring-gold/30 hover:ring-gold/60" : "ring-1 ring-depleted/30 hover:ring-depleted/60"
      }`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: fame
            ? "radial-gradient(90% 90% at 0% 0%, rgb(221 177 104 / 0.18), transparent 70%)"
            : "radial-gradient(90% 90% at 0% 0%, rgb(255 69 58 / 0.16), transparent 70%)",
        }}
      />
      <span className="relative flex items-center justify-between sm:contents">
        <span className={`grid size-10 shrink-0 place-items-center rounded-full ${fame ? "bg-gold/15 text-gold" : "bg-depleted/15 text-depleted"}`}>
          {fame ? (
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" />
              <path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3a8 8 0 0 0-5 14.2V20a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-2.8A8 8 0 0 0 12 3z" />
              <circle cx="9" cy="11" r="1.5" fill="currentColor" />
              <circle cx="15" cy="11" r="1.5" fill="currentColor" />
              <path d="M10 21v-2M14 21v-2" />
            </svg>
          )}
        </span>
        <svg
          viewBox="0 0 24 24"
          className={`size-5 shrink-0 transition group-hover:translate-x-1 sm:order-last ${fame ? "text-gold" : "text-depleted"}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="m9 6 6 6-6 6" />
        </svg>
      </span>
      <span className="relative min-w-0 sm:flex-1">
        <span className="block whitespace-nowrap text-[15px] font-semibold">{title}</span>
        <span className="block whitespace-nowrap text-xs text-mute">{sub}</span>
      </span>
    </Link>
  );
}
