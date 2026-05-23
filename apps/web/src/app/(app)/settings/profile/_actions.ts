"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@lore/auth";
import { requireAuth } from "@lore/auth/guard";
import type { ActionResult } from "@lore/utils";

const UpdateProfileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
});

export async function updateProfileAction(input: unknown): Promise<ActionResult<{ name: string }>> {
  try {
    await requireAuth();
    const data = UpdateProfileSchema.parse(input);
    const h = await headers();

    await auth.api.updateUser({
      headers: h,
      body: { name: data.name },
    });

    revalidatePath("/settings/profile");
    return { success: true, data: { name: data.name } };
  } catch (err) {
    console.error("[updateProfileAction]", err);
    return { success: false, error: "Failed to update profile." };
  }
}
