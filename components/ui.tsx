import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  const styles = {
    primary: "bg-accent text-on-accent hover:brightness-110",
    ghost: "glass hairline text-chalk hover:bg-white/10",
    danger: "bg-depleted/15 text-depleted hover:bg-depleted/25",
  }[variant];
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-[15px] font-semibold transition-[background,filter,transform,opacity] duration-300 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 ${styles} ${className}`}
    />
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block text-left">
      <span className="mb-2 block text-sm font-medium text-chalk">{label}</span>
      {children}
      {hint && <span className="mt-2 block text-xs text-mute">{hint}</span>}
    </label>
  );
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`hairline w-full rounded-2xl bg-white/[0.05] px-4 py-3.5 text-base text-chalk outline-none transition placeholder:text-mute/60 focus:border-accent/50 focus:bg-white/[0.08] ${className}`}
    />
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <p className="rounded-2xl bg-depleted/10 px-4 py-3 text-sm text-depleted">{children}</p>;
}
