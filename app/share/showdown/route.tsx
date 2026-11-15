import { winners } from "@/lib/clips";
import { thumbUrl } from "@/lib/clip-url";
import { C, Frame, asset, remoteImage, story } from "@/lib/share";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const cat = u.searchParams.get("cat") === "notw" ? "notw" : "gotw";
  const week = u.searchParams.get("week");
  const list = await winners(cat);
  const w = week ? list.find((x) => x.weekKey === week) : list[0];
  if (!w) return new Response("No winner", { status: 404 });
  const fame = cat === "gotw";
  const accent = fame ? C.gold : C.red;
  const [crest, thumb] = await Promise.all([asset(req, "/brand/crest.png"), remoteImage(thumbUrl(w.provider, w.embedId))]);
  const who = w.featuring?.name ?? w.submitter.name;

  return story(
    <Frame crest={crest} eyebrow={fame ? "GOAL OF THE WEEK" : "NYUNDA OF THE WEEK"} accent={accent} glow={fame ? "rgba(221,177,104,0.38)" : "rgba(255,69,58,0.32)"}>
      <div style={{ display: "flex", marginTop: 14, fontSize: 30, color: C.mute }}>{w.weekLabel}</div>
      <div style={{ display: "flex", marginTop: 110, width: 940, height: 529, borderRadius: 44, overflow: "hidden", border: `4px solid ${accent}`, background: "#111", alignItems: "center", justifyContent: "center" }}>
        {thumb ? (
          <img src={thumb} width={940} height={529} alt="" style={{ objectFit: "cover" }} />
        ) : (
          <div style={{ display: "flex", fontSize: 60, color: C.mute }}>{fame ? "⚽" : "🤡"}</div>
        )}
      </div>
      {w.caption && (
        <div style={{ display: "flex", marginTop: 60, width: 900, justifyContent: "center", textAlign: "center", fontSize: 64, fontWeight: 800, letterSpacing: -2, lineHeight: 1.1 }}>{`“${w.caption}”`}</div>
      )}
      <div style={{ display: "flex", marginTop: 40, fontSize: 90, fontWeight: 800, letterSpacing: -3, color: fame ? "#F7E2B0" : C.chalk }}>{who}</div>
      <div style={{ display: "flex", marginTop: "auto", marginBottom: 50, fontSize: 44, fontWeight: 800, color: "#000", background: accent, padding: "14px 44px", borderRadius: 60 }}>
        {`${w.votes ?? 0} VOTES`}
      </div>
    </Frame>,
  );
}
