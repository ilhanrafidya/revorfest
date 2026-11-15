import { db } from "@/lib/db";
import { C, Frame, Stat, asset, story } from "@/lib/share";

/** Head-to-head story vs one opponent club. */
export async function GET(req: Request) {
  const opp = new URL(req.url).searchParams.get("opp") ?? "";
  const sql = db();
  const [matches, scorers, crest] = await Promise.all([
    sql`SELECT match_id, goals_for, goals_against, result, opponent_name, played_at FROM ea_matches
        WHERE opponent_id = ${opp} ORDER BY played_at DESC` as unknown as Promise<
      { match_id: string; goals_for: number; goals_against: number; result: "W" | "D" | "L"; opponent_name: string | null; played_at: string }[]
    >,
    sql`SELECT coalesce(p.display_name, mp.gamertag) AS name, sum(mp.goals)::int AS goals
        FROM ea_match_players mp JOIN ea_matches m USING (match_id)
        LEFT JOIN players p ON lower(p.ea_gamertag) = lower(mp.gamertag) AND p.active
        WHERE m.opponent_id = ${opp}
        GROUP BY 1 HAVING sum(mp.goals) > 0 ORDER BY 2 DESC LIMIT 1` as unknown as Promise<{ name: string; goals: number }[]>,
    asset(req, "/brand/crest.png"),
  ]);
  if (!matches.length) return new Response("No matches", { status: 404 });
  const name = matches[0].opponent_name ?? "Unknown";
  const n = (r: string) => matches.filter((m) => m.result === r).length;
  const gf = matches.reduce((a, m) => a + m.goals_for, 0);
  const ga = matches.reduce((a, m) => a + m.goals_against, 0);
  const shown = matches.slice(0, 6);

  return story(
    <Frame crest={crest} eyebrow="HEAD TO HEAD" accent={C.volt} glow="rgba(255,69,58,0.22)">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 90 }}>
        <div style={{ display: "flex", fontSize: 96, fontWeight: 800, letterSpacing: -4 }}>{"Revorfest"}</div>
        <div style={{ display: "flex", fontSize: 44, fontWeight: 800, letterSpacing: 10, color: C.mute, margin: "10px 0" }}>{"VS"}</div>
        <div style={{ display: "flex", fontSize: name.length > 14 ? 76 : 96, fontWeight: 800, letterSpacing: -4, textAlign: "center" }}>{name}</div>
      </div>
      <div style={{ display: "flex", marginTop: 80 }}>
        <Stat label="WINS" value={String(n("W"))} color={C.volt} />
        <Stat label="DRAWS" value={String(n("D"))} />
        <Stat label="LOSSES" value={String(n("L"))} color={C.red} />
        <Stat label="GOALS" value={`${gf}:${ga}`} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", width: 920, marginTop: 60, borderRadius: 40, background: "rgba(255,255,255,0.05)", padding: "14px 40px" }}>
        {shown.map((m, i) => (
          <div key={m.match_id} style={{ display: "flex", alignItems: "center", padding: "14px 0", borderBottom: i < shown.length - 1 ? "1px solid rgba(255,255,255,0.08)" : "none" }}>
            <div style={{ display: "flex", width: 54, height: 54, borderRadius: 54, alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 800, background: m.result === "W" ? C.volt : m.result === "L" ? C.red : "rgba(255,255,255,0.2)", color: m.result === "L" ? "#fff" : "#000" }}>
              {m.result}
            </div>
            <div style={{ display: "flex", flex: 1, marginLeft: 24, fontSize: 32, color: C.mute }}>
              {new Date(m.played_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Jakarta" })}
            </div>
            <div style={{ display: "flex", fontSize: 40, fontWeight: 800 }}>{`${m.goals_for}–${m.goals_against}`}</div>
          </div>
        ))}
      </div>
      {scorers[0] && (
        <div style={{ display: "flex", marginTop: "auto", marginBottom: 50, fontSize: 36 }}>
          <div style={{ display: "flex", color: C.mute }}>{"Nemesis killer · "}</div>
          <div style={{ display: "flex", fontWeight: 800, marginLeft: 10 }}>{`${scorers[0].name} (${scorers[0].goals} goals)`}</div>
        </div>
      )}
    </Frame>,
  );
}
