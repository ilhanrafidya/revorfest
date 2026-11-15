import Link from "next/link";
import { BackLink } from "./back-link";
import { ShareButton } from "./share-button";
import { ClipPlayer } from "./clip-card";
import { Reveal } from "./motion-primitives";
import type { Winner } from "@/lib/clips";

export function ClipArchive({ kind, items }: { kind: "gotw" | "notw"; items: Winner[] }) {
  const fame = kind === "gotw";
  return (
    <section className="mx-auto max-w-6xl px-4 pb-40 pt-24 md:px-6 md:pt-32">
      <BackLink href={fame ? "/showdown" : "/showdown?cat=notw"} label="Showdown" />
      <Reveal blur className="px-1 md:mt-6">
        <p className={`text-sm font-semibold ${fame ? "text-gold" : "text-depleted"}`}>{fame ? "Goal of the Week winners" : "Nyunda of the Week winners"}</p>
        <h1 className="text-display mt-3 text-5xl md:text-7xl">{fame ? "Hall of Fame." : "Wall of Shame."}</h1>
      </Reveal>
      {items.length === 0 ? (
        <div className="tile mt-10 p-8 text-center text-mute">No winners yet — the first one is crowned after Monday’s vote.</div>
      ) : (
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((w, i) => (
            <Reveal key={w.id} delay={Math.min(i * 0.05, 0.3)}>
              <div className={`tile p-3 ${fame ? "ring-1 ring-gold/20" : "ring-1 ring-depleted/20"}`}>
                <ClipPlayer provider={w.provider} embedId={w.embedId} url={w.url} tone={kind} />
                <div className="px-2 pb-1 pt-3">
                  <p className="eyebrow">{w.weekLabel}</p>
                  {w.caption && <p className="mt-1 text-lg font-semibold">“{w.caption}”</p>}
                  <p className="mt-1 text-sm text-mute">
                    {w.featuring ? (
                      <Link href={`/squad/${w.featuring.slug}`} className="text-chalk">
                        {w.featuring.name}
                      </Link>
                    ) : (
                      <span className="text-chalk">{w.submitter.name}</span>
                    )}{" "}
                    · {w.votes} votes
                  </p>
                  <ShareButton
                    url={`/share/showdown?cat=${kind}&week=${w.weekKey}`}
                    filename={`revorfest-${kind}-${w.weekKey}.png`}
                    title={fame ? "Revorfest Goal of the Week" : "Revorfest Nyunda of the Week"}
                    className={`mt-3 ${fame ? "bg-gold/15 text-gold" : "bg-depleted/15 text-depleted"}`}
                  />
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      )}
    </section>
  );
}
