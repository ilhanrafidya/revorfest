"use client";

import { useEffect, useState } from "react";

/** iOS-style frosted strip behind the floating top buttons once you start scrolling (mobile only). */
export function MobileTopBar() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const f = () => setOn(window.scrollY > 8);
    f();
    window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);
  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-x-0 top-0 z-40 transition-opacity duration-300 md:hidden ${on ? "opacity-100" : "opacity-0"}`}
      style={{
        height: "calc(68px + env(safe-area-inset-top))",
        background: "linear-gradient(to bottom, rgba(0,0,0,0.75), rgba(0,0,0,0.35) 70%, transparent)",
        backdropFilter: "blur(14px) saturate(160%)",
        WebkitBackdropFilter: "blur(14px) saturate(160%)",
        maskImage: "linear-gradient(to bottom, #000 60%, transparent)",
        WebkitMaskImage: "linear-gradient(to bottom, #000 60%, transparent)",
      }}
    />
  );
}
