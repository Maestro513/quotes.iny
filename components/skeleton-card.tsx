export default function SkeletonCard() {
  return (
    <div className="rounded-xl p-5 mb-4 backdrop-blur-sm animate-pulse" style={{background:"rgba(255,255,255,0.10)", border:"1px solid rgba(255,255,255,0.20)"}}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-white/10 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-2.5 bg-white/15 rounded-full w-16" />
            <div className="h-3.5 bg-white/15 rounded-full w-48" />
            <div className="h-2.5 bg-white/10 rounded-full w-24" />
          </div>
        </div>
        <div className="text-right shrink-0 space-y-1.5">
          <div className="h-7 w-16 bg-white/15 rounded-lg" />
          <div className="h-2.5 w-8 bg-white/10 rounded-full ml-auto" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4 p-3 rounded-lg bg-black/20">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-2 bg-white/10 rounded-full w-14" />
            <div className="h-3 bg-white/15 rounded-full w-16" />
          </div>
        ))}
      </div>

      <div className="flex gap-3 mt-4">
        <div className="h-9 w-28 bg-white/15 rounded-lg" />
        <div className="h-9 w-24 bg-white/10 rounded-lg" />
      </div>
    </div>
  );
}
