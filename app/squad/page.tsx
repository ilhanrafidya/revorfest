import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/motion-primitives";
import { PlayerAvatar } from "@/components/player-avatar";
import { avatarUrl, listPlayers } from "@/lib/players";
import { currentPlayer } from "@/lib/session";

export const metadata: Metadata = { title: "Squad" };

const ROLE_LABEL = { admin: "Admin", captain: "Captain", player: null } as const;

export default async function SquadPage() {
  const [players, me] = await Promise.all([listPlayers(), currentPlayer()]);

  return (
    <section className="mx-auto max-w-6xl px-4 pb-40 pt-24 md:px-6 md:pt-32">
      <Reveal blur className="flex flex-col gap-6 px-1 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">Squad</p>
          <h1 className="text-display mt-3 text-5xl md:text-7xl">
            The roster.
            <br />
            <span className="text-gradient">{players.length} strong.</span>
          </h1>
        </div>
        {!me && (
          <div className="flex gap-3">
            <Link href="/login" className="glass hairline rounded-full px-5 py-3 text-sm font-semibold">
              Log in
            </Link>
            <Link href="/join" className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-on-accent">
              Join the squad
            </Link>
          </div>
        )}
      </Reveal>

      {players.length === 0 ? (
        <p className="mt-16 text-center text-mute">No one has signed up yet.</p>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 md:mt-14 md:gap-4 lg:grid-cols-4">
          {players.map((p, i) => (
            <Reveal key={p.id} delay={Math.min(i * 0.04, 0.4)}>
              <Link
                href={`/squad/${p.slug}`}
                className={`tile group block h-full p-4 transition hover:border-white/20 active:scale-[0.98] md:p-5 ${
                  me?.id === p.id ? "ring-1 ring-accent/40" : ""
                }`}
              >
                <span
                  aria-hidden
                  className="text-display pointer-events-none absolute -right-2 -top-3 text-[6.5rem] text-white/[0.05] transition group-hover:text-accent/15 md:text-[8rem]"
                >
                  {p.jersey_number}
                </span>
                <div className="relative flex h-full flex-col gap-4">
                  <PlayerAvatar name={p.display_name} src={avatarUrl(p)} className="size-16 text-lg md:size-20" />
                  <div className="mt-auto">
                    <p className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold tabular-nums text-accent">#{p.jersey_number}</span>
                      {ROLE_LABEL[p.role] && (
                        <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-semibold text-gold">
                          {ROLE_LABEL[p.role]}
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 truncate text-lg font-semibold tracking-tight">{p.display_name}</p>
                    <p className="mt-1 truncate text-xs text-mute">
                      {[p.primary_position, ...p.secondary_positions].join(" · ")}
                    </p>
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      )}
    </section>
  );
}
