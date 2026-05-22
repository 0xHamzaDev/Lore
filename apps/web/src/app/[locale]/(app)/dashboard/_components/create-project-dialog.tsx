"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from "@lore/ui";
import { createProject } from "../_actions";

const schema = z.object({
  name: z.string().min(1),
});
type FormValues = z.infer<typeof schema>;

interface CreateProjectDialogProps {
  orgId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onUpgradeRequired: () => void;
}

export function CreateProjectDialog({
  orgId,
  open,
  onClose,
  onSuccess,
  onUpgradeRequired,
}: CreateProjectDialogProps) {
  const t = useTranslations();
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    const result = await createProject({ orgId, name: values.name });

    if (!result.success) {
      if (result.error === "upgrade_required") {
        onClose();
        onUpgradeRequired();
        return;
      }
      toast.error(t("Common.error"));
      return;
    }

    form.reset();
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Dashboard.newProject")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("Dashboard.newProject")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("Projects.namePlaceholder")} autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                {t("Common.cancel")}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? t("Projects.creating") : t("Common.confirm")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
