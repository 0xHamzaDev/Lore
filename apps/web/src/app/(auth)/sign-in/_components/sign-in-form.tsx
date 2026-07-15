"use client";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { ROUTES } from "@lore/utils";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Link } from "@/i18n/navigation";
import { signIn } from "@/lib/auth-client";

type FormValues = {
  email: string;
  password: string;
};

export function SignInForm() {
  const t = useTranslations("Auth");
  const tv = useTranslations("Validation");
  const invitation = useSearchParams().get("invitation");
  const schema = useMemo(
    () =>
      z.object({
        email: z.string().email({ message: tv("emailInvalid") }),
        password: z.string().min(1, { message: tv("passwordRequired") }),
      }),
    [tv],
  );
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: FormValues) {
    const result = await signIn.email({
      email: values.email,
      password: values.password,
    });

    if (result.error) {
      toast.error(t("errors.invalidCredentials"));
      return;
    }

    // Hard navigation (not router.push): a soft client navigation races the
    // freshly-set session cookie and lands back on /sign-in even though auth
    // succeeded. A full document request guarantees the cookie is sent.
    window.location.assign(invitation ? ROUTES.acceptInvitation(invitation) : ROUTES.dashboard);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
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
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>{t("password")}</FormLabel>
                <Link
                  href={ROUTES.forgotPassword}
                  className="text-xs text-body-muted underline-offset-4 hover:text-primary hover:underline"
                >
                  {t("forgotPassword")}
                </Link>
              </div>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="current-password"
                  placeholder={t("passwordPlaceholder")}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="mt-2 w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? t("signingIn") : t("signIn")}
        </Button>
      </form>
    </Form>
  );
}
