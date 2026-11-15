import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/profile-form";
import { avatarUrl, getPlayerById } from "@/lib/players";
import { currentPlayer } from "@/lib/session";
import type { Position } from "@/lib/positions";

export const metadata: Metadata = { title: "My profile" };

export default async function MePage() {
  const me = await currentPlayer();
  if (!me) redirect("/login");
  const p = await getPlayerById(me.id);
  if (!p) redirect("/login");

  return (
    <section className="mx-auto max-w-xl px-4 pb-40 pt-24 md:pt-32">
      <p className="eyebrow">My profile</p>
      <h1 className="text-display mb-10 mt-2 text-5xl">Edit profile.</h1>
      <ProfileForm
        initial={{
          id: p.id,
          name: p.display_name,
          gamertag: p.ea_gamertag,
          number: p.jersey_number,
          primary: p.primary_position as Position,
          secondary: p.secondary_positions as Position[],
          avatar: avatarUrl(p),
        }}
      />
    </section>
  );
}
