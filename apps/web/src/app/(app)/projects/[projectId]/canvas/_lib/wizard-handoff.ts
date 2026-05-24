// Hands the story brief from the dashboard dialog to the canvas across a client
// navigation. sessionStorage (not the URL) avoids leaking a long brief into the
// address bar/history. The canvas reads it once on mount and clears it so a
// refresh doesn't re-run the wizard.
const KEY = (projectId: string) => `lore:wizard:${projectId}`;

export interface WizardBrief {
  brief: string;
  locale: "ar" | "en";
}

export function stashWizardBrief(projectId: string, value: WizardBrief): void {
  try {
    sessionStorage.setItem(KEY(projectId), JSON.stringify(value));
  } catch {
    // sessionStorage unavailable (private mode etc.) — wizard simply won't run.
  }
}

export function takeWizardBrief(projectId: string): WizardBrief | null {
  try {
    const raw = sessionStorage.getItem(KEY(projectId));
    if (!raw) return null;
    sessionStorage.removeItem(KEY(projectId));
    const parsed = JSON.parse(raw) as Partial<WizardBrief>;
    if (typeof parsed.brief !== "string" || (parsed.locale !== "ar" && parsed.locale !== "en")) {
      return null;
    }
    return { brief: parsed.brief, locale: parsed.locale };
  } catch {
    return null;
  }
}
