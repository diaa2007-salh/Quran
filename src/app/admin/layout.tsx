import { Users, Clock, UserX, GraduationCap, ActivitySquare } from "lucide-react";
import { auth } from "@/auth";
import { getSettings } from "@/lib/settings-data";
import { AppShell, type NavItem } from "@/components/shared/AppShell";

const ADMIN_NAV_ITEMS: NavItem[] = [
  { href: "/admin/students", label: "قائمة جميع التلاميذ", icon: Users },
  { href: "/admin/lateness", label: "تأخرات جميع التلاميذ", icon: Clock },
  { href: "/admin/absence", label: "غيابات جميع التلاميذ", icon: UserX },
  { href: "/admin/teachers", label: "قائمة الأساتذة", icon: GraduationCap },
  {
    href: "/admin/monitoring",
    label: "لوحة حالة مراقبة الأساتذة",
    icon: ActivitySquare,
  },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, settings] = await Promise.all([auth(), getSettings()]);

  return (
    <AppShell
      navItems={ADMIN_NAV_ITEMS}
      roleLabel="مدير"
      userName={session?.user?.name ?? ""}
      campName={settings.campName}
      logoUrl={settings.logoUrl}
      homeHref="/admin"
    >
      {children}
    </AppShell>
  );
}
