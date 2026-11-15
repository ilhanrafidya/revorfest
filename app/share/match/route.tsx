import { MATCH_TYPE_LABEL } from "@/lib/format";
import { C, Frame, asset, story } from "@/lib/share";
import { matchDetail } from "@/lib/stats";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const d = await matchDetail(id);
  if (!d) return new Response("Not found", { status: 404 });
  const m = d.match;
  const crest = await asset(req, "/brand/crest.png");
  const res = m.result === "W" ? { t: "WIN", c: C.volt, g: "rgba(215,255,58,0.22)" } : m.result === "L" ? { t: "LOSS", c: C.red, g: "rgba(255,69,58,0.25)" } : { t: "DRAW", c: C.chalk, g: "rgba(255,255,255,0.12)" };
  const when = new Date(m.played_at).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
  const motm = d.players.find((p) => p.motm);
  const contributors = d.players.filter((p) => p.goals > 0 || p.assists > 0).sort((a, b) => b.goals - a.goals || b.assists - a.assists);
  const opp = m.opponent_name ?? "Unknown";

  return story(
    <Frame crest={crest} eyebrow={`FULL TIME · ${(MATCH_TYPE_LABEL[m.match_type] ?? m.match_type).toUpperCase()}`} accent={res.c} glow={res.g}>
      <div style={{ display: "flex", marginTop: 14, fontSize: 30, color: C.mute }}>{when}</div>
      <div style={{ display: "flex", marginTop: 120, alignItems: "center", fontSize: 300, fontWeight: 800, letterSpacing: -14, lineHeight: 1 }}>
        <div style={{ display: "flex" }}>{String(m.goals_for)}</div>
        <div style={{ display: "flex", color: "rgba(255,255,255,0.3)", margin: "0 30px" }}>{"–"}</div>
        <div style={{ display: "flex" }}>{String(m.goals_against)}</div>
      </div>
      <div style={{ display: "flex", width: 900, justifyContent: "space-between", marginTop: 20, fontSize: 40, fontWeight: 700 }}>
        <div style={{ display: "flex", width: 420 }}>{"Revorfest"}</div>
        <div style={{ display: "flex", width: 420, justifyContent: "flex-end", color: C.mute }}>{opp.length > 18 ? `${opp.slice(0, 17)}…` : opp}</div>
      </div>
      <div style={{ display: "flex", marginTop: 50, fontSize: 40, fontWeight: 800, letterSpacing: 10, color: res.t === "DRAW" ? "#000" : "#000", background: res.c, padding: "12px 40px", borderRadius: 60 }}>{res.t}</div>

      {contributors.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", width: 900, marginTop: 90, borderRadius: 40, background: "rgba(255,255,255,0.05)", padding: "20px 40px" }}>
          {contributors.slice(0, 6).map((p) => (
            <div key={p.gamertag} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ display: "flex", fontSize: 38, fontWeight: 700 }}>{p.who.number ? `${p.who.name}  #${p.who.number}` : p.who.name}</div>
              <div style={{ display: "flex", fontSize: 34, color: C.mute }}>{[p.goals ? `${p.goals} G` : "", p.assists ? `${p.assists} A` : ""].filter(Boolean).join(" · ")}</div>
            </div>
          ))}
        </div>
      )}
      {motm && (
        <div style={{ display: "flex", marginTop: "auto", marginBottom: 60, alignItems: "center", gap: 20, fontSize: 38 }}>
          <div style={{ display: "flex", background: "rgba(221,177,104,0.2)", color: C.gold, fontWeight: 800, letterSpacing: 4, padding: "8px 22px", borderRadius: 40, fontSize: 28 }}>{"MOTM"}</div>
          <div style={{ display: "flex", fontWeight: 700 }}>{`${motm.who.name}${motm.rating ? ` · ${Number(motm.rating).toFixed(1)}` : ""}`}</div>
        </div>
      )}
    </Frame>,
  );
}
