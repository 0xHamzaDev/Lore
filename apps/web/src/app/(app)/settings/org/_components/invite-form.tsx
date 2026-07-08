"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from "@lore/ui";
import { inviteMemberAction } from "../_actions";

type FormValues = {
  email: string;
  role: "editor" | "viewer";
};

export function InviteForm({ orgId }: { orgId: string }) {
  const t = useTranslations("Settings.org");
  const tCommon = useTranslations("Common");
  const tv = useTranslations("Validation");
  const [open, setOpen] = useState(false);

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().email({ message: tv("emailInvalid") }),
        role: z.enum(["editor", "viewer"]),
      }),
    [tv],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", role: "editor" },
  });

  async function onSubmit(values: FormValues) {
    const result = await inviteMemberAction({ ...values, orgId });
    if (result.success) {
      toast.success(t("inviteSent"));
      setOpen(false);
      form.reset();
    } else {
      toast.error(tCommon("error"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="me-2 h-4 w-4" aria-hidden="true" />
          {t("invite")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("invite")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 pt-2"
          >
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("inviteEmail")}</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="team@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("inviteRole")}</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="flex h-9 w-full rounded-xs border border-border-light bg-canvas px-3 py-1 text-sm text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                    >
                      <option value="editor">{t("roles.editor")}</option>
                      <option value="viewer">{t("roles.viewer")}</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? t("inviting") : t("sendInvite")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
