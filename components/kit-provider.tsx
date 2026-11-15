"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { isKit, type Kit } from "@/lib/kits";

const KitContext = createContext<{ kit: Kit; setKit: (k: Kit) => void }>({
  kit: "away",
  setKit: () => {},
});

export function KitProvider({ children }: { children: ReactNode }) {
  const [kit, setKitState] = useState<Kit>("away");

  useEffect(() => {
    const current = document.documentElement.dataset.kit;
    if (isKit(current)) setKitState(current);
  }, []);

  const setKit = useCallback((k: Kit) => {
    setKitState(k);
    document.documentElement.dataset.kit = k;
    try {
      localStorage.setItem("rf-kit", k);
    } catch {
      /* storage unavailable */
    }
  }, []);

  return <KitContext.Provider value={{ kit, setKit }}>{children}</KitContext.Provider>;
}

export const useKit = () => useContext(KitContext);
