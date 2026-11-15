"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { removeClip, voteClip } from "@/app/actions/showdown";
import { PROVIDER_LABEL, embedUrl, thumbUrl } from "@/lib/clip-url";
import { PlayFilled } from "./icons";
import { PlayerAvatar } from "./player-avatar";

export type ClipCardData = {
  id: string;
  provider: string;
  embedId: string;
  url: string;
  caption: string | null;
  submitter: { id: string; name: string; slug: string; avatar: string | null };
  featuring: { name: string; slug: string } | null;
  votes: number | null;
  myVote: boolean;
};

/** Lightweight facade: shows a thumbnail and only loads the heavy embed on tap. */
export function ClipPlayer({ provider, embedId, tone = "gotw" }: { provider: string; embedId: string; tone?: "gotw" | "notw" }) {
  const [playing, setPlaying] = useState(false);
  const thumb = thumbUrl(provider, embedId);
  const tall = provider === "tiktok";
  return (
    <div className={`relative w-full overflow-hidden rounded-2xl bg-black ${tall ? "aspect-[9/16] max-h-[560px]" : "aspect-video"}`}>
      {playing ? (
        <iframe
          src={embedUrl(provider, embedId)}
          className="absolute inset-0 size-full"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          title="Clip"
        />
      ) : (
        <button type="button" onClick={() => setPlaying(true)} className="group absolute inset-0 grid place-items-center" aria-label="Play clip">
          {thumb ? (
            <img src={thumb} alt="" className="absolute inset-0 size-full object-cover opacity-80 transition group-hover:opacity-100" />
          ) : (
            <span
              className="absolute inset-0"
              style={{
                background:
                  tone === "gotw"
                    ? "radial-gradient(70% 90% at 70% 20%, color-mix(in oklab, var(--accent-2) 60%, transparent), transparent 70%), linear-gradient(160deg, #07072e, #000 70%)"
                    : "radial-gradient(70% 90% at 70% 20%, rgb(255 69 58 / 0.35), transparent 70%), linear-gradient(160deg, #1a0606, #000 70%)",
              }}
            />
          )}
          <span className="glass hairline relative grid size-16 place-items-center rounded-full transition group-hover:scale-110 group-active:scale-95">
            <PlayFilled className="ml-1 size-7" />
          </span>
          <span className="absolute bottom-3 left-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold">{PROVIDER_LABEL[provider] ?? provider}</span>
        </button>
      )}
    </div>
  );
}

export function ClipCard({
  clip,
  category,
  meId,
  isAdmin,
  votingOpen,
  removable = false,
}: {
  clip: ClipCardData;
  category: "gotw" | "notw";
  meId: string | null;
  isAdmin: boolean;
  votingOpen: boolean;
  removable?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const own = meId === clip.submitter.id;
  const accent = category === "gotw" ? "bg-accent text-on-accent" : "bg-depleted text-white";

  return (
    <div className={`tile p-3 ${clip.myVote ? (category === "gotw" ? "ring-2 ring-accent/60" : "ring-2 ring-depleted/60") : ""}`}>
      <ClipPlayer provider={clip.provider} embedId={clip.embedId} tone={category} />
      <div className="px-2 pb-1 pt-4">
        {clip.caption && <p className="text-lg font-semibold leading-snug tracking-tight">“{clip.caption}”</p>}
        <div className="mt-3 flex items-center gap-2 text-sm text-mute">
          <PlayerAvatar name={clip.submitter.name} src={clip.submitter.avatar} className="size-6 text-[9px]" />
          <span>
            by{" "}
            <Link href={`/squad/${clip.submitter.slug}`} className="text-chalk hover:text-accent">
              {clip.submitter.name}
            </Link>
            {clip.featuring && (
              <>
                {" "}
                · starring{" "}
                <Link href={`/squad/${clip.featuring.slug}`} className="text-chalk hover:text-accent">
                  {clip.featuring.name}
                </Link>
              </>
            )}
          </span>
        </div>
        <div className="mt-4 flex items-center gap-2">
          {votingOpen && meId && !own && (
            <button
              type="button"
              disabled={pending || clip.myVote}
              onClick={() =>
                startTransition(async () => {
                  const res = await voteClip(clip.id);
                  setError(res.ok ? null : res.error);
                })
              }
              className={`rounded-full px-5 py-2.5 text-sm font-semibold transition active:scale-95 ${clip.myVote ? accent : "bg-white/[0.08] hover:bg-white/[0.14]"}`}
            >
              {clip.myVote ? "Your vote ✓" : pending ? "Voting…" : "Vote"}
            </button>
          )}
          {own && <span className="text-xs text-mute">Your clip</span>}
          {clip.votes != null && <span className="text-sm font-semibold tabular-nums">{clip.votes} votes</span>}
          {(isAdmin || (own && removable)) && (
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(async () => void (await removeClip(clip.id)))}
              className="ml-auto text-xs text-mute hover:text-depleted"
            >
              Remove
            </button>
          )}
        </div>
        {error && <p className="mt-2 text-xs text-depleted">{error}</p>}
      </div>
    </div>
  );
}
