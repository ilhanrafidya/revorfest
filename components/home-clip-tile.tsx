"use client";

import Link from "next/link";
import { useState } from "react";
import { PlayFilled } from "./icons";
import { embedUrl, thumbUrl } from "@/lib/clip-url";

/** Home "Goal of the Week": the winning clip's thumbnail as the backdrop; ▶ plays it right in the card, the rest opens Showdown. */
export function HomeClipTile({
  provider,
  embedId,
  url,
  title,
  sub,
}: {
  provider: string;
  embedId: string;
  url: string;
  title: string;
  sub: string;
}) {
  const [playing, setPlaying] = useState(false);
  const thumb = thumbUrl(provider, embedId);
  const playable = provider === "upload" ? !!url : true;

  return (
    <div className="tile relative h-full min-h-[200px] overflow-hidden">
      {playing ? (
        provider === "upload" ? (
          <video src={url} poster={thumb ?? undefined} className="fade-up-in absolute inset-0 size-full bg-black object-contain" autoPlay playsInline controls />
        ) : (
          <iframe
            src={embedUrl(provider, embedId)}
            className="fade-up-in absolute inset-0 size-full"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            title="Goal of the Week"
          />
        )
      ) : (
        <>
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt="" className="ken-burns pointer-events-none absolute inset-0 size-full object-cover" />
          ) : (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ background: "radial-gradient(70% 90% at 75% 20%, color-mix(in oklab, var(--accent-2) 60%, transparent), transparent 70%), linear-gradient(160deg, #07072e, #000 70%)" }}
            />
          )}
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/10" />
          <Link href="/showdown" className="absolute inset-0" aria-label="Open Showdown" />
          {playable && (
            <button
              type="button"
              onClick={() => setPlaying(true)}
              aria-label="Play Goal of the Week"
              className="soft-ping glass hairline absolute right-5 top-5 z-10 grid size-12 place-items-center rounded-full transition hover:scale-105 active:scale-95"
            >
              <PlayFilled className="size-5" />
            </button>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 p-5 md:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Goal of the Week</p>
            <p className="mt-1 truncate text-xl font-semibold tracking-tight">{title}</p>
            <p className="mt-1 text-sm text-white/70">{sub}</p>
          </div>
        </>
      )}
    </div>
  );
}
