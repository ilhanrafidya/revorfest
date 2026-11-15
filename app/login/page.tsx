import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginFlow } from "@/components/login-flow";
import { avatarUrl, listPlayers } from "@/lib/players";
import { currentPlayer } from "@/lib/session";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage() {
  const me = await currentPlayer();
  if (me) redirect(`/squad/${me.slug}`);
  const players = await listPlayers();
  return (
    <LoginFlow
      players={players.map((p) => ({ id: p.id, name: p.display_name, number: p.jersey_number, avatar: avatarUrl(p) }))}
    />
  );
}
