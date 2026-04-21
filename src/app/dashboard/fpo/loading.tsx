export default function FpoDashboardLoading() {
  return (
    <div className="flex h-screen overflow-hidden bg-[#f8f9fa]">
      {/* Sidebar skeleton */}
      <aside className="hidden lg:flex flex-col h-full py-4 bg-slate-50 w-64 shrink-0 animate-pulse">
        <div className="px-6 mb-8">
          <div className="h-5 w-24 bg-slate-200 rounded mb-2" />
          <div className="h-3 w-32 bg-slate-100 rounded" />
        </div>
        <nav className="flex-1 space-y-1 px-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-lg">
              <div className="h-5 w-5 bg-slate-200 rounded" />
              <div className="h-4 w-28 bg-slate-200 rounded" />
            </div>
          ))}
        </nav>
      </aside>

      {/* Main content skeleton */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="h-[52px] bg-white/80 shadow-sm flex items-center px-6 gap-8 shrink-0">
          <div className="h-5 w-20 bg-slate-200 rounded animate-pulse" />
          <div className="h-4 w-32 bg-slate-100 rounded animate-pulse hidden md:block" />
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          {/* Asymmetric header */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-3">
              <div className="h-10 w-64 bg-slate-200 rounded animate-pulse" />
              <div className="h-4 w-96 bg-slate-100 rounded animate-pulse" />
            </div>
            <div className="lg:col-span-5 h-32 bg-surface-container-lowest rounded-xl animate-pulse" />
          </div>

          {/* Bento grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6">
              <div className="h-64 bg-surface-container-lowest rounded-xl animate-pulse" />
              <div className="h-48 bg-surface-container-lowest rounded-xl animate-pulse" />
            </div>
            <div className="space-y-6">
              <div className="h-56 bg-surface-container-lowest rounded-xl animate-pulse" />
              <div className="h-32 bg-surface-container-lowest rounded-xl animate-pulse" />
              <div className="h-24 bg-primary/5 rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
