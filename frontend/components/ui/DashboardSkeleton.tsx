import { Skeleton } from '@/components/ui/skeleton';

// ─────────────────────────────────────────────────────────────────────────────
// KPI card skeleton
// ─────────────────────────────────────────────────────────────────────────────
function KPISkeleton() {
  return (
    <div className="relative flex flex-col gap-2.5 p-3.5 rounded-xl border border-border bg-bg-card/60 border-l-[3px] border-l-border-strong">
      <div className="flex items-center justify-between">
        <Skeleton className="h-2.5 w-24 rounded-full" />
        <Skeleton className="w-6 h-6 rounded-lg flex-shrink-0" />
      </div>
      <Skeleton className="h-6 w-32 rounded-md" />
      <div className="flex items-center justify-between mt-0.5">
        <Skeleton className="h-4 w-14 rounded-full" />
        <Skeleton className="h-2 w-20 rounded-full" />
      </div>
      <Skeleton className="h-[2px] w-full rounded-full mt-0.5" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Chart card skeleton — animated bar silhouette
// ─────────────────────────────────────────────────────────────────────────────
function ChartSkeleton({ height = 240 }: { height?: number }) {
  return (
    <div className="rounded-xl border border-border bg-bg-card/60 p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-3.5 w-40 rounded-full" />
          <Skeleton className="h-2.5 w-28 rounded-full" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      {/* Chart area */}
      <div className="rounded-lg bg-bg-input/50 relative" style={{ height }}>
        {/* Fake bars */}
        <div className="absolute bottom-6 inset-x-5 flex items-end gap-2 justify-around">
          {[55, 78, 42, 92, 65, 73, 50, 85, 60, 70].map((h, i) => (
            <Skeleton
              key={i}
              className="flex-1 rounded-sm"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
        {/* X-axis line */}
        <div className="absolute bottom-4 inset-x-4 h-px bg-border" />
        {/* Y-axis labels */}
        <div className="absolute left-1 top-3 bottom-8 flex flex-col justify-between">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-1.5 w-6 rounded-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Table skeleton
// ─────────────────────────────────────────────────────────────────────────────
function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-border bg-bg-card/60 overflow-hidden">
      {/* Card header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-3">
        <Skeleton className="h-3.5 w-32 rounded-full" />
        <Skeleton className="h-2.5 w-24 rounded-full" />
      </div>
      {/* Column headers */}
      <div className="px-4 py-2.5 border-b border-border bg-bg-base/40 flex gap-4">
        {[130, 90, 75, 85, 65].map((w, i) => (
          <Skeleton key={i} className="h-2 rounded-full" style={{ width: w }} />
        ))}
      </div>
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-4 py-3 border-b border-border/50 flex gap-4 last:border-0">
          {[130, 90, 75, 85, 65].map((w, j) => (
            <Skeleton
              key={j}
              className="h-2 rounded-full"
              style={{ width: Math.round(w * (0.6 + (((i + j) * 37) % 100) / 200)) }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Named skeleton presets for each dashboard
// ─────────────────────────────────────────────────────────────────────────────

/** Financial, Risk, Digital, KPI — 4+4 KPIs + 2 charts + 1 wide chart */
export function StandardDashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-6 page-enter">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => <KPISkeleton key={i} />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => <KPISkeleton key={i} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ChartSkeleton height={240} />
        <ChartSkeleton height={240} />
      </div>
      <ChartSkeleton height={200} />
    </div>
  );
}

/** Executive — 4+4 KPIs + wide chart + 2 charts */
export function ExecutiveDashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-6 page-enter">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => <KPISkeleton key={i} />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => <KPISkeleton key={i} />)}
      </div>
      <ChartSkeleton height={260} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ChartSkeleton height={220} />
        <ChartSkeleton height={220} />
      </div>
    </div>
  );
}

/** Branch — 4 KPIs + 2 charts + table */
export function BranchDashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-6 page-enter">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => <KPISkeleton key={i} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ChartSkeleton height={240} />
        <ChartSkeleton height={240} />
      </div>
      <TableSkeleton rows={8} />
    </div>
  );
}

/** Customer — search bar + 4 KPIs + table */
export function CustomerDashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-6 page-enter">
      <div className="flex gap-2">
        <Skeleton className="h-9 flex-1 rounded-xl" />
        <Skeleton className="h-9 w-24 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => <KPISkeleton key={i} />)}
      </div>
      <TableSkeleton rows={10} />
    </div>
  );
}
