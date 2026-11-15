import { MILESTONES, milestonesFor, type MilestoneStat } from "@/lib/awards";
import { getPlayerBySlug } from "@/lib/players";
import { Avatar, C, Frame, asset, avatarData, story } from "@/lib/share";
import { memberStats } from "@/lib/stats";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const p = await getPlayerBySlug(u.searchParams.get("slug") ?? "");
  const stat = u.searchParams.get("stat") as MilestoneStat;
  const n = Number(u.searchParams.get("n"));
  if (!p || !(stat in MILESTONES)) return new Response("Bad request", { status: 400 });
  const career = await memberStats(p.ea_gamertag);
  if (!milestonesFor(career).some((m) => m.stat === stat && m.n === n)) return new Response("Not reached", { status: 404 });
  const [crest, av] = await Promise.all([asset(req, "/brand/crest.png"), avatarData(p.id)]);
  const label = MILESTONES[stat].label.toUpperCase();

  return story(
    <Frame crest={crest} eyebrow="MILESTONE" accent={C.volt} glow="rgba(61,111,217,0.4)">
      <div style={{ display: "flex", marginTop: 14, fontSize: 30, color: C.mute }}>{"Club career · Revorfest"}</div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 110 }}>
        <div style={{ display: "flex", fontSize: n >= 100 ? 300 : 360, fontWeight: 800, letterSpacing: -14, lineHeight: 0.9, color: C.volt }}>{String(n)}</div>
        <div style={{ display: "flex", marginTop: 10, fontSize: 52, fontWeight: 800, letterSpacing: 10 }}>{label}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", marginTop: "auto", marginBottom: 80, gap: 36 }}>
        <Avatar src={av} name={p.display_name} size={260} ring={C.volt} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 96, fontWeight: 800, letterSpacing: -4, lineHeight: 1 }}>{p.display_name}</div>
          <div style={{ display: "flex", marginTop: 10, fontSize: 32, color: C.mute }}>{`@${p.ea_gamertag} · ${p.primary_position}`}</div>
        </div>
      </div>
    </Frame>,
  );
}
