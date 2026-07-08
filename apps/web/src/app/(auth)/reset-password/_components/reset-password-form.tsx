"use client";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { useRouter, Link } from "@/i18n/navigation";
import {
  Button,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
} from "@lore/ui";
import { ROUTES } from "@lore/utils";

type FormValues = { password: string };

export function ResetPasswordForm() {
  const t = useTranslations("Auth");
  const tv = useTranslations("Validation");
  const router = useRouter();
  const searchParams = useSearchParams();
  // better-auth appends the token (and may report ?error=invalid_token).
  const token = searchParams.get("token");
  const error = searchParams.get("error");

  const schema = useMemo(
    () =>
      z.object({
        password: z.string().min(8, { message: tv("passwordMin") }),
      }),
    [tv],
  );
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "" },
  });

  async function onSubmit(values: FormValues) {
    if (!token) return;
    const result = await authClient.resetPassword({
      newPassword: values.password,
      token,
    });
    if ((result as { error?: unknown }).error) {
      toast.error(t("resetFailed"));
      return;
    }
    toast.success(t("resetSuccess"));
    router.push(ROUTES.signIn);
  }

  if (!token || error) {
    return (
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <p className="text-sm leading-relaxed text-body-muted">
          {t("invalidResetLink")}
        </p>
        <Link
          href={ROUTES.forgotPassword}
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {t("requestNewLink")}
        </Link>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("newPassword")}</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="new-password"
                  placeholder={t("passwordPlaceholder")}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="mt-2 w-full"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? t("resetting") : t("resetPassword")}
        </Button>
      </form>
    </Form>
  );
}
