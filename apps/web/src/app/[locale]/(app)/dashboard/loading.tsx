import { Skeleton } from "@lore/ui";

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-36 w-full rounded-sm" />
        ))}
      </div>
    </div>
  );
}
