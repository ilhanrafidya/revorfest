"use client";

import { AnimatePresence, m } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { ClipCard, type ClipCardData } from "./clip-card";
import { SubmitClip } from "./submit-clip";
import { EASE, SPRING_SNAPPY } from "@/lib/motion";

type Cat = "gotw" | "notw";
type Lists = Record<Cat, { voting: ClipCardData[]; list: ClipCardData[] }>;

export function ShowdownTabs({
  initial,
  data,
  week,
  voting,
  me,
  players,
}: {
  initial: Cat;
  data: Lists;
  week: string;
  voting: string | null;
  me: { id: string; admin: boolean } | null;
  players: { id: string; name: string; number: number }[];
}) {
  const [cat, setCat] = useState<Cat>(initial);
  const gotw = cat === "gotw";
  const { voting: votingList, list } = data[cat];

  function pick(next: Cat) {
    setCat(next);
    // keep the URL shareable without a navigation (no jump to top)
    const url = next === "notw" ? "/showdown?cat=notw" : "/showdown";
    window.history.replaceState(null, "", url);
  }

  return (
    <>
      <div className="glass hairline mt-12 inline-flex rounded-full p-1.5">
        {(["gotw", "notw"] as const).map((c) => {
          const active = cat === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => pick(c)}
              className={`relative rounded-full px-4 py-2.5 text-sm font-semibold transition-colors sm:px-5 ${
                active ? (c === "gotw" ? "text-on-accent" : "text-white") : "text-mute hover:text-chalk"
              }`}
            >
              {active && (
                <m.span
                  layoutId="showdown-tab"
                  transition={SPRING_SNAPPY}
                  className={`absolute inset-0 rounded-full ${c === "gotw" ? "bg-accent" : "bg-depleted"}`}
                />
              )}
              <span className="relative">{c === "gotw" ? "Goal of the Week" : "Nyunda of the Week"}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <m.div
          key={cat}
          initial={{ opacity: 0, x: gotw ? -24 : 24, filter: "blur(6px)" }}
          animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, x: gotw ? 24 : -24, filter: "blur(6px)" }}
          transition={{ duration: 0.35, ease: EASE }}
        >
          {voting && (
            <div className="mt-10">
              <div className={`tile mb-5 p-5 ${gotw ? "ring-1 ring-accent/30" : "ring-1 ring-depleted/30"}`}>
                <p className={`text-sm font-semibold ${gotw ? "text-accent" : "text-depleted"}`}>Voting is open — today only</p>
                <p className="mt-1 text-xl font-semibold tracking-tight">
                  Pick last week&apos;s best {gotw ? "goal" : "nyunda"} · {voting}
                </p>
                <p className="mt-1 text-sm text-mute">{me ? "One vote per category. You can change it until 23:59 WIB." : "Log in to vote."}</p>
              </div>
              {votingList.length === 0 ? (
                <div className="tile p-8 text-center text-mute">Nothing was submitted last week.</div>
              ) : (
                <ClipGrid items={votingList} cat={cat} me={me} votingOpen removable={false} />
              )}
            </div>
          )}

          <div className="mt-12">
            <div className="mb-5 px-1">
              <p className="eyebrow">This week · {week}</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">{gotw ? "Worldies so far" : "Nyunda moments so far"}</h2>
              <p className="mt-1 text-sm text-mute">Voting for these opens next Monday.</p>
            </div>
            <div className="mb-6">
              {me ? (
                <SubmitClip key={cat} category={cat} players={players} />
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
              <ClipGrid items={list} cat={cat} me={me} votingOpen={false} removable />
            )}
          </div>
        </m.div>
      </AnimatePresence>
    </>
  );
}

function ClipGrid({
  items,
  cat,
  me,
  votingOpen,
  removable,
}: {
  items: ClipCardData[];
  cat: Cat;
  me: { id: string; admin: boolean } | null;
  votingOpen: boolean;
  removable: boolean;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map((c, i) => (
        <m.div
          key={c.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: Math.min(i * 0.06, 0.36) }}
        >
          <ClipCard clip={c} category={cat} meId={me?.id ?? null} isAdmin={!!me?.admin} votingOpen={votingOpen} removable={removable} />
        </m.div>
      ))}
    </div>
  );
}
