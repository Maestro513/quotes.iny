export default function SkeletonCard() {
  return (
    <div
      className="rounded-[14px] bg-white px-[22px] pt-5 pb-[18px] flex flex-col animate-pulse"
      style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.22), 0 2px 4px rgba(0,0,0,0.08)" }}
    >
      {/* tier badges row */}
      <div className="min-h-[22px] mb-2 flex gap-1.5">
        <div className="h-[18px] w-20 rounded bg-[#f0eaf6]" />
      </div>

      {/* carrier logo */}
      <div className="h-[30px] mb-2 flex justify-center">
        <div className="h-5 w-32 rounded bg-[#f0eaf6]" />
      </div>

      {/* plan name */}
      <div className="min-h-[44px] flex flex-col items-center justify-center gap-1">
        <div className="h-4 w-3/4 rounded bg-[#f0eaf6]" />
        <div className="h-3 w-1/2 rounded bg-[#f4eef9]" />
      </div>

      {/* rating */}
      <div className="flex justify-center gap-2 mt-1.5">
        <div className="h-3 w-20 rounded bg-[#f4eef9]" />
        <div className="h-3 w-16 rounded bg-[#f4eef9]" />
      </div>

      {/* premium */}
      <div className="mt-3 flex flex-col items-center gap-2">
        <div className="h-12 w-24 rounded bg-[#f0eaf6]" />
        <div className="h-3 w-24 rounded bg-[#f4eef9]" />
      </div>

      {/* giveback pill */}
      <div className="mt-3 mx-auto h-7 w-3/4 rounded-lg bg-[#e6f6ec]" />

      {/* 2x2 stats */}
      <div className="grid grid-cols-2 border-t border-b border-[#ece8f1] mt-3.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`px-1.5 py-2.5 flex flex-col items-center gap-1 ${i % 2 === 1 ? "border-l border-[#ece8f1]" : ""} ${i >= 2 ? "border-t border-[#f3f0f7]" : ""}`}
          >
            <div className="h-2.5 w-14 rounded bg-[#f4eef9]" />
            <div className="h-3 w-10 rounded bg-[#f0eaf6]" />
          </div>
        ))}
      </div>

      {/* benefits title */}
      <div className="mt-4 mb-2 mx-auto h-2.5 w-32 rounded bg-[#f4eef9]" />

      {/* 4-cell benefits */}
      <div className="grid grid-cols-4 gap-1.5 mb-3.5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 py-1">
            <div className="w-[34px] h-[34px] rounded-full bg-[#f0eaf6]" />
            <div className="h-2.5 w-12 rounded bg-[#f4eef9]" />
            <div className="h-2.5 w-10 rounded bg-[#f4eef9]" />
          </div>
        ))}
      </div>

      {/* doc-lookup */}
      <div className="mb-3.5 h-9 rounded-lg bg-[#faf7fd] border border-[#ede4f5]" />

      {/* footer */}
      <div className="flex items-center gap-3 mt-auto">
        <div className="flex-1 h-11 rounded-lg bg-[#f0eaf6]" />
        <div className="h-7 w-20 rounded-md bg-[#f4eef9]" />
      </div>

      {/* deadline */}
      <div className="mt-2 mx-auto h-2.5 w-48 rounded bg-[#f4eef9]" />
    </div>
  );
}
