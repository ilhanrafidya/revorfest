import { honorsFor, weekFromKey, weekStart } from "@/lib/honors";
import { rangeRecap } from "@/lib/recap";
import { C, Frame, Stat, asset, avatarData, story } from "@/lib/share";

type Cell = { k: string; who: { name: string; playerId: string | null; matches: number } | null; v: string | null; tone?: "red" };

export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("week");
  const start = key && /^\d{4}-\d{2}-\d{2}$/.test(key) ? weekFromKey(key) : weekStart();
  const end = new Date(start.getTime() + 7 * 86400000 - 1);
  const [h, r, crest] = await Promise.all([honorsFor(start), rangeRecap(start, end), asset(req, "/brand/crest.png")]);
  if (!r.matches.length) return new Response("No matches that week", { status: 404 });

  const a = r.awards;
  const potw = h.potw;
  const weak = h.wpotw;
  const cells: Cell[] = [
    { k: "TOP SCORER", who: a.scorer, v: a.scorer && `${a.scorer.goals} G` },
    { k: "TOP ASSIST", who: a.assister, v: a.assister && `${a.assister.assists} A` },
    { k: "BEST PASSING", who: a.passing, v: a.passing?.passPct != null ? `${Math.round(a.passing.passPct)}%` : null },
    { k: "BEST RATING", who: a.rating, v: a.rating && a.rating.avgRating.toFixed(1) },
    { k: "MOST MOTM", who: a.motm, v: a.motm && `${a.motm.motm}×` },
    { k: "PLAYER OF THE WEAK", who: weak, v: weak && weak.avgRating.toFixed(1), tone: "red" },
  ];

  const ids = [...new Set([potw?.playerId, ...cells.map((c) => c.who?.playerId)].filter((x): x is string => !!x))];
  const avs = await Promise.all(ids.map((id) => avatarData(id)));
  const face = new Map(ids.map((id, i) => [id, avs[i]]));
  const pic = (id: string | null | undefined) => (id ? (face.get(id) ?? null) : null);
  const form = r.matches.slice(-14);

  return story(
    <Frame crest={crest} eyebrow="WEEKLY RECAP">
      <div style={{ display: "flex", marginTop: 14, fontSize: 30, color: C.mute }}>{h.label}</div>
      <div style={{ display: "flex", marginTop: 50 }}>
        <Stat label="WINS" value={String(r.record.W)} color={C.volt} />
        <Stat label="DRAWS" value={String(r.record.D)} />
        <Stat label="LOSSES" value={String(r.record.L)} color={C.red} />
        <Stat label="GOALS" value={`${r.record.gf}:${r.record.ga}`} />
      </div>
      <div style={{ display: "flex", marginTop: 34, gap: 10 }}>
        {form.map((m, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              width: 50,
              height: 50,
              borderRadius: 50,
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              fontWeight: 800,
              background: m.result === "W" ? C.volt : m.result === "L" ? C.red : "rgba(255,255,255,0.18)",
              color: m.result === "L" ? "#fff" : m.result === "W" ? "#000" : "#fff",
            }}
          >
            {m.result}
          </div>
        ))}
      </div>

      {potw && (
        <div style={{ display: "flex", marginTop: 44, alignItems: "center", width: 920, borderRadius: 44, padding: "28px 32px", background: "rgba(221,177,104,0.14)", border: "2px solid rgba(221,177,104,0.45)" }}>
          <div style={{ display: "flex", width: 140, height: 140, borderRadius: 140, overflow: "hidden", alignItems: "center", justifyContent: "center", background: "#1C1C1F", border: "4px solid #DDB168", fontSize: 50, fontWeight: 700 }}>
            {pic(potw.playerId) ? <img src={pic(potw.playerId)!} width={140} height={140} alt="" style={{ objectFit: "cover" }} /> : potw.name.slice(0, 2).toUpperCase()}
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginLeft: 28, flex: 1 }}>
            <div style={{ display: "flex", fontSize: 24, letterSpacing: 5, fontWeight: 700, color: C.gold }}>{"PLAYER OF THE WEEK"}</div>
            <div style={{ display: "flex", fontSize: 54, fontWeight: 800 }}>{potw.name.slice(0, 16)}</div>
            <div style={{ display: "flex", marginTop: 2, fontSize: 28, color: C.mute }}>{`${potw.goals} G · ${potw.assists} A · ${potw.motm} MOTM · ${potw.matches} MP`}</div>
          </div>
          <div style={{ display: "flex", fontSize: 72, fontWeight: 800, color: C.gold }}>{potw.avgRating.toFixed(1)}</div>
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", width: 920, marginTop: 26, justifyContent: "space-between" }}>
        {cells.map((c) => {
          const av = pic(c.who?.playerId);
          const red = c.tone === "red";
          return (
            <div key={c.k} style={{ display: "flex", alignItems: "center", width: 445, marginBottom: 24, borderRadius: 32, background: red ? "rgba(255,69,58,0.1)" : "rgba(255,255,255,0.05)", padding: "22px 24px" }}>
              <div style={{ display: "flex", width: 88, height: 88, borderRadius: 88, overflow: "hidden", alignItems: "center", justifyContent: "center", background: "#1C1C1F", border: `3px solid ${red ? "rgba(255,69,58,0.6)" : "rgba(255,255,255,0.14)"}`, fontSize: 30, fontWeight: 700, flexShrink: 0 }}>
                {av ? <img src={av} width={88} height={88} alt="" style={{ objectFit: "cover" }} /> : (c.who?.name ?? "—").slice(0, 2).toUpperCase()}
              </div>
              <div style={{ display: "flex", flexDirection: "column", marginLeft: 20, flex: 1 }}>
                <div style={{ display: "flex", fontSize: 19, letterSpacing: 3, color: red ? C.red : C.mute }}>{c.k}</div>
                <div style={{ display: "flex", marginTop: 4, fontSize: 42, fontWeight: 800, lineHeight: 1.05, color: c.v ? C.chalk : C.mute }}>{c.v ?? "—"}</div>
                <div style={{ display: "flex", marginTop: 4, fontSize: 23, color: C.mute }}>{c.who ? `${c.who.name.slice(0, 12)} · ${c.who.matches} MP` : "nobody"}</div>
              </div>
            </div>
          );
        })}
      </div>
    </Frame>,
  );
}
