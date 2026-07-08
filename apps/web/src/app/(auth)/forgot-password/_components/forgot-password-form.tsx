"use client";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { MailCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";
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
import { Link } from "@/i18n/navigation";

type FormValues = { email: string };

export function ForgotPasswordForm() {
  const t = useTranslations("Auth");
  const tv = useTranslations("Validation");
  const [sent, setSent] = useState(false);

  const schema = useMemo(
    () =>
      z.object({ email: z.string().email({ message: tv("emailInvalid") }) }),
    [tv],
  );
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: FormValues) {
    // Always show the confirmation, regardless of whether the account exists,
    // to avoid account enumeration.
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}${ROUTES.resetPassword}`
        : ROUTES.resetPassword;
    await authClient.requestPasswordReset({ email: values.email, redirectTo });
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-soft-stone">
          <MailCheck className="h-5 w-5 text-primary" aria-hidden="true" />
        </div>
        <p className="text-sm leading-relaxed text-body-muted">
          {t("resetLinkSent")}
        </p>
        <Link
          href={ROUTES.signIn}
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {t("backToSignIn")}
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
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("email")}</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder={t("emailPlaceholder")}
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
          {form.formState.isSubmitting ? t("sending") : t("sendResetLink")}
        </Button>
      </form>
    </Form>
  );
}
