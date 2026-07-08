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
  DialogDescription,
  DialogFooter,
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

import { forkBranch } from "../_actions";

const schema = z.object({ name: z.string().trim().min(1).max(50) });
type FormValues = z.infer<typeof schema>;

interface ForkBranchDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  orgId: string;
  sourceBranchId: string;
  onForked: (newBranchId: string) => void;
}

export function ForkBranchDialog({
  open,
  onClose,
  projectId,
  orgId,
  sourceBranchId,
  onForked,
}: ForkBranchDialogProps) {
  const t = useTranslations("Canvas.branch");
  const tCommon = useTranslations("Common");
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "" },
  });

  useEffect(() => {
    if (open) form.reset({ name: "" });
  }, [open, form]);

  async function onSubmit(values: FormValues) {
    const result = await forkBranch({
      projectId,
      orgId,
      sourceBranchId,
      name: values.name,
    });

    if (!result.success) {
      // forkBranch returns typed codes for name issues; surface those on the
      // field. Anything else (auth, copy failure) is a toast.
      switch (result.error) {
        case "duplicate_name":
          form.setError("name", { message: t("errors.duplicate") });
          break;
        case "name_too_long":
          form.setError("name", { message: t("errors.tooLong") });
          break;
        case "name_required":
          form.setError("name", { message: t("errors.required") });
          break;
        default:
          toast.error(t("errors.forkFailed"));
      }
      return;
    }

    toast.success(t("forkSuccess", { name: result.data.branch.name }));
    onForked(result.data.branch.id);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("forkTitle")}</DialogTitle>
          <DialogDescription>{t("forkDescription")}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="mt-4 flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("namePlaceholder")}</FormLabel>
                  <FormControl>
                    <Input
                      autoFocus
                      placeholder={t("namePlaceholder")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? t("forking") : t("forkConfirm")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
