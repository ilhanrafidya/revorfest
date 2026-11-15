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
  const w = windowState();
  const me = await currentPlayer();
  const [list, players, lastGotw, lastNotw] = await Promise.all([
    weekClips(w.key, cat, me?.id ?? null),
    listPlayers(),
    winners("gotw", 1),
    winners("notw", 1),
  ]);
  const gotw = cat === "gotw";

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
          Drop clips Monday–Saturday. Vote once per category until Sunday night — tallies stay hidden until the week ends. Winners go to the
          Hall of Fame (or the Wall of Shame).
        </p>
      </Reveal>

      {/* Last week's winners */}
      {(lastGotw[0] || lastNotw[0]) && (
        <div className="mt-10 grid gap-3 md:grid-cols-2 md:gap-4">
          {[
            { w: lastGotw[0], title: "Last Goal of the Week", tone: "gotw" as const, href: "/showdown/hall-of-fame", cls: "ring-1 ring-gold/25" },
            { w: lastNotw[0], title: "Last Nyunda of the Week", tone: "notw" as const, href: "/showdown/wall-of-shame", cls: "ring-1 ring-depleted/25" },
          ].map(
            (x) =>
              x.w && (
                <div key={x.title} className={`tile p-3 ${x.cls}`}>
                  <ClipPlayer provider={x.w.provider} embedId={x.w.embedId} tone={x.tone} />
                  <div className="px-2 pb-1 pt-3">
                    <p className={`text-sm font-semibold ${x.tone === "gotw" ? "text-gold" : "text-depleted"}`}>{x.title}</p>
                    {x.w.caption && <p className="mt-1 font-semibold">“{x.w.caption}”</p>}
                    <p className="mt-1 text-sm text-mute">
                      {x.w.featuring?.name ?? x.w.submitter.name} · {x.w.votes} votes ·{" "}
                      <Link href={x.href} className="text-chalk hover:text-accent">
                        See all →
                      </Link>
                    </p>
                  </div>
                </div>
              ),
          )}
        </div>
      )}

      {/* Category switch */}
      <div className="mt-12 flex flex-wrap items-center gap-3">
        <div className="glass hairline inline-flex rounded-full p-1.5">
          <Link
            href="/showdown"
            className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${gotw ? "bg-accent text-on-accent" : "text-mute hover:text-chalk"}`}
          >
            Goal of the Week
          </Link>
          <Link
            href="/showdown?cat=notw"
            className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${!gotw ? "bg-depleted text-white" : "text-mute hover:text-chalk"}`}
          >
            Nyunda of the Week
          </Link>
        </div>
        <div className="ml-auto flex gap-4 text-sm">
          <Link href="/showdown/hall-of-fame" className="font-semibold text-gold">
            Hall of Fame
          </Link>
          <Link href="/showdown/wall-of-shame" className="font-semibold text-depleted">
            Wall of Shame
          </Link>
        </div>
      </div>

      <div className="mt-6">
        {me ? (
          w.submissionsOpen ? (
            <SubmitClip key={cat} category={cat} players={players.map((p) => ({ id: p.id, name: p.display_name, number: p.jersey_number }))} />
          ) : (
            <p className="text-sm text-mute">Submissions are closed — it&apos;s voting Sunday.</p>
          )
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
        <div className="tile mt-6 p-8 text-center text-mute">
          {gotw ? "No worldies submitted yet this week." : "No nyunda moments yet this week. Suspicious."}
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => (
            <ClipCard key={c.id} clip={c} category={cat} meId={me?.id ?? null} isAdmin={me?.role === "admin"} votingOpen={w.votingOpen} />
          ))}
        </div>
      )}
    </section>
  );
}
