import { ImageResponse } from "next/og";
import { Avatar, C, Frame, Stat, asset, story } from "@/lib/share";

export async function GET(req: Request) {
  const v = new URL(req.url).searchParams.get("v");
  const crest = await asset(req, "/brand/crest.png");
  switch (v) {
    case "1":
      return new ImageResponse(<div style={{ display: "flex", width: "100%", height: "100%", background: "#000", color: "#fff", fontSize: 60 }}>{"plain"}</div>, { width: 1080, height: 1920 });
    case "2":
      return story(<div style={{ display: "flex", width: "100%", height: "100%", background: "#000", color: "#fff", fontSize: 60 }}>{"via story"}</div>);
    case "3":
      return story(<Frame crest={null} eyebrow="TEST"><div style={{ display: "flex" }}>{"frame"}</div></Frame>);
    case "4":
      return story(<Frame crest={crest} eyebrow="TEST"><div style={{ display: "flex" }}>{"frame+crest"}</div></Frame>);
    case "5":
      return story(<Frame crest={null} eyebrow="TEST"><Avatar src={null} name="KA" size={200} ring={C.gold} /></Frame>);
    case "6":
      return story(<Frame crest={null} eyebrow="TEST"><div style={{ display: "flex" }}><Stat label="A" value="1" /><Stat label="B" value="2" /></div></Frame>);
    case "7":
      return new ImageResponse(<div style={{ display: "flex", width: "100%", height: "100%", background: "radial-gradient(90% 45% at 50% 0%, rgba(215,255,58,0.18), #050505 70%)", padding: "150px 70px 130px" }}>{"bg"}</div>, { width: 1080, height: 1920, headers: { "cache-control": "no-store" } });
    default:
      return new Response(`crest:${crest ? crest.slice(0, 40) : "null"}`);
  }
}
