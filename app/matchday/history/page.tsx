import type { Metadata } from "next";
import { BackLink } from "@/components/back-link";
import { Reveal } from "@/components/motion-primitives";
import { ShareButton } from "@/components/share-button";
import { formationSlots } from "@/lib/formations";
import { KITS } from "@/lib/kits";
import { canManage, pastMatchdays } from "@/lib/matchday";
import { currentPlayer } from "@/lib/session";
import { DeleteMatchday } from "@/components/delete-matchday";
import { matchdayRecap, type Recap } from "@/lib/recap";

function RecapBlock({ r }: { r: Recap }) {
  if (!r.matches.length)
    return <p className="mt-4 border-t border-white/[0.06] pt-4 text-xs text-mute">No synced matches in this session window yet.</p>;
  const a = r.awards;
  const chips = [
    a.mvp && { k: "MVP", v: a.mvp.name, s: a.mvp.avgRating.toFixed(1), mp: a.mvp.matches, gold: true },
    a.rating && { k: "Best rating", v: a.rating.name, s: a.rating.avgRating.toFixed(1), mp: a.rating.matches },
    a.passing && a.passing.passPct != null && { k: "Best passing", v: a.passing.name, s: `${Math.round(a.passing.passPct)}%`, mp: a.passing.matches },
    a.scorer && { k: "Top scorer", v: a.scorer.name, s: `${a.scorer.goals} G`, mp: a.scorer.matches },
    a.assister && { k: "Top assist", v: a.assister.name, s: `${a.assister.assists} A`, mp: a.assister.matches },
    a.motm && { k: "Most MOTM", v: a.motm.name, s: `${a.motm.motm}×`, mp: a.motm.matches },
  ].filter(Boolean) as { k: string; v: string; s: string; mp: number; gold?: boolean }[];
  return (
    <div className="mt-4 border-t border-white/[0.06] pt-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-semibold">Recap</span>
        <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent">{r.record.W}W</span>
        <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-xs font-semibold">{r.record.D}D</span>
        <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-400">{r.record.L}L</span>
        <span className="text-xs text-mute">
          {r.record.gf}:{r.record.ga} · {r.matches.length} match{r.matches.length > 1 ? "es" : ""}
          {!r.window.closed && " · live"}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
        {chips.map((c) => (
          <div key={c.k} className={`rounded-2xl px-3 py-2 ${c.gold ? "bg-[rgba(221,177,104,0.12)] ring-1 ring-[rgba(221,177,104,0.35)]" : "bg-white/[0.04]"}`}>
            <p className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${c.gold ? "text-[#DDB168]" : "text-mute"}`}>{c.k}</p>
            <p className="mt-0.5 truncate text-sm font-semibold">
              {c.v} <span className="tabular-nums">{c.s}</span>
            </p>
            <p className="text-[11px] text-mute">{c.mp} MP</p>
          </div>
        ))}
      </div>
      <details className="group mt-3">
        <summary className="cursor-pointer list-none text-xs font-medium text-mute hover:text-chalk">
          <span className="group-open:hidden">Show everyone ›</span>
          <span className="hidden group-open:inline">Hide ‹</span>
        </summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-xs tabular-nums">
            <thead className="text-mute">
              <tr>
                <th className="py-1.5 pr-3 font-medium">Player</th>
                <th className="px-2 font-medium">MP</th>
                <th className="px-2 font-medium">G</th>
                <th className="px-2 font-medium">A</th>
                <th className="px-2 font-medium">MOTM</th>
                <th className="px-2 font-medium">Rating</th>
                <th className="px-2 font-medium">Pass</th>
              </tr>
            </thead>
            <tbody>
              {r.lines.map((l) => (
                <tr key={l.gamertag} className="border-t border-white/[0.05]">
                  <td className="max-w-[9rem] truncate py-1.5 pr-3 font-medium">{l.name}</td>
                  <td className="px-2">{l.matches}</td>
                  <td className="px-2">{l.goals}</td>
                  <td className="px-2">{l.assists}</td>
                  <td className="px-2">{l.motm}</td>
                  <td className="px-2">{l.avgRating.toFixed(1)}</td>
                  <td className="px-2">{l.passPct != null ? `${Math.round(l.passPct)}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

export const metadata: Metadata = { title: "Matchday history" };

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
                <li className="tile p-5 md:p-6">
                 <div className="flex flex-col gap-5 md:flex-row md:items-center">
                  <div className="flex items-center gap-5 md:w-56 md:shrink-0">
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
                  <div className="min-w-0 flex-1">
                    {md.note && <p className="mb-2 text-sm text-mute">{md.note}</p>}
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
                  <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
                    <ShareButton
                      url={`/share/lineup?id=${md.id}`}
                      filename={`revorfest-lineup-${md.scheduled_at.slice(0, 10)}.png`}
                      title="Revorfest lineup"
                      className="bg-white/[0.06]"
                    />
                    {recaps[i]?.matches.length ? (
                      <ShareButton
                        url={`/share/recap?id=${md.id}`}
                        filename={`revorfest-recap-${md.scheduled_at.slice(0, 10)}.png`}
                        title="Revorfest matchday recap"
                        label="Share recap"
                        className="bg-white/[0.06]"
                      />
                    ) : null}
                    {manage && <DeleteMatchday id={md.id} />}
                  </div>
                 </div>
                 {recaps[i] && <RecapBlock r={recaps[i]} />}
                </li>
              </Reveal>
            );
          })}
        </ol>
      )}
    </section>
  );
}
