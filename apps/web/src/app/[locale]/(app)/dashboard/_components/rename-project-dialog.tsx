"use client";

import { useEffect } from "react";
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
import type { Project } from "@lore/db";
import { renameProject } from "../_actions";

const schema = z.object({ name: z.string().min(1) });
type FormValues = z.infer<typeof schema>;

interface RenameProjectDialogProps {
  project: Project;
  orgId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RenameProjectDialog({
  project,
  orgId,
  open,
  onClose,
  onSuccess,
}: RenameProjectDialogProps) {
  const t = useTranslations();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: project.name },
  });

  // Reset form when a different project is targeted
  useEffect(() => {
    form.reset({ name: project.name });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id, form]);

  async function onSubmit(values: FormValues) {
    const result = await renameProject({
      projectId: project.id,
      orgId,
      name: values.name,
    });

    if (!result.success) {
      toast.error(t("Common.error"));
      return;
    }

    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Projects.renameTitle")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("Projects.renameTitle")}</FormLabel>
                  <FormControl>
                    <Input autoFocus {...field} />
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
                {t("Common.save")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
