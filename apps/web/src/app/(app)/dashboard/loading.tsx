import { Skeleton } from "@lore/ui";

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-8 p-6 lg:p-10">
      <div className="flex flex-col gap-3 border-b border-border-light pb-6">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-sm" />
        ))}
      </div>
    </div>
  );
}
