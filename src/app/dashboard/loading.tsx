export default function DashboardLoading() {
  return (
    <div className="flex h-screen overflow-hidden bg-[#f8f9fa]">
      {/* Sidebar skeleton */}
      <aside className="hidden lg:flex flex-col h-full py-4 bg-slate-50 w-64 shrink-0 animate-pulse">
        <div className="px-6 mb-8">
          <div className="h-5 w-24 bg-slate-200 rounded mb-2" />
          <div className="h-3 w-32 bg-slate-100 rounded" />
        </div>
        <nav className="flex-1 space-y-1 px-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-lg">
              <div className="h-5 w-5 bg-slate-200 rounded" />
              <div className="h-4 w-28 bg-slate-200 rounded" />
            </div>
          ))}
        </nav>
      </aside>

      {/* Main content skeleton */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header skeleton */}
        <div className="h-[52px] bg-white/80 shadow-sm flex items-center px-6 gap-8 shrink-0">
          <div className="h-5 w-20 bg-slate-200 rounded animate-pulse" />
          <div className="h-4 w-32 bg-slate-100 rounded animate-pulse hidden md:block" />
        </div>

        {/* Page skeleton */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          {/* Hero */}
          <div className="rounded-xl bg-gradient-to-br from-emerald-900/30 to-emerald-700/20 h-36 animate-pulse" />

          {/* Cards row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-44 bg-surface-container-lowest rounded-xl animate-pulse" />
            <div className="h-44 bg-surface-container-low rounded-xl animate-pulse" />
          </div>

          {/* Crop cards */}
          <div>
            <div className="h-5 w-32 bg-slate-200 rounded mb-4 animate-pulse" />
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-36 bg-surface-container-low rounded-xl animate-pulse" />
              ))}
            </div>
          </div>

          {/* Bottom row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="h-64 bg-surface-container-lowest rounded-xl animate-pulse" />
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 bg-surface-container-low rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
