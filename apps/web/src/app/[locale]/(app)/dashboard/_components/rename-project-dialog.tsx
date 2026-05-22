"use client";
import type { Project } from "@lore/db";
interface RenameProjectDialogProps {
  project: Project;
  orgId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}
export function RenameProjectDialog(_props: RenameProjectDialogProps) {
  return null;
}
