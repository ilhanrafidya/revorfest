export function Footer() {
  return (
    <footer className="mx-auto max-w-6xl px-5 pb-36 md:pb-14">
      <div className="flex flex-col items-start gap-4 border-t border-white/[0.08] pt-8 text-xs text-mute md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <img src="/brand/crest.png" alt="" className="size-8" />
          <span>Revorfest · EA Sports FC Pro Clubs · PS5 &amp; PC cross-play</span>
        </div>
        <span>Fan-made club app. Not affiliated with EA Sports.</span>
      </div>
    </footer>
  );
}
