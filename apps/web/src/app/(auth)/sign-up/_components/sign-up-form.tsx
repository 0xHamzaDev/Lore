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
import { signUp } from "@/lib/auth-client";

type FormValues = {
  name: string;
  email: string;
  password: string;
};

export function SignUpForm() {
  const t = useTranslations("Auth");
  const tv = useTranslations("Validation");
  const invitation = useSearchParams().get("invitation");
  const schema = useMemo(
    () =>
      z.object({
        name: z.string().min(1, { message: tv("nameRequired") }),
        email: z.string().email({ message: tv("emailInvalid") }),
        password: z.string().min(8, { message: tv("passwordMin") }),
      }),
    [tv],
  );
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "" },
  });

  async function onSubmit(values: FormValues) {
    const result = await signUp.email({
      email: values.email,
      password: values.password,
      name: values.name,
    });

    if (result.error) {
      const msg =
        result.error.code === "USER_ALREADY_EXISTS" ? t("errors.emailTaken") : t("errors.generic");
      toast.error(msg);
      return;
    }

    // Hard navigation (not router.push): a soft client navigation races the
    // freshly-set session cookie and can land back on /sign-in even though auth
    // succeeded. A full document request guarantees the cookie is sent.
    window.location.assign(invitation ? ROUTES.acceptInvitation(invitation) : ROUTES.dashboard);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("name")}</FormLabel>
              <FormControl>
                <Input autoComplete="name" placeholder={t("namePlaceholder")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
              <FormLabel>{t("password")}</FormLabel>
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
        <Button type="submit" className="mt-2 w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? t("signingUp") : t("signUp")}
        </Button>
      </form>
    </Form>
  );
}
