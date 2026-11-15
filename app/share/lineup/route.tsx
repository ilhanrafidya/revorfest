import { formationSlots } from "@/lib/formations";
import { KITS } from "@/lib/kits";
import { currentMatchday, matchdayById, matchdayRoster } from "@/lib/matchday";
import { C, Frame, asset, story } from "@/lib/share";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  const md = id ? await matchdayById(id) : await currentMatchday();
  if (!md) return new Response("No matchday", { status: 404 });
  const { roster, lineup } = await matchdayRoster(md.id);
  const byId = new Map(roster.map((p) => [p.id, p]));
  const slots = formationSlots(md.formation);
  const [kit, crest] = await Promise.all([asset(req, `/kits/${md.kit}.png`), asset(req, "/brand/crest.png")]);
  const d = new Date(md.scheduled_at);
  const f = (o: Intl.DateTimeFormatOptions) => d.toLocaleString("en-GB", { ...o, timeZone: "Asia/Jakarta" });
  const title = md.note?.trim() || f({ weekday: "long" });
  const when = `${f({ weekday: "short" })} ${f({ day: "numeric", month: "short" })} · ${f({ hour: "2-digit", minute: "2-digit" })} WIB`;
  const W = 940;
  const H = 1120;
  const line = "rgba(255,255,255,0.22)";
  const titleSize = title.length > 18 ? 76 : title.length > 12 ? 96 : 120;

  return story(
    <Frame crest={crest} eyebrow="MATCHDAY">
      <div style={{ display: "flex", marginTop: 26, fontSize: titleSize, fontWeight: 800, letterSpacing: -4, lineHeight: 1, textAlign: "center" }}>{title}</div>
      <div style={{ display: "flex", marginTop: 20, fontSize: 32, color: C.mute }}>{`${when} · ${md.formation} · ${KITS[md.kit].label} kit`}</div>
      <div style={{ marginTop: 50, width: W, height: H, position: "relative", display: "flex", borderRadius: 44, overflow: "hidden", border: "2px solid rgba(255,255,255,0.12)" }}>
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} style={{ position: "absolute", left: 0, right: 0, top: (H / 10) * i, height: H / 10, background: i % 2 ? "#0f3523" : "#0c2e1d", display: "flex" }} />
        ))}
        <div style={{ position: "absolute", left: 28, top: 28, width: W - 56, height: H - 56, border: `3px solid ${line}`, borderRadius: 8, display: "flex" }} />
        <div style={{ position: "absolute", left: 28, right: 28, top: H / 2 - 1, height: 3, background: line, display: "flex" }} />
        <div style={{ position: "absolute", left: W / 2 - 90, top: H / 2 - 90, width: 180, height: 180, borderRadius: 180, border: `3px solid ${line}`, display: "flex" }} />
        <div style={{ position: "absolute", left: W / 2 - 220, top: 28, width: 440, height: 160, border: `3px solid ${line}`, borderTop: "none", display: "flex" }} />
        <div style={{ position: "absolute", left: W / 2 - 220, top: H - 188, width: 440, height: 160, border: `3px solid ${line}`, borderBottom: "none", display: "flex" }} />
        {slots.map((s, i) => {
          const p = lineup[i] ? byId.get(lineup[i]!) : undefined;
          const x = (s.x / 100) * W;
          const y = H - (s.y / 100) * H;
          return (
            <div key={i} style={{ position: "absolute", left: x - 100, top: y - 64, width: 200, display: "flex", flexDirection: "column", alignItems: "center" }}>
              {p && kit ? (
                <img src={kit} width={96} height={96} alt="" style={{ objectFit: "contain" }} />
              ) : (
                <div style={{ width: 84, height: 84, borderRadius: 84, border: "3px dashed rgba(255,255,255,0.35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "rgba(255,255,255,0.7)" }}>
                  {s.label}
                </div>
              )}
              {p ? (
                <div style={{ marginTop: 8, display: "flex", alignItems: "center", background: "rgba(0,0,0,0.72)", borderRadius: 40, padding: "4px 16px 4px 4px", maxWidth: 200 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minWidth: 38, height: 38, padding: "0 6px", borderRadius: 38, background: C.volt, color: "#000", fontSize: 21, fontWeight: 800 }}>
                    {String(p.number)}
                  </div>
                  <div style={{ display: "flex", marginLeft: 10, fontSize: 25, fontWeight: 700 }}>{p.name}</div>
                </div>
              ) : (
                <div style={{ display: "flex", marginTop: 8, fontSize: 18, letterSpacing: 3, color: "rgba(255,255,255,0.5)" }}>{"OPEN"}</div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", marginTop: "auto", marginBottom: 30, fontSize: 30, color: C.mute }}>{"#WeAreRevorfest"}</div>
    </Frame>,
  );
}
