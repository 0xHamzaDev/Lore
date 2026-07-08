"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from "@lore/ui";
import { updateProfileAction } from "../_actions";

const schema = z.object({
  name: z.string().trim().min(1).max(80),
});

type FormValues = z.infer<typeof schema>;

interface ProfileFormProps {
  user: {
    name: string;
    email: string;
    image?: string | null;
  };
}

export function ProfileForm({ user }: ProfileFormProps) {
  const t = useTranslations("Settings.profile");
  const tCommon = useTranslations("Common");
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: user.name },
  });

  async function onSubmit(values: FormValues) {
    const result = await updateProfileAction(values);
    if (result.success) {
      toast.success(t("saved"));
      form.reset({ name: result.data.name });
      router.refresh();
    } else {
      toast.error(tCommon("error"));
    }
  }

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : (user.email[0]?.toUpperCase() ?? "?");

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-6"
      >
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14">
            <AvatarImage src={user.image ?? undefined} />
            <AvatarFallback className="text-sm">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-primary">
              {t("avatar")}
            </span>
            <span className="text-xs text-body-muted">
              {t("avatarComingSoon")}
            </span>
          </div>
        </div>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("name")}</FormLabel>
              <FormControl>
                <Input placeholder={t("namePlaceholder")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormItem>
          <FormLabel>{t("email")}</FormLabel>
          <FormControl>
            <Input value={user.email} readOnly disabled />
          </FormControl>
          <p className="text-xs text-body-muted">{t("emailReadonly")}</p>
        </FormItem>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={form.formState.isSubmitting || !form.formState.isDirty}
          >
            {form.formState.isSubmitting ? t("saving") : t("save")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
