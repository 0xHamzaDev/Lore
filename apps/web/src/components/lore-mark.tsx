import { Link } from "@/i18n/navigation";
import { ROUTES } from "@lore/utils";
import { cn } from "@lore/ui";

interface LoreMarkProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  href?: string;
  monogram?: boolean;
}

const SIZE_CLASS: Record<NonNullable<LoreMarkProps["size"]>, string> = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-3xl",
};

export function LoreMark({
  className,
  size = "md",
  href = ROUTES.home,
  monogram = false,
}: LoreMarkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "font-display italic font-light tracking-tight text-primary",
        SIZE_CLASS[size],
        className,
      )}
      aria-label="Lore"
    >
      {monogram ? "L" : "Lore"}
    </Link>
  );
}
