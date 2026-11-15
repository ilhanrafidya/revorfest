import { seasonWinners } from "@/lib/awards";
import { rangeTable, type WeeklyLine } from "@/lib/honors";
import { seasonAt, seasonByNumber } from "@/lib/seasons";
import { Avatar, C, Frame, asset, avatarData, story } from "@/lib/share";

export async function GET(req: Request) {
  const nParam = Number(new URL(req.url).searchParams.get("n"));
  const season = (nParam ? seasonByNumber(nParam) : null) ?? seasonAt();
  const now = new Date();
  const live = season.end > now;
  const table = await rangeTable(season.start, live ? now : season.end);
  const w = seasonWinners(table);
  if (!w.pots && !w.boot && !w.assist) return new Response("No season data yet", { status: 404 });
  const [crest, potsAv, bootAv, astAv] = await Promise.all([
    asset(req, "/brand/crest.png"),
    avatarData(w.pots?.playerId ?? null),
    avatarData(w.boot?.playerId ?? null),
    avatarData(w.assist?.playerId ?? null),
  ]);

  const mini = (label: string, l: WeeklyLine | null, av: string | null, value: string) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 440, borderRadius: 44, background: "rgba(221,177,104,0.1)", border: "2px solid rgba(221,177,104,0.3)", padding: "40px 20px" }}>
      <div style={{ display: "flex", fontSize: 26, letterSpacing: 5, fontWeight: 700, color: C.gold }}>{label}</div>
      <div style={{ display: "flex", marginTop: 26 }}>
        <Avatar src={av} name={l?.name ?? "?"} size={200} ring={C.gold} />
      </div>
      <div style={{ display: "flex", marginTop: 22, fontSize: 48, fontWeight: 800 }}>{l?.name ?? "—"}</div>
      <div style={{ display: "flex", marginTop: 4, fontSize: 34, color: C.goldHi, fontWeight: 700 }}>{l ? value : ""}</div>
    </div>
  );

  return story(
    <Frame crest={crest} eyebrow={live ? `${season.name.toUpperCase()} · SO FAR` : `${season.name.toUpperCase()} AWARDS`} accent={C.gold} glow="rgba(221,177,104,0.4)">
      <div style={{ display: "flex", marginTop: 14, fontSize: 30, color: C.mute }}>
        {`${season.start.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${season.end.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`}
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 80 }}>
        <div style={{ display: "flex", fontSize: 32, letterSpacing: 7, fontWeight: 700, color: C.gold }}>{"PLAYER OF THE SEASON"}</div>
        <div style={{ display: "flex", marginTop: 34 }}>
          <Avatar src={potsAv} name={w.pots?.name ?? "?"} size={400} ring={C.gold} />
        </div>
        <div style={{ display: "flex", marginTop: 34, fontSize: 110, fontWeight: 800, letterSpacing: -4, color: "#F7E2B0" }}>{w.pots?.name ?? "Not decided"}</div>
        <div style={{ display: "flex", marginTop: 6, fontSize: 32, color: C.mute }}>
          {w.pots ? `${w.pots.avgRating.toFixed(1)} avg · ${w.pots.goals} G · ${w.pots.assists} A · ${w.pots.matches} MP` : "Needs 8+ matches"}
        </div>
      </div>
      <div style={{ display: "flex", width: 920, justifyContent: "space-between", marginTop: "auto", marginBottom: 40 }}>
        {mini("GOLDEN BOOT", w.boot, bootAv, w.boot ? `${w.boot.goals} goals` : "")}
        {mini("TOP ASSIST", w.assist, astAv, w.assist ? `${w.assist.assists} assists` : "")}
      </div>
    </Frame>,
  );
}
