import Link from "next/link";

/** The one back button used across the app. */
export function BackLink({ href, label, className = "" }: { href: string; label: string; className?: string }) {
  return (
    <Link
      href={href}
      className={`glass hairline inline-flex items-center gap-1.5 rounded-full py-2 pl-3 pr-4 text-sm font-semibold transition hover:bg-white/10 active:scale-95 ${className}`}
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M15 18l-6-6 6-6" />
      </svg>
      {label}
    </Link>
  );
}
