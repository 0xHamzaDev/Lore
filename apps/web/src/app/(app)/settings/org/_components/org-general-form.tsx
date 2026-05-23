"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from "@lore/ui";
import { updateOrgAction } from "../_actions";

const schema = z.object({
  name: z.string().trim().min(1).max(80),
});

type FormValues = z.infer<typeof schema>;

interface OrgGeneralFormProps {
  orgId: string;
  orgName: string;
  orgSlug: string | null;
  createdAt: Date | null;
  canEdit: boolean;
}

function formatDate(d: Date | null, locale: string) {
  if (!d) return "—";
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

export function OrgGeneralForm({
  orgId,
  orgName,
  orgSlug,
  createdAt,
  canEdit,
}: OrgGeneralFormProps) {
  const t = useTranslations("Settings.org");
  const tCommon = useTranslations("Common");
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: orgName },
  });

  async function onSubmit(values: FormValues) {
    const result = await updateOrgAction({ orgId, name: values.name });
    if (result.success) {
      toast.success(tCommon("save"));
      form.reset({ name: result.data.name });
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  const locale = typeof document !== "undefined" ? document.documentElement.lang : "ar";

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("orgName")}</FormLabel>
              <FormControl>
                <Input {...field} disabled={!canEdit} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <FormItem>
            <FormLabel>{t("orgSlug")}</FormLabel>
            <FormControl>
              <Input value={orgSlug ?? ""} readOnly disabled />
            </FormControl>
          </FormItem>

          <FormItem>
            <FormLabel>{t("createdAt")}</FormLabel>
            <FormControl>
              <Input value={formatDate(createdAt, locale)} readOnly disabled />
            </FormControl>
          </FormItem>
        </div>

        {canEdit ? (
          <div className="flex justify-end">
            <Button type="submit" disabled={form.formState.isSubmitting || !form.formState.isDirty}>
              {tCommon("save")}
            </Button>
          </div>
        ) : null}
      </form>
    </Form>
  );
}
