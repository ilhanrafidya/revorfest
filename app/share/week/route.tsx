import { db } from "@/lib/db";
import { honorsFor, weekFromKey, weekStart } from "@/lib/honors";
import { C, Frame, Stat, asset, avatarData, story } from "@/lib/share";

export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("week");
  const start = key && /^\d{4}-\d{2}-\d{2}$/.test(key) ? weekFromKey(key) : weekStart();
  const end = new Date(start.getTime() + 7 * 86400000);
  const [h, matches, crest] = await Promise.all([
    honorsFor(start),
    db()`SELECT goals_for, goals_against, result, opponent_name FROM ea_matches
         WHERE played_at >= ${start.toISOString()} AND played_at < ${end.toISOString()} ORDER BY played_at` as unknown as Promise<
      { goals_for: number; goals_against: number; result: "W" | "D" | "L"; opponent_name: string | null }[]
    >,
    asset(req, "/brand/crest.png"),
  ]);
  if (!matches.length) return new Response("No matches that week", { status: 404 });
  const n = (r: string) => matches.filter((m) => m.result === r).length;
  const gf = matches.reduce((a, m) => a + m.goals_for, 0);
  const ga = matches.reduce((a, m) => a + m.goals_against, 0);
  const top = (k: "goals" | "assists") => [...h.table].sort((a, b) => b[k] - a[k])[0];
  const scorer = top("goals");
  const creator = top("assists");
  const potwAvatar = await avatarData(h.potw?.playerId ?? null);
  const shown = matches.slice(-8);

  return story(
    <Frame crest={crest} eyebrow="WEEKLY RECAP">
      <div style={{ display: "flex", marginTop: 14, fontSize: 30, color: C.mute }}>{h.label}</div>
      <div style={{ display: "flex", marginTop: 70 }}>
        <Stat label="WINS" value={String(n("W"))} color={C.volt} />
        <Stat label="DRAWS" value={String(n("D"))} />
        <Stat label="LOSSES" value={String(n("L"))} color={C.red} />
        <Stat label="GOALS" value={`${gf}:${ga}`} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", width: 920, marginTop: 60, borderRadius: 40, background: "rgba(255,255,255,0.05)", padding: "14px 40px" }}>
        {shown.map((m, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", padding: "14px 0", borderBottom: i < shown.length - 1 ? "1px solid rgba(255,255,255,0.08)" : "none" }}>
            <div style={{ display: "flex", width: 54, height: 54, borderRadius: 54, alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 800, background: m.result === "W" ? C.volt : m.result === "L" ? C.red : "rgba(255,255,255,0.2)", color: m.result === "L" ? "#fff" : "#000" }}>
              {m.result}
            </div>
            <div style={{ display: "flex", flex: 1, marginLeft: 24, fontSize: 34 }}>{`vs ${(m.opponent_name ?? "Unknown").slice(0, 20)}`}</div>
            <div style={{ display: "flex", fontSize: 38, fontWeight: 800 }}>{`${m.goals_for}–${m.goals_against}`}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", width: 920, marginTop: 40, justifyContent: "space-between" }}>
        {[
          { k: "TOP SCORER", v: scorer && scorer.goals ? `${scorer.name} · ${scorer.goals}` : "—" },
          { k: "MOST ASSISTS", v: creator && creator.assists ? `${creator.name} · ${creator.assists}` : "—" },
        ].map((x) => (
          <div key={x.k} style={{ display: "flex", flexDirection: "column", width: 445, borderRadius: 32, background: "rgba(255,255,255,0.05)", padding: "26px 30px" }}>
            <div style={{ display: "flex", fontSize: 22, letterSpacing: 4, color: C.mute }}>{x.k}</div>
            <div style={{ display: "flex", marginTop: 8, fontSize: 38, fontWeight: 800 }}>{x.v}</div>
          </div>
        ))}
      </div>
      {h.potw && (
        <div style={{ display: "flex", marginTop: "auto", marginBottom: 40, alignItems: "center", width: 920, borderRadius: 40, padding: "24px 30px", background: "rgba(221,177,104,0.14)", border: "2px solid rgba(221,177,104,0.4)" }}>
          <div style={{ display: "flex", width: 110, height: 110, borderRadius: 110, overflow: "hidden", alignItems: "center", justifyContent: "center", background: "#1C1C1F", fontSize: 40, fontWeight: 700 }}>
            {potwAvatar ? <img src={potwAvatar} width={110} height={110} alt="" style={{ objectFit: "cover" }} /> : h.potw.name.slice(0, 2).toUpperCase()}
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginLeft: 26 }}>
            <div style={{ display: "flex", fontSize: 24, letterSpacing: 5, fontWeight: 700, color: C.gold }}>{"PLAYER OF THE WEEK"}</div>
            <div style={{ display: "flex", fontSize: 50, fontWeight: 800 }}>{h.potw.name}</div>
          </div>
          <div style={{ display: "flex", marginLeft: "auto", fontSize: 60, fontWeight: 800, color: C.gold }}>{h.potw.avgRating.toFixed(1)}</div>
        </div>
      )}
    </Frame>,
  );
}
