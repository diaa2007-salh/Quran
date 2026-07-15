import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export interface CampSettings {
  campName: string;
  logoUrl: string | null;
  welcomeText: string | null;
  primaryColor: string;
}

const FALLBACK_SETTINGS: CampSettings = {
  campName: "Quran Halaqat Camp",
  logoUrl: null,
  welcomeText: null,
  primaryColor: "#0f766e",
};

/**
 * Cached read for the root layout, Navbar, and login page - Server
 * Components only. Deliberately lives in its own file, separate from
 * lib/actions/settings.ts: that file now has file-level "use server" (see
 * its comments for why), and every export in a "use server" file is
 * pulled into the client bundle as an RPC stub the moment ANY Client
 * Component imports from it - fine for a real action, but this function
 * calls prisma directly and was never meant to be client-reachable. Two
 * files with two different jobs, instead of one file where a Client
 * Component importing `updateSettings` could accidentally drag this one
 * along too.
 *
 * Deliberately uses unstable_cache rather than the "use cache" directive:
 * "use cache" needs `cacheComponents: true` set in next.config.js to
 * behave reliably, and this doesn't assume you've opted into that.
 */
export const getSettings = unstable_cache(
  async (): Promise<CampSettings> => {
    const settings = await prisma.settings.findUnique({
      where: { id: "global" },
    });
    if (!settings) return FALLBACK_SETTINGS; // fresh DB, not seeded yet
    return {
      campName: settings.campName,
      logoUrl: settings.logoUrl,
      welcomeText: settings.welcomeText,
      primaryColor: settings.primaryColor,
    };
  },
  ["global-settings"],
  { tags: ["settings"], revalidate: 3600 }
);
