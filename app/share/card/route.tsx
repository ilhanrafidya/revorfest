import { cardFor } from "@/lib/card";
import { getPlayerBySlug } from "@/lib/players";
import { C, Frame, asset, avatarData, story } from "@/lib/share";

const AWARD = { pots: "Player of the Season", boot: "Golden Boot", assist: "Playmaker" } as const;

export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("slug") ?? "";
  const p = await getPlayerBySlug(slug);
  if (!p) return new Response("Not found", { status: 404 });
  const [c, crest, avatar] = await Promise.all([cardFor(p), asset(req, "/brand/crest.png"), avatarData(p.id)]);
  const gold = c.gold;
  const s = c.stats;
  const ink = gold ? C.goldHi : C.volt;
  const edge = gold ? C.gold : "rgba(61,111,217,0.8)";
  const bg = gold ? "#1f1708" : "#0d1a33";
  const ga = s.matches ? ((s.goals + s.assists) / s.matches).toFixed(1) : "—";
  const stats: [string, string][] = [
    ["MP", String(s.matches)],
    ["GOL", String(s.goals)],
    ["AST", String(s.assists)],
    ["MOTM", String(s.motm)],
    ["WIN", s.winRate != null ? `${s.winRate}%` : "—"],
    ["G+A/MP", ga],
  ];
  const badges = [
    ...c.awards.season.map((a) => `${AWARD[a.kind]} ${a.season.replace("Season ", "S")}`),
    ...(c.awards.potw ? [`POTW ×${c.awards.potw}`] : []),
    ...(c.awards.weak ? [`Weak ×${c.awards.weak}`] : []),
  ];

  return story(
    <Frame crest={crest} eyebrow={gold ? "GOLD EDITION" : "PLAYER CARD"} accent={gold ? C.gold : C.volt} glow={gold ? "rgba(221,177,104,0.35)" : "rgba(61,111,217,0.35)"}>
      <div
        style={{
          marginTop: 80,
          width: 820,
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
          borderRadius: 64,
          border: `3px solid ${edge}`,
          background: bg,
          padding: "50px 56px",
        }}
      >
        <div style={{ position: "absolute", right: -10, top: -60, fontSize: 420, fontWeight: 800, letterSpacing: -20, color: gold ? "rgba(221,177,104,0.10)" : "rgba(255,255,255,0.06)", display: "flex" }}>
          {String(c.number)}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 130, fontWeight: 800, letterSpacing: -5, lineHeight: 0.9, color: ink }}>{s.rating ? s.rating.toFixed(1) : "—"}</div>
            <div style={{ display: "flex", marginTop: 12, fontSize: 38, fontWeight: 800, letterSpacing: 6, color: gold ? C.gold : C.chalk }}>{c.positions[0]}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ display: "flex", fontSize: 64, fontWeight: 800 }}>{`#${c.number}`}</div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginTop: 10 }}>
          <div style={{ width: 400, height: 400, borderRadius: 400, border: `8px solid ${gold ? C.gold : C.volt}`, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: gold ? "#3a2b0e" : "#1d3566", fontSize: 140, fontWeight: 700 }}>
            {avatar ? <img src={avatar} width={400} height={400} alt="" style={{ objectFit: "cover" }} /> : c.name.slice(0, 2).toUpperCase()}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginTop: 34, fontSize: 96, fontWeight: 800, letterSpacing: -3, color: gold ? "#F7E2B0" : C.chalk }}>{c.name.toUpperCase()}</div>
        <div style={{ display: "flex", justifyContent: "center", marginTop: 6, fontSize: 30, color: gold ? C.gold : "rgba(255,255,255,0.6)" }}>{c.positions.join(" · ")}</div>
        <div style={{ display: "flex", flexWrap: "wrap", marginTop: 40, paddingTop: 34, borderTop: `2px solid ${gold ? "rgba(221,177,104,0.25)" : "rgba(255,255,255,0.1)"}` }}>
          {stats.map(([k, v]) => (
            <div key={k} style={{ width: "33.33%", display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 26 }}>
              <div style={{ display: "flex", fontSize: 66, fontWeight: 800 }}>{v}</div>
              <div style={{ display: "flex", fontSize: 24, letterSpacing: 4, color: "rgba(255,255,255,0.55)" }}>{k}</div>
            </div>
          ))}
        </div>
        {badges.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12, marginTop: 6 }}>
            {badges.map((b) => (
              <div key={b} style={{ display: "flex", fontSize: 24, fontWeight: 700, padding: "8px 20px", borderRadius: 40, background: b.startsWith("Weak") ? "rgba(255,69,58,0.18)" : "rgba(221,177,104,0.2)", color: b.startsWith("Weak") ? "#FF6B61" : C.gold }}>
                {b}
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 30, fontSize: 24, letterSpacing: 4, color: gold ? "rgba(221,177,104,0.7)" : "rgba(255,255,255,0.45)" }}>
          <div style={{ display: "flex" }}>{s.scope.toUpperCase()}</div>
          <div style={{ display: "flex" }}>{"REVORFEST"}</div>
        </div>
      </div>
    </Frame>,
  );
}
