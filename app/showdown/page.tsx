import type { Metadata } from "next";
import Link from "next/link";
import { ClipCard, ClipPlayer } from "@/components/clip-card";
import { Reveal } from "@/components/motion-primitives";
import { SubmitClip } from "@/components/submit-clip";
import { weekClips, windowState, winners, type Category } from "@/lib/clips";
import { listPlayers } from "@/lib/players";
import { currentPlayer } from "@/lib/session";

export const metadata: Metadata = { title: "Showdown" };

export default async function ShowdownPage({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const cat: Category = (await searchParams).cat === "notw" ? "notw" : "gotw";
  const gotw = cat === "gotw";
  const w = windowState();
  const me = await currentPlayer();
  const [list, voting, players, lastGotw, lastNotw] = await Promise.all([
    weekClips(w.key, cat, me?.id ?? null),
    w.votingKey ? weekClips(w.votingKey, cat, me?.id ?? null) : Promise.resolve([]),
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
        <ArchiveButton href="/showdown/hall-of-fame" tone="fame" title="Hall of Fame" sub="Every Goal of the Week" />
        <ArchiveButton href="/showdown/wall-of-shame" tone="shame" title="Wall of Shame" sub="Every Nyunda of the Week" />
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
                  <ClipPlayer provider={x.w.provider} embedId={x.w.embedId} tone={x.tone} />
                  <div className="px-2 pb-1 pt-3">
                    <p className={`text-sm font-semibold ${x.tone === "gotw" ? "text-gold" : "text-depleted"}`}>{x.title}</p>
                    {x.w.caption && <p className="mt-1 font-semibold">“{x.w.caption}”</p>}
                    <p className="mt-1 text-sm text-mute">
                      {x.w.featuring?.name ?? x.w.submitter.name} · {x.w.votes} votes
                    </p>
                  </div>
                </div>
              ),
          )}
        </div>
      )}

      {/* Category switch */}
      <div className="glass hairline mt-12 inline-flex rounded-full p-1.5">
        <Link href="/showdown" className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${gotw ? "bg-accent text-on-accent" : "text-mute hover:text-chalk"}`}>
          Goal of the Week
        </Link>
        <Link
          href="/showdown?cat=notw"
          className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${!gotw ? "bg-depleted text-white" : "text-mute hover:text-chalk"}`}
        >
          Nyunda of the Week
        </Link>
      </div>

      {/* Monday: voting on last week's clips */}
      {w.votingKey && (
        <div className="mt-10">
          <div className={`tile mb-5 p-5 ${gotw ? "ring-1 ring-accent/30" : "ring-1 ring-depleted/30"}`}>
            <p className={`text-sm font-semibold ${gotw ? "text-accent" : "text-depleted"}`}>Voting is open — today only</p>
            <p className="mt-1 text-xl font-semibold tracking-tight">Pick last week&apos;s best {gotw ? "goal" : "nyunda"} · {w.votingLabel}</p>
            <p className="mt-1 text-sm text-mute">{me ? "One vote per category. You can change it until 23:59 WIB." : "Log in to vote."}</p>
          </div>
          {voting.length === 0 ? (
            <div className="tile p-8 text-center text-mute">Nothing was submitted last week.</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {voting.map((c) => (
                <ClipCard key={c.id} clip={c} category={cat} meId={me?.id ?? null} isAdmin={me?.role === "admin"} votingOpen />
              ))}
            </div>
          )}
        </div>
      )}

      {/* This week's submissions */}
      <div className="mt-12">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3 px-1">
          <div>
            <p className="eyebrow">This week · {w.label}</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">{gotw ? "Worldies so far" : "Nyunda moments so far"}</h2>
            <p className="mt-1 text-sm text-mute">Voting for these opens next Monday.</p>
          </div>
        </div>
        <div className="mb-6">
          {me ? (
            <SubmitClip key={cat} category={cat} players={players.map((p) => ({ id: p.id, name: p.display_name, number: p.jersey_number }))} />
          ) : (
            <p className="text-sm text-mute">
              <Link href="/login" className="font-semibold text-accent">
                Log in
              </Link>{" "}
              to submit clips and vote.
            </p>
          )}
        </div>
        {list.length === 0 ? (
          <div className="tile p-8 text-center text-mute">
            {gotw ? "No worldies submitted yet this week." : "No nyunda moments yet this week. Suspicious."}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {list.map((c) => (
              <ClipCard key={c.id} clip={c} category={cat} meId={me?.id ?? null} isAdmin={me?.role === "admin"} votingOpen={false} removable />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ArchiveButton({ href, tone, title, sub }: { href: string; tone: "fame" | "shame"; title: string; sub: string }) {
  const fame = tone === "fame";
  return (
    <Link
      href={href}
      className={`group tile flex items-center gap-3 p-4 transition hover:-translate-y-0.5 active:scale-[0.98] ${
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
      <span className={`relative grid size-11 shrink-0 place-items-center rounded-full ${fame ? "bg-gold/15 text-gold" : "bg-depleted/15 text-depleted"}`}>
        {fame ? (
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" />
            <path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3a8 8 0 0 0-5 14.2V20a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-2.8A8 8 0 0 0 12 3z" />
            <circle cx="9" cy="11" r="1.5" fill="currentColor" />
            <circle cx="15" cy="11" r="1.5" fill="currentColor" />
            <path d="M10 21v-2M14 21v-2" />
          </svg>
        )}
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        <span className="block truncate text-xs text-mute">{sub}</span>
      </span>
      <svg viewBox="0 0 24 24" className={`relative size-5 shrink-0 transition group-hover:translate-x-1 ${fame ? "text-gold" : "text-depleted"}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="m9 6 6 6-6 6" />
      </svg>
    </Link>
  );
}
