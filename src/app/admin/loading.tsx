export default function AdminLoading() {
  return (
    <div className="space-y-5" aria-live="polite" aria-label="Chargement">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2 min-w-0">
          <div className="h-7 w-48 sm:w-56 max-w-[65vw] rounded-lg bg-[#153f2b]/10 animate-pulse" />
          <div className="h-3 w-64 max-w-[70vw] rounded bg-[#c9a052]/10 animate-pulse" />
        </div>
        <div className="h-10 w-24 sm:w-28 rounded-xl bg-[#153f2b]/10 animate-pulse" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-20 sm:h-24 rounded-2xl border border-[#eadfca] bg-white animate-pulse"
          />
        ))}
      </div>

      <div className="rounded-2xl border border-[#eadfca] bg-white p-4 space-y-3">
        <div className="h-10 rounded-xl bg-[#153f2b]/5 animate-pulse" />
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-12 rounded-xl bg-[#FBF6EC] animate-pulse" />
        ))}
      </div>
    </div>
  )
}
