import { Users, BookOpen, Clock, UserX } from "lucide-react";
import { auth } from "@/auth";
import { getSettings } from "@/lib/settings-data";
import { AppShell, type NavItem } from "@/components/shared/AppShell";

const TEACHER_NAV_ITEMS: NavItem[] = [
  { href: "/teacher/students", label: "أسماء التلاميذ", icon: Users },
  { href: "/teacher/memorization", label: "التحفيظ الأسبوعي", icon: BookOpen },
  { href: "/teacher/lateness", label: "التأخر اليومي", icon: Clock },
  { href: "/teacher/absence", label: "الغياب اليومي", icon: UserX },
];

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, settings] = await Promise.all([auth(), getSettings()]);

  return (
    <AppShell
      navItems={TEACHER_NAV_ITEMS}
      roleLabel="معلّم"
      userName={session?.user?.name ?? ""}
      campName={settings.campName}
      logoUrl={settings.logoUrl}
      homeHref="/teacher"
    >
      {children}
    </AppShell>
  );
}
