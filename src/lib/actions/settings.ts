"use server";

import { z } from "zod";
import { updateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { safeParseOrError } from "@/lib/actions/action-result";

// File-level "use server" (not the function-level directive this used to
// have): a Client Component (SettingsPanel.tsx) imports updateSettings
// directly, and file-level is what guarantees the bundler treats every
// export here as an RPC stub, never pulling prisma into the client
// bundle. getSettings AND the CampSettings type live in
// lib/settings-data.ts now, specifically so they're not in this module -
// see that file's comments for the full reason.

const updateSettingsSchema = z.object({
  campName: z.string().min(1),
  logoUrl: z.union([z.string().url(), z.literal("")]).optional(),
  welcomeText: z.string().optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

/**
 * Admin-only. Re-validates on the server even though the settings form
 * should already enforce this client-side - a request can always be forged.
 */
export async function updateSettings(input: UpdateSettingsInput) {
  await requireAdmin();
  const parsed = safeParseOrError(
    updateSettingsSchema,
    input,
    "تحقق من البيانات: اسم المخيم مطلوب، واللون يجب أن يكون بصيغة hex مثل #0f766e."
  );
  if (!parsed.success) return parsed;
  const data = parsed.data;

  await prisma.settings.upsert({
    where: { id: "global" },
    create: {
      id: "global",
      campName: data.campName,
      logoUrl: data.logoUrl || null,
      welcomeText: data.welcomeText || null,
      primaryColor: data.primaryColor,
    },
    update: {
      campName: data.campName,
      logoUrl: data.logoUrl || null,
      welcomeText: data.welcomeText || null,
      primaryColor: data.primaryColor,
    },
  });

  // updateTag (not revalidateTag) deliberately: it's Server-Action-only and
  // gives read-your-own-writes semantics - the admin who just saved sees
  // the change immediately, and it invalidates the shared cache for
  // everyone else too. Next 16's revalidateTag now needs a second cache-
  // profile argument; updateTag needs just the tag.
  updateTag("settings");

  return { success: true as const };
}
