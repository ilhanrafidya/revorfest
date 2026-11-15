export function PlayerAvatar({
  name,
  src,
  className = "size-12 text-sm",
}: {
  name: string;
  src: string | null;
  className?: string;
}) {
  if (src) {
    return <img src={src} alt={name} className={`shrink-0 rounded-full object-cover ring-1 ring-white/10 ${className}`} />;
  }
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full bg-linear-to-br from-accent-2 to-midnight font-semibold text-chalk ring-1 ring-white/10 ${className}`}
    >
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}
