export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse px-4 pb-40 pt-24 md:px-6 md:pt-32" aria-busy="true" aria-label="Loading">
      <div className="h-3 w-20 rounded-full bg-accent/30" />
      <div className="mt-4 h-12 w-3/4 max-w-md rounded-2xl bg-white/[0.07] md:h-16" />
      <div className="mt-3 h-12 w-1/2 max-w-xs rounded-2xl bg-white/[0.05] md:h-16" />
      <div className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className={`tile h-40 ${i === 0 ? "col-span-2 md:row-span-2 md:h-auto" : ""}`} />
        ))}
      </div>
    </div>
  );
}
