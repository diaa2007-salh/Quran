import { getAllGroups } from "@/lib/actions/admin-actions";
import { ReportsView } from "./_components/ReportsView";

export default async function AdminReportsPage() {
  const groups = await getAllGroups();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="print:hidden">
        <h1 className="font-[var(--font-display)] text-2xl font-semibold text-paper-text dark:text-ink-text">
          التقارير والتصدير
        </h1>
        <p className="mt-1 text-sm text-paper-text-muted dark:text-ink-text-muted">
          سجل الحضور أو التحفيظ عبر فترة زمنية، قابل للتصدير أو الطباعة
        </p>
      </div>

      <ReportsView groups={groups.map((g) => ({ id: g.id, name: g.name }))} />
    </div>
  );
}
