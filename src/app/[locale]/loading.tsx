export default function StorefrontLoading() {
  return (
    <div className="min-h-[60vh] bg-[#FBF6EC] px-4 sm:px-6 lg:px-10 py-8" aria-live="polite" aria-label="Chargement">
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="h-8 w-48 rounded-lg bg-[#153f2b]/10 animate-pulse" />
        <div className="h-4 w-72 max-w-[75vw] rounded bg-[#c9a052]/10 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-[#eadfca] bg-white p-3">
              <div className="aspect-square rounded-xl bg-[#153f2b]/5 animate-pulse" />
              <div className="h-4 w-3/4 rounded bg-[#153f2b]/8 mt-3 animate-pulse" />
              <div className="h-3 w-1/2 rounded bg-[#c9a052]/10 mt-2 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
