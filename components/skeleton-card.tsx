export default function SkeletonCard() {
  return (
    <div className="rounded-lg p-5 mb-3 border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.07)] animate-pulse">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-white/20 rounded w-1/3" />
          <div className="h-4 bg-white/20 rounded w-2/3" />
          <div className="h-3 bg-white/20 rounded w-1/4" />
        </div>
        <div className="h-8 w-20 bg-white/20 rounded shrink-0" />
      </div>
      <div className="flex gap-4 mt-4">
        <div className="h-3 bg-white/20 rounded w-24" />
        <div className="h-3 bg-white/20 rounded w-24" />
        <div className="h-3 bg-white/20 rounded w-24" />
      </div>
      <div className="flex gap-3 mt-4">
        <div className="h-8 w-28 bg-white/20 rounded-md" />
        <div className="h-8 w-24 bg-white/20 rounded-md" />
      </div>
    </div>
  );
}
