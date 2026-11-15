import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Reveal } from "@/components/motion-primitives";
import { PlayerAvatar } from "@/components/player-avatar";
import { avatarUrl, getPlayerBySlug } from "@/lib/players";
import { currentPlayer } from "@/lib/session";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await getPlayerBySlug((await params).slug);
  return { title: p ? p.display_name : "Player" };
}

export default async function PlayerPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ welcome?: string }>;
}) {
  const [{ slug }, { welcome }] = await Promise.all([params, searchParams]);
  const [p, me] = await Promise.all([getPlayerBySlug(slug), currentPlayer()]);
  if (!p) notFound();
  const isMe = me?.id === p.id;
  const joined = new Date(p.created_at).toLocaleDateString("en-GB", { month: "short", year: "numeric" });

  return (
    <section className="relative mx-auto max-w-5xl px-4 pb-40 pt-24 md:px-6 md:pt-32">
      <span
        aria-hidden
        className="text-display pointer-events-none absolute right-0 top-10 select-none text-[14rem] leading-none text-white/[0.04] md:text-[22rem]"
      >
        {p.jersey_number}
      </span>

      {welcome && isMe && (
        <Reveal className="mb-8">
          <p className="rounded-2xl bg-accent/10 px-5 py-4 text-sm text-accent">
            Welcome to Revorfest, {p.display_name}. You&apos;re officially on the roster.
          </p>
        </Reveal>
      )}

      <Reveal blur className="relative flex flex-col items-start gap-6 md:flex-row md:items-end">
        <PlayerAvatar name={p.display_name} src={avatarUrl(p)} className="size-32 text-4xl md:size-40" />
        <div>
          <p className="eyebrow">
            #{p.jersey_number} · {p.primary_position}
          </p>
          <h1 className="text-display mt-2 text-5xl md:text-7xl">{p.display_name}</h1>
          <p className="mt-3 text-mute">
            EA ID <span className="font-medium text-chalk">{p.ea_gamertag}</span> · Joined {joined}
          </p>
        </div>
      </Reveal>

      <Reveal delay={0.1} className="relative mt-8 flex flex-wrap gap-2">
        <span className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-on-accent">{p.primary_position}</span>
        {p.secondary_positions.map((s) => (
          <span key={s} className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold">
            {s}
          </span>
        ))}
        {p.role !== "player" && (
          <span className="rounded-full bg-gold/15 px-4 py-2 text-sm font-semibold capitalize text-gold">{p.role}</span>
        )}
      </Reveal>

      <div className="relative mt-12 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {["Matches", "Goals", "Assists", "Avg rating"].map((label, i) => (
          <Reveal key={label} delay={0.05 * i}>
            <div className="tile p-5">
              <p className="eyebrow">{label}</p>
              <p className="text-display mt-6 text-5xl text-mute/40">—</p>
            </div>
          </Reveal>
        ))}
      </div>
      <p className="relative mt-4 text-sm text-mute">Stats sync from EA in Phase 3.</p>

      {isMe && (
        <Reveal className="relative mt-10 flex gap-3">
          <Link href="/me" className="glass hairline rounded-full px-5 py-3 text-sm font-semibold">
            Edit profile
          </Link>
          {me?.role === "admin" && (
            <Link href="/admin" className="rounded-full bg-gold/15 px-5 py-3 text-sm font-semibold text-gold">
              Admin panel
            </Link>
          )}
        </Reveal>
      )}
    </section>
  );
}
