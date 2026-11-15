import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { JoinFlow } from "@/components/join-flow";
import { currentPlayer } from "@/lib/session";

export const metadata: Metadata = { title: "Join" };

export default async function JoinPage() {
  const me = await currentPlayer();
  if (me) redirect(`/squad/${me.slug}`);
  return <JoinFlow />;
}
