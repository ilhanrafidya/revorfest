import { ImageResponse } from "next/og";
import { formationSlots } from "@/lib/formations";
import { KITS } from "@/lib/kits";
import { currentMatchday, matchdayById, matchdayRoster } from "@/lib/matchday";

async function dataUri(url: URL) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return `data:image/png;base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}

// NB: Satori needs display:flex on any element with more than one child — keep text as single template strings.
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  const md = id ? await matchdayById(id) : await currentMatchday();
  if (!md) return new Response("No matchday", { status: 404 });
  const { roster, lineup } = await matchdayRoster(md.id);
  const byId = new Map(roster.map((p) => [p.id, p]));
  const slots = formationSlots(md.formation);
  const [kit, crest] = await Promise.all([dataUri(new URL(`/kits/${md.kit}.png`, req.url)), dataUri(new URL("/brand/crest.png", req.url))]);
  const d = new Date(md.scheduled_at);
  const f = (o: Intl.DateTimeFormatOptions) => d.toLocaleString("en-GB", { ...o, timeZone: "Asia/Jakarta" });
  const when = `${f({ weekday: "long" })} · ${f({ day: "numeric", month: "long" })} · ${f({ hour: "2-digit", minute: "2-digit" })} WIB`;
  const accent = "#D7FF3A";
  const W = 960;
  const H = 1000;
  const line = "rgba(255,255,255,0.22)";

  const stripes = Array.from({ length: 10 }, (_, i) => (
    <div key={i} style={{ position: "absolute", left: 0, right: 0, top: (H / 10) * i, height: H / 10, background: i % 2 ? "#0f3523" : "#0c2e1d", display: "flex" }} />
  ));

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#050505", color: "#F5F5F7", padding: "50px 60px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
            {crest ? <img src={crest} width={84} height={84} alt="" /> : <div style={{ display: "flex" }} />}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 22, letterSpacing: 6, color: accent, fontWeight: 700 }}>{"REVORFEST · MATCHDAY"}</div>
              <div style={{ display: "flex", fontSize: 30, color: "#A1A1A6", marginTop: 6 }}>{when}</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ display: "flex", fontSize: 64, fontWeight: 800, letterSpacing: -2, lineHeight: 1 }}>{md.formation}</div>
            <div style={{ display: "flex", fontSize: 22, color: "#86868B", marginTop: 6 }}>{`${KITS[md.kit].label} kit`}</div>
          </div>
        </div>

        <div style={{ marginTop: 36, width: W, height: H, position: "relative", display: "flex", borderRadius: 40, overflow: "hidden", border: "2px solid rgba(255,255,255,0.12)" }}>
          {stripes}
          <div style={{ position: "absolute", left: 30, top: 30, width: W - 60, height: H - 60, border: `3px solid ${line}`, borderRadius: 8, display: "flex" }} />
          <div style={{ position: "absolute", left: 30, right: 30, top: H / 2 - 1, height: 3, background: line, display: "flex" }} />
          <div style={{ position: "absolute", left: W / 2 - 95, top: H / 2 - 95, width: 190, height: 190, borderRadius: 190, border: `3px solid ${line}`, display: "flex" }} />
          <div style={{ position: "absolute", left: W / 2 - 230, top: 30, width: 460, height: 150, border: `3px solid ${line}`, borderTop: "none", display: "flex" }} />
          <div style={{ position: "absolute", left: W / 2 - 230, top: H - 180, width: 460, height: 150, border: `3px solid ${line}`, borderBottom: "none", display: "flex" }} />
          {slots.map((s, i) => {
            const p = lineup[i] ? byId.get(lineup[i]!) : undefined;
            const x = (s.x / 100) * W;
            const y = H - (s.y / 100) * H;
            return (
              <div key={i} style={{ position: "absolute", left: x - 100, top: y - 62, width: 200, display: "flex", flexDirection: "column", alignItems: "center" }}>
                {p && kit ? (
                  <img src={kit} width={92} height={92} alt="" style={{ objectFit: "contain" }} />
                ) : (
                  <div style={{ width: 84, height: 84, borderRadius: 84, border: "3px dashed rgba(255,255,255,0.35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "rgba(255,255,255,0.7)" }}>
                    {s.label}
                  </div>
                )}
                {p ? (
                  <div style={{ marginTop: 8, display: "flex", alignItems: "center", background: "rgba(0,0,0,0.72)", borderRadius: 40, padding: "4px 16px 4px 4px", maxWidth: 200 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minWidth: 36, height: 36, padding: "0 6px", borderRadius: 36, background: accent, color: "#000", fontSize: 20, fontWeight: 800 }}>
                      {String(p.number)}
                    </div>
                    <div style={{ display: "flex", marginLeft: 10, fontSize: 24, fontWeight: 700 }}>{p.name}</div>
                  </div>
                ) : (
                  <div style={{ display: "flex", marginTop: 8, fontSize: 18, letterSpacing: 3, color: "rgba(255,255,255,0.5)" }}>{"OPEN"}</div>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", fontSize: 22, color: "#6E6E73" }}>
          <div style={{ display: "flex" }}>{"revorfest.vercel.app/matchday"}</div>
          <div style={{ display: "flex" }}>{"#WeAreRevorfest"}</div>
        </div>
      </div>
    ),
    { width: 1080, height: 1350, headers: { "cache-control": "no-store" } },
  );
}
