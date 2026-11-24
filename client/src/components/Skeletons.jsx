export function CardSkeleton({ count = 3 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-5 space-y-3 animate-pulse"
        >
          <div className="h-3.5 w-40 bg-zinc-100 dark:bg-[#273449] rounded" />
          <div className="h-5 w-4/5 bg-zinc-100 dark:bg-[#273449] rounded" />
          <div className="h-4 w-full bg-zinc-100 dark:bg-[#273449] rounded" />
          <div className="pt-3 border-t border-zinc-100 dark:border-[#334155] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-[#273449]" />
              <div className="h-3.5 w-28 bg-zinc-100 dark:bg-[#273449] rounded" />
            </div>
            <div className="h-7 w-24 bg-zinc-100 dark:bg-[#273449] rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableRowSkeleton({ rows = 5 }) {
  return (
    <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl divide-y divide-zinc-100 dark:divide-[#334155]">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4 flex items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-6 h-4 bg-zinc-100 dark:bg-[#273449] rounded" />
            <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-[#273449]" />
            <div className="space-y-1.5">
              <div className="h-4 w-36 bg-zinc-100 dark:bg-[#273449] rounded" />
              <div className="h-3 w-48 bg-zinc-100 dark:bg-[#273449] rounded" />
            </div>
          </div>
          <div className="h-4 w-20 bg-zinc-100 dark:bg-[#273449] rounded" />
        </div>
      ))}
    </div>
  );
}
