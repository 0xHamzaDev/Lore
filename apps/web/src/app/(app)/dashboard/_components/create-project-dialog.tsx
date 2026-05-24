"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocale, useTranslations } from "next-intl";
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
  Textarea,
} from "@lore/ui";
import { ROUTES } from "@lore/utils";
import { useRouter } from "@/i18n/navigation";
import { stashWizardBrief } from "@/app/(app)/projects/[projectId]/canvas/_lib/wizard-handoff";
import { createProject } from "../_actions";

const schema = z.object({
  name: z.string().min(1),
  brief: z.string().max(2000).optional(),
});
type FormValues = z.infer<typeof schema>;

interface CreateProjectDialogProps {
  orgId: string;
  isPro: boolean;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onUpgradeRequired: () => void;
}

export function CreateProjectDialog({
  orgId,
  isPro,
  open,
  onClose,
  onSuccess,
  onUpgradeRequired,
}: CreateProjectDialogProps) {
  const t = useTranslations();
  const locale = useLocale() as "ar" | "en";
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", brief: "" },
  });

  function resetAndClose() {
    form.reset();
    setStep(1);
    onClose();
  }

  // Step 1 → 2: validate the name only, do NOT create yet.
  async function handleNext() {
    const valid = await form.trigger("name");
    if (valid) setStep(2);
  }

  // Creates the project + main branch. Returns the new projectId or null.
  async function createAndGetId(name: string): Promise<string | null> {
    const result = await createProject({ orgId, name });
    if (!result.success) {
      if (result.error === "upgrade_required") {
        resetAndClose();
        onUpgradeRequired();
        return null;
      }
      toast.error(t("Common.error"));
      return null;
    }
    onSuccess(); // invalidate dashboard list
    return result.data.project.id;
  }

  // Skip: create project, go to a blank canvas.
  async function handleSkip() {
    const name = form.getValues("name").trim();
    const projectId = await createAndGetId(name);
    if (!projectId) return;
    router.push(ROUTES.projects.canvas(projectId));
  }

  // Generate: Pro-gate client-side (no network call for free users), create the
  // project, stash the brief, navigate to the canvas with ?wizard=1.
  async function handleGenerate() {
    if (!isPro) {
      resetAndClose();
      onUpgradeRequired();
      return;
    }
    const brief = (form.getValues("brief") ?? "").trim();
    if (brief.length === 0) {
      form.setError("brief", { message: t("Wizard.briefRequired") });
      return;
    }
    const name = form.getValues("name").trim();
    const projectId = await createAndGetId(name);
    if (!projectId) return;
    stashWizardBrief(projectId, { brief, locale });
    router.push(`${ROUTES.projects.canvas(projectId)}?wizard=1`);
  }

  const submitting = form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && resetAndClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Projects.createTitle")}</DialogTitle>
          <DialogDescription>
            {step === 1 ? t("Projects.createDescription") : t("Wizard.briefDescription")}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="mt-4 flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
            {step === 1 ? (
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("Projects.namePlaceholder")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("Projects.namePlaceholder")} autoFocus {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="brief"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("Wizard.briefLabel")}</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={4}
                        placeholder={t("Wizard.briefPlaceholder")}
                        autoFocus
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              {step === 1 ? (
                <>
                  <Button type="button" variant="outline" onClick={resetAndClose}>
                    {t("Common.cancel")}
                  </Button>
                  <Button type="button" onClick={() => void handleNext()}>
                    {t("Wizard.next")}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleSkip()}
                    disabled={submitting}
                  >
                    {t("Wizard.skip")}
                  </Button>
                  <Button type="button" onClick={() => void handleGenerate()} disabled={submitting}>
                    {t("Wizard.generate")}
                  </Button>
                </>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
