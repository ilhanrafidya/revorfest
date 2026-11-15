import { matchdayById } from "@/lib/matchday";
import { matchdayRecap, type RecapLine } from "@/lib/recap";
import { C, Frame, Stat, asset, avatarData, story } from "@/lib/share";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const md = /^[0-9a-f-]{36}$/i.test(id) ? await matchdayById(id) : null;
  if (!md) return new Response("Matchday not found", { status: 404 });
  const r = await matchdayRecap(md);
  if (!r.matches.length) return new Response("No matches in this session", { status: 404 });
  const ids = [...new Set(Object.values(r.awards).map((l) => l?.playerId).filter((x): x is string => !!x))];
  const [crest, ...avs] = await Promise.all([asset(req, "/brand/crest.png"), ...ids.map((id) => avatarData(id))]);
  const face = new Map(ids.map((id, i) => [id, avs[i]]));
  const mvpAvatar = r.awards.mvp?.playerId ? (face.get(r.awards.mvp.playerId) ?? null) : null;

  const when = new Date(md.scheduled_at).toLocaleString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Jakarta" });
  const title = (md.note?.trim() || "Matchday").slice(0, 34);
  const mp = (l: RecapLine) => `${l.matches} MP`;
  const a = r.awards;
  const cells = [
    { k: "BEST RATING", l: a.rating, v: a.rating && a.rating.avgRating.toFixed(1) },
    { k: "BEST PASSING", l: a.passing, v: a.passing && a.passing.passPct != null ? `${Math.round(a.passing.passPct)}%` : null },
    { k: "TOP SCORER", l: a.scorer, v: a.scorer && `${a.scorer.goals} G` },
    { k: "TOP ASSIST", l: a.assister, v: a.assister && `${a.assister.assists} A` },
    { k: "MOST MOTM", l: a.motm, v: a.motm && `${a.motm.motm}×` },
    { k: "MATCHES", l: null, v: String(r.matches.length) },
  ];

  return story(
    <Frame crest={crest} eyebrow="MATCHDAY RECAP">
      <div style={{ display: "flex", marginTop: 18, fontSize: 56, fontWeight: 800, textAlign: "center" }}>{title}</div>
      <div style={{ display: "flex", marginTop: 8, fontSize: 30, color: C.mute }}>{when}</div>
      <div style={{ display: "flex", marginTop: 56 }}>
        <Stat label="WINS" value={String(r.record.W)} color={C.volt} />
        <Stat label="DRAWS" value={String(r.record.D)} />
        <Stat label="LOSSES" value={String(r.record.L)} color={C.red} />
        <Stat label="GOALS" value={`${r.record.gf}:${r.record.ga}`} />
      </div>

      {a.mvp && (
        <div style={{ display: "flex", marginTop: 56, alignItems: "center", width: 920, borderRadius: 44, padding: "30px 34px", background: "rgba(221,177,104,0.14)", border: "2px solid rgba(221,177,104,0.45)" }}>
          <div style={{ display: "flex", width: 150, height: 150, borderRadius: 150, overflow: "hidden", alignItems: "center", justifyContent: "center", background: "#1C1C1F", fontSize: 54, fontWeight: 700 }}>
            {mvpAvatar ? <img src={mvpAvatar} width={150} height={150} alt="" style={{ objectFit: "cover" }} /> : a.mvp.name.slice(0, 2).toUpperCase()}
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginLeft: 30, flex: 1 }}>
            <div style={{ display: "flex", fontSize: 26, letterSpacing: 6, fontWeight: 700, color: C.gold }}>{"MVP"}</div>
            <div style={{ display: "flex", fontSize: 58, fontWeight: 800 }}>{a.mvp.name.slice(0, 16)}</div>
            <div style={{ display: "flex", marginTop: 4, fontSize: 28, color: C.mute }}>
              {`${a.mvp.goals} G · ${a.mvp.assists} A · ${a.mvp.motm} MOTM · ${mp(a.mvp)}`}
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 72, fontWeight: 800, color: C.gold }}>{a.mvp.avgRating.toFixed(1)}</div>
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", width: 920, marginTop: 30, justifyContent: "space-between" }}>
        {cells.map((c) => {
          const av = c.l?.playerId ? (face.get(c.l.playerId) ?? null) : null;
          return (
            <div key={c.k} style={{ display: "flex", alignItems: "center", width: 445, marginBottom: 26, borderRadius: 32, background: "rgba(255,255,255,0.05)", padding: "24px 26px" }}>
              {c.l ? (
                <div style={{ display: "flex", width: 92, height: 92, borderRadius: 92, overflow: "hidden", alignItems: "center", justifyContent: "center", background: "#1C1C1F", border: "3px solid rgba(255,255,255,0.14)", fontSize: 32, fontWeight: 700, flexShrink: 0 }}>
                  {av ? <img src={av} width={92} height={92} alt="" style={{ objectFit: "cover" }} /> : c.l.name.slice(0, 2).toUpperCase()}
                </div>
              ) : (
                <div style={{ display: "flex", width: 92, height: 92, borderRadius: 92, alignItems: "center", justifyContent: "center", background: "rgba(215,255,58,0.12)", flexShrink: 0 }}>
                  <svg width="62" height="62" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="29" fill="#F5F5F7" stroke="#0A0A0A" strokeWidth="2.5" />
                    <polygon points="32,20 43.4,28.3 39.1,41.7 24.9,41.7 20.6,28.3" fill="#0A0A0A" />
                    <path d="M32 20 L32 4 M43.4 28.3 L58 23 M39.1 41.7 L48 55 M24.9 41.7 L16 55 M20.6 28.3 L6 23" stroke="#0A0A0A" strokeWidth="2.5" fill="none" />
                    <polygon points="26,3.6 38,3.6 32,9" fill="#0A0A0A" />
                    <polygon points="59.6,20 61,33 55,26" fill="#0A0A0A" />
                    <polygon points="4.4,20 3,33 9,26" fill="#0A0A0A" />
                    <polygon points="44,57.5 53,51 50,58" fill="#0A0A0A" />
                    <polygon points="20,57.5 11,51 14,58" fill="#0A0A0A" />
                  </svg>
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", marginLeft: 22, flex: 1 }}>
                <div style={{ display: "flex", fontSize: 20, letterSpacing: 4, color: C.mute }}>{c.k}</div>
                <div style={{ display: "flex", marginTop: 4, fontSize: 44, fontWeight: 800, lineHeight: 1.05, color: c.v ? C.chalk : C.mute }}>{c.v ?? "—"}</div>
                <div style={{ display: "flex", marginTop: 4, fontSize: 24, color: C.mute }}>{c.l ? `${c.l.name.slice(0, 12)} · ${mp(c.l)}` : c.k === "MATCHES" ? "this session" : "nobody"}</div>
              </div>
            </div>
          );
        })}
      </div>
    </Frame>,
  );
}
