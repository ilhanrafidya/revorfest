"use client";

import { m } from "motion/react";
import type { ReactNode } from "react";
import { EASE } from "@/lib/motion";

/** Re-mounts on every navigation: a soft fade + rise between pages. */
export default function Template({ children }: { children: ReactNode }) {
  return (
    <m.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE }}>
      {children}
    </m.div>
  );
}
