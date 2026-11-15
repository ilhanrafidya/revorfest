import { KITS, type Kit } from "@/lib/kits";

export function Jersey({ kit, className = "" }: { kit: Kit; className?: string }) {
  return (
    <img
      src={`/kits/${kit}.png`}
      alt={`${KITS[kit].label} kit`}
      draggable={false}
      className={`select-none object-contain ${className}`}
    />
  );
}
