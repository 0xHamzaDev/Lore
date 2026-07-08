import { Skeleton } from "@lore/ui";

export default function ProjectLoading() {
  return (
    <div className="flex h-dvh w-full flex-col">
      <div className="flex h-12 items-center gap-3 border-b border-border-light px-4">
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <div className="flex flex-1 items-center justify-center">
        <Skeleton className="h-full w-full rounded-none" />
      </div>
    </div>
  );
}
