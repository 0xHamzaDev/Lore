import { Skeleton } from "@lore/ui";

export default function SettingsLoading() {
  return (
    <div className="flex flex-col gap-10">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-32 w-full rounded-sm" />
        </div>
      ))}
    </div>
  );
}
