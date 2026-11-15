import type { Metadata } from "next";
import type { ReactNode } from "react";
import { BackLink } from "@/components/back-link";
import { Reveal } from "@/components/motion-primitives";
import { ShareButton } from "@/components/share-button";
import { formationSlots } from "@/lib/formations";
import { KITS } from "@/lib/kits";
import { canManage, pastMatchdays } from "@/lib/matchday";
import { currentPlayer } from "@/lib/session";
import { DeleteMatchday } from "@/components/delete-matchday";
import { matchdayRecap, type Recap } from "@/lib/recap";

function Face({ src, name, size = 32, gold = false }: { src: string | null; name: string; size?: number; gold?: boolean }) {
  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-white/[0.08] text-[10px] font-bold ${gold ? "ring-2 ring-[#DDB168]" : "ring-1 ring-white/10"}`}
      style={{ width: size, height: size }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        name.slice(0, 2).toUpperCase()
      )}
    </span>
  );
}

function RecapBlock({ r, lineup }: { r: Recap | null; lineup: ReactNode }) {
  const has = !!r?.matches.length;
  const a = r?.awards;
  const rows = a
    ? ([
        a.rating && { k: "Best rating", l: a.rating, v: a.rating.avgRating.toFixed(1) },
        a.passing && a.passing.passPct != null && { k: "Best passing", l: a.passing, v: `${Math.round(a.passing.passPct)}%` },
        a.scorer && { k: "Top scorer", l: a.scorer, v: `${a.scorer.goals} G` },
        a.assister && { k: "Top assist", l: a.assister, v: `${a.assister.assists} A` },
        a.motm && { k: "Most MOTM", l: a.motm, v: `${a.motm.motm}×` },
      ].filter(Boolean) as { k: string; l: Recap["lines"][number]; v: string }[])
    : [];
  return (
    <div className="mt-4 space-y-2">
      {has && r && (
        <div className="rounded-2xl bg-white/[0.04] px-3">
          <div className="flex items-center justify-between gap-3 py-2.5">
            <div className="flex items-center gap-1 text-xs font-semibold tabular-nums">
              <span className="rounded-full bg-accent/15 px-2 py-0.5 text-accent">{r.record.W}W</span>
              <span className="rounded-full bg-white/[0.08] px-2 py-0.5">{r.record.D}D</span>
              <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-red-400">{r.record.L}L</span>
            </div>
            <span className="text-xs text-mute tabular-nums">
              {r.record.gf}:{r.record.ga} · {r.matches.length} MP
            </span>
          </div>
          {a?.mvp && (
            <div className="flex items-center gap-2.5 border-t border-white/[0.06] py-2.5">
              <Face src={a.mvp.avatar} name={a.mvp.name} size={28} gold />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                <span className="mr-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#DDB168]">MVP</span>
                {a.mvp.name}
              </span>
              <span className="text-sm font-semibold tabular-nums text-[#DDB168]">{a.mvp.avgRating.toFixed(1)}</span>
            </div>
          )}
        </div>
      )}
      {!has && <p className="rounded-2xl bg-white/[0.03] px-3 py-2.5 text-xs text-mute">No synced matches in this session window.</p>}

      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-center gap-1 py-1.5 text-xs font-medium text-mute transition hover:text-chalk">
          <span className="group-open:hidden">{has ? "Full recap & lineup" : "Lineup"}</span>
          <span className="hidden group-open:inline">Hide</span>
          <svg viewBox="0 0 24 24" className="size-3.5 transition group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
            <path d="m6 9 6 6 6-6" />
          </svg>
        </summary>
        <div className="space-y-3 pt-2">
          {rows.length > 0 && (
            <ul className="divide-y divide-white/[0.05] rounded-2xl bg-white/[0.03] px-3 text-sm">
              {rows.map((x) => (
                <li key={x.k} className="flex items-center gap-3 py-2">
                  <span className="w-24 shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-mute">{x.k}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {x.l.name} <span className="text-xs font-normal text-mute">· {x.l.matches} MP</span>
                  </span>
                  <span className="font-semibold tabular-nums">{x.v}</span>
                </li>
              ))}
            </ul>
          )}
          {has && r && (
            <div className="overflow-x-auto rounded-2xl bg-white/[0.03] px-3 py-1">
              <table className="w-full text-left text-xs tabular-nums">
                <thead className="text-mute">
                  <tr>
                    <th className="py-2 pr-2 font-medium">Player</th>
                    <th className="px-1.5 text-right font-medium">MP</th>
                    <th className="px-1.5 text-right font-medium">G</th>
                    <th className="px-1.5 text-right font-medium">A</th>
                    <th className="px-1.5 text-right font-medium">Rtg</th>
                    <th className="pl-1.5 text-right font-medium">Pass</th>
                  </tr>
                </thead>
                <tbody>
                  {r.lines.map((l) => (
                    <tr key={l.gamertag} className="border-t border-white/[0.05]">
                      <td className="max-w-[8rem] truncate py-2 pr-2 font-medium">
                        {l.name}
                        {l.motm > 0 && <span className="ml-1 text-[10px] text-[#DDB168]">★{l.motm > 1 ? l.motm : ""}</span>}
                      </td>
                      <td className="px-1.5 text-right">{l.matches}</td>
                      <td className="px-1.5 text-right">{l.goals}</td>
                      <td className="px-1.5 text-right">{l.assists}</td>
                      <td className="px-1.5 text-right">{l.avgRating.toFixed(1)}</td>
                      <td className="pl-1.5 text-right">{l.passPct != null ? `${Math.round(l.passPct)}%` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {lineup}
        </div>
      </details>
    </div>
  );
}

function parts(iso: string) {
  const d = new Date(iso);
  const f = (o: Intl.DateTimeFormatOptions) => d.toLocaleString("en-GB", { ...o, timeZone: "Asia/Jakarta" });
  return { day: f({ day: "numeric" }), month: f({ month: "short" }), rest: f({ weekday: "long", hour: "2-digit", minute: "2-digit" }) };
}

export default async function MatchdayHistory() {
  const [list, me] = await Promise.all([pastMatchdays(), currentPlayer()]);
  const recaps = await Promise.all(list.map((md) => matchdayRecap(md).catch(() => null)));
  const manage = canManage(me?.role);
  return (
    <section className="mx-auto max-w-4xl px-4 pb-40 pt-24 md:px-6 md:pt-32">
      <Reveal blur className="px-1 pb-10">
        <BackLink href="/matchday" label="Matchday" />
        <p className="eyebrow md:mt-6">History</p>
        <h1 className="text-display mt-3 text-5xl md:text-7xl">
          Every matchday.
          <br />
          <span className="text-gradient">On the record.</span>
        </h1>
      </Reveal>

      {list.length === 0 ? (
        <p className="tile p-8 text-center text-mute">No finished matchdays yet. Blow the final whistle on one and it lands here.</p>
      ) : (
        <ol className="space-y-3">
          {list.map((md, i) => {
            const p = parts(md.scheduled_at);
            const slots = formationSlots(md.formation);
            return (
              <Reveal key={md.id} delay={Math.min(i * 0.04, 0.3)}>
                <li className="tile relative p-5 md:p-6">
                 {manage && (
                   <div className="absolute right-4 top-4 z-10">
                     <DeleteMatchday id={md.id} />
                   </div>
                 )}
                 <div className="flex items-center">
                  <div className="flex items-center gap-5 pr-12 md:w-56 md:shrink-0 md:pr-0">
                    <div className="text-center">
                      <p className="text-display text-5xl leading-none tabular-nums">{p.day}</p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-accent">{p.month}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{p.rest}</p>
                      <p className="mt-0.5 text-xs text-mute">
                        {md.formation} · {KITS[md.kit].label} kit · {md.ready} ready
                      </p>
                      {md.by && <p className="mt-0.5 text-xs text-mute">by {md.by}</p>}
                    </div>
                  </div>
                 </div>
                 {md.note && <p className="mt-3 text-sm font-medium">{md.note}</p>}
                 <RecapBlock
                   r={recaps[i]}
                   lineup={
                     <div className="rounded-2xl bg-white/[0.03] p-3">
                       <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-mute">Lineup · {md.formation}</p>
                       {md.lineup.length ? (
                      <ul className="flex flex-wrap gap-1.5">
                        {md.lineup.map((l) => (
                          <li key={l.slot} className="flex items-center gap-1.5 rounded-full bg-white/[0.06] py-0.5 pl-0.5 pr-2.5 text-xs">
                            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-on-accent">{l.number}</span>
                            <span className="font-medium">{l.name}</span>
                            <span className="text-mute">{slots[l.slot]?.label}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-mute">No lineup was set.</p>
                    )}
                     </div>
                   }
                 />
                  <div className={`mt-4 grid gap-2 ${recaps[i]?.matches.length ? "grid-cols-2" : "grid-cols-1"}`}>
                    <ShareButton
                      url={`/share/lineup?id=${md.id}`}
                      filename={`revorfest-lineup-${md.scheduled_at.slice(0, 10)}.png`}
                      title="Revorfest lineup"
                      label="Share lineup"
                      className="justify-center bg-white/[0.06] py-2.5"
                    />
                    {recaps[i]?.matches.length ? (
                      <ShareButton
                        url={`/share/recap?id=${md.id}`}
                        filename={`revorfest-recap-${md.scheduled_at.slice(0, 10)}.png`}
                        title="Revorfest matchday recap"
                        label="Share recap"
                        className="justify-center bg-accent py-2.5 text-on-accent"
                      />
                    ) : null}
                  </div>
                </li>
              </Reveal>
            );
          })}
        </ol>
      )}
    </section>
  );
}
