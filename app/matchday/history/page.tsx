import type { Metadata } from "next";
import { BackLink } from "@/components/back-link";
import { Reveal } from "@/components/motion-primitives";
import { ShareButton } from "@/components/share-button";
import { formationSlots } from "@/lib/formations";
import { KITS } from "@/lib/kits";
import { canManage, pastMatchdays } from "@/lib/matchday";
import { currentPlayer } from "@/lib/session";
import { DeleteMatchday } from "@/components/delete-matchday";

export const metadata: Metadata = { title: "Matchday history" };

function parts(iso: string) {
  const d = new Date(iso);
  const f = (o: Intl.DateTimeFormatOptions) => d.toLocaleString("en-GB", { ...o, timeZone: "Asia/Jakarta" });
  return { day: f({ day: "numeric" }), month: f({ month: "short" }), rest: f({ weekday: "long", hour: "2-digit", minute: "2-digit" }) };
}

export default async function MatchdayHistory() {
  const [list, me] = await Promise.all([pastMatchdays(), currentPlayer()]);
  const manage = canManage(me?.role);
  return (
    <section className="mx-auto max-w-4xl px-4 pb-40 pt-24 md:px-6 md:pt-32">
      <Reveal blur className="px-1 pb-10">
        <BackLink href="/matchday" label="Matchday" />
        <p className="eyebrow md:mt-6">History</p>
        <h1 className="text-display mt-3 text-5xl md:text-7xl">
          Every lineup.
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
                <li className="tile flex flex-col gap-5 p-5 md:flex-row md:items-center md:p-6">
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
                  <div className="flex items-center gap-2 self-start md:self-center">
                    <ShareButton
                      url={`/share/lineup?id=${md.id}`}
                      filename={`revorfest-lineup-${md.scheduled_at.slice(0, 10)}.png`}
                      title="Revorfest lineup"
                      className="bg-white/[0.06]"
                    />
                    {manage && <DeleteMatchday id={md.id} />}
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
