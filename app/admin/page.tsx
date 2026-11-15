import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminPanel } from "@/components/admin-panel";
import { avatarUrl, listPlayers } from "@/lib/players";
import { currentPlayer } from "@/lib/session";
import { lastSync, unlinkedGamertags } from "@/lib/stats";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  const me = await currentPlayer();
  if (!me) redirect("/login");
  if (me.role !== "admin") redirect(`/squad/${me.slug}`);
  const [players, unlinked, sync] = await Promise.all([listPlayers({ includeInactive: true }), unlinkedGamertags(), lastSync()]);

  return (
    <section className="mx-auto max-w-3xl px-4 pb-40 pt-24 md:pt-32">
      <p className="eyebrow">Admin</p>
      <h1 className="text-display mb-10 mt-2 text-5xl">Club control.</h1>
      <AdminPanel
        meId={me.id}
        unlinked={unlinked}
        sync={sync}
        players={players.map((p) => ({
          id: p.id,
          name: p.display_name,
          slug: p.slug,
          number: p.jersey_number,
          gamertag: p.ea_gamertag,
          role: p.role,
          active: p.active,
          avatar: avatarUrl(p),
        }))}
      />
    </section>
  );
}
