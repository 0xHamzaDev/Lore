import { useTranslations } from "next-intl";
import { Topbar } from "../_components/topbar";
import { Button } from "@lore/ui";
import { BookOpen } from "lucide-react";

export default function DashboardPage() {
  const t = useTranslations("Dashboard");

  return (
    <>
      <Topbar
        title={t("title")}
        action={
          <Button size="sm" disabled>
            {t("newProject")}
          </Button>
        }
      />
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#eeece7]">
          <BookOpen className="h-8 w-8 text-[#93939f]" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-medium text-[#17171c]">{t("emptyTitle")}</h2>
          <p className="text-sm text-[#93939f]">{t("emptyDescription")}</p>
        </div>
        <Button disabled>{t("newProject")}</Button>
      </div>
    </>
  );
}
