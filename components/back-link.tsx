"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const ICON = (
  <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M15 18l-6-6 6-6" />
  </svg>
);
const PILL = "glass hairline items-center gap-1.5 rounded-full py-2 pl-3 pr-4 text-sm font-semibold transition hover:bg-white/10 active:scale-95";

/**
 * The one back button used across the app.
 * Mobile: pinned top-left like a native app header (portalled to <body> so page transitions
 * can't un-fix it), mirroring the account chip on the right. Desktop: inline at the top of the page.
 */
export function BackLink({ href, label, className = "" }: { href: string; label: string; className?: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <>
      <Link href={href} className={`${PILL} hidden md:inline-flex ${className}`}>
        {ICON}
        {label}
      </Link>
      {/* mobile: the pinned pill floats over the page, so leave it room */}
      <span aria-hidden className="block h-8 md:hidden" />
      {mounted &&
        createPortal(
          <Link
            href={href}
            style={{ top: "calc(14px + env(safe-area-inset-top))" }}
            className={`${PILL} fixed left-4 z-50 inline-flex shadow-xl shadow-black/50 md:hidden`}
          >
            {ICON}
            {label}
          </Link>,
          document.body,
        )}
    </>
  );
}
