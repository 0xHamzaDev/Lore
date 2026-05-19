import type { ReactNode } from "react";

interface TopbarProps {
  title: string;
  action?: ReactNode;
}

export function Topbar({ title, action }: TopbarProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-[#e5e7eb] bg-white px-6">
      <h1 className="text-base font-semibold text-[#17171c]">{title}</h1>
      {action && <div>{action}</div>}
    </header>
  );
}
