"use client";

import { LazyMotion, MotionConfig, domMax } from "motion/react";
import type { ReactNode } from "react";
import { KitProvider } from "./kit-provider";
import { EASE } from "@/lib/motion";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domMax}>
      <MotionConfig reducedMotion="user" transition={{ duration: 0.6, ease: EASE }}>
        <KitProvider>{children}</KitProvider>
      </MotionConfig>
    </LazyMotion>
  );
}
