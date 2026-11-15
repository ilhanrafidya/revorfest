"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { m } from "motion/react";
import { HomeIcon, PitchIcon, PlayIcon, SquadIcon, StatsIcon } from "./icons";
import { SPRING_SNAPPY } from "@/lib/motion";

const TABS = [
  { href: "/", label: "Home", Icon: HomeIcon },
  { href: "/squad", label: "Squad", Icon: SquadIcon },
  { href: "/matchday", label: "Matchday", Icon: PitchIcon },
  { href: "/stats", label: "Stats", Icon: StatsIcon },
  { href: "/showdown", label: "Showdown", Icon: PlayIcon },
];

function useActive() {
  const pathname = usePathname();
  return (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));
}

export function TopNav() {
  const isActive = useActive();
  return (
    <header className="fixed inset-x-0 top-4 z-50 hidden justify-center md:flex">
      <nav className="glass hairline flex items-center gap-1 rounded-full p-1.5 shadow-2xl shadow-black/40">
        <Link href="/" className="mr-2 flex items-center gap-2 rounded-full py-1 pl-2 pr-3">
          <img src="/brand/crest.png" alt="" className="size-7" />
          <span className="text-sm font-semibold tracking-tight">Revorfest</span>
        </Link>
        {TABS.map(({ href, label }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`relative rounded-full px-4 py-2 text-sm transition-colors ${
                active ? "text-chalk" : "text-mute hover:text-chalk"
              }`}
            >
              {active && (
                <m.span layoutId="top-pill" transition={SPRING_SNAPPY} className="absolute inset-0 rounded-full bg-white/10" />
              )}
              <span className="relative">{label}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

export function BottomTabBar() {
  const isActive = useActive();
  return (
    <nav
      className="glass hairline fixed inset-x-3 z-50 grid grid-cols-5 rounded-[26px] p-1.5 shadow-2xl shadow-black/60 md:hidden"
      style={{ bottom: "calc(10px + env(safe-area-inset-bottom))" }}
    >
      {TABS.map(({ href, label, Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            className={`relative flex flex-col items-center gap-1 rounded-[20px] py-2 text-[10px] font-medium transition-colors ${
              active ? "text-chalk" : "text-mute"
            }`}
          >
            {active && (
              <m.span layoutId="tab-pill" transition={SPRING_SNAPPY} className="absolute inset-0 rounded-[20px] bg-white/[0.07]" />
            )}
            <Icon className="relative size-[22px]" />
            <span className="relative">{label}</span>
            {active && (
              <m.span
                layoutId="tab-dot"
                transition={SPRING_SNAPPY}
                className="absolute bottom-0.5 size-1 rounded-full bg-accent transition-colors duration-700"
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
