"use client";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { signUp } from "@/lib/auth-client";
import { toast } from "sonner";
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

type FormValues = {
  name: string;
  email: string;
  password: string;
};

export function SignUpForm() {
  const t = useTranslations("Auth");
  const tv = useTranslations("Validation");
  const router = useRouter();
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
        result.error.code === "USER_ALREADY_EXISTS"
          ? t("errors.emailTaken")
          : t("errors.generic");
      toast.error(msg);
      return;
    }

    router.push(
      invitation ? ROUTES.acceptInvitation(invitation) : ROUTES.dashboard,
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
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("name")}</FormLabel>
              <FormControl>
                <Input
                  autoComplete="name"
                  placeholder={t("namePlaceholder")}
                  {...field}
                />
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
        <Button
          type="submit"
          className="mt-2 w-full"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? t("signingUp") : t("signUp")}
        </Button>
      </form>
    </Form>
  );
}
