"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { signOutAction } from "@/lib/actions/sign-out";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export function AppShell({
  navItems,
  roleLabel,
  userName,
  campName,
  logoUrl,
  homeHref,
  children,
}: {
  navItems: NavItem[];
  roleLabel: string;
  userName: string;
  campName: string;
  logoUrl: string | null;
  homeHref: string;
  children: React.ReactNode;
}) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const pathname = usePathname();

  // A nav click should close the mobile drawer, not leave it open behind
  // the new page.
  useEffect(() => {
    setIsDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isDrawerOpen) return;
    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsDrawerOpen(false);
    }
    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [isDrawerOpen]);

  return (
    <div className="lg:flex lg:h-dvh">
      {/* Desktop: fixed sidebar, first in DOM so it lands on the right
          (the RTL start side) without any flex-reverse tricks. */}
      <aside className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:border-e lg:border-paper-border lg:bg-paper-surface print:hidden dark:lg:border-ink-border dark:lg:bg-ink-surface">
        <SidebarContent
          navItems={navItems}
          roleLabel={roleLabel}
          userName={userName}
          campName={campName}
          logoUrl={logoUrl}
          pathname={pathname}
          homeHref={homeHref}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex items-center justify-between border-b border-paper-border bg-paper-surface px-4 py-3 lg:hidden print:hidden dark:border-ink-border dark:bg-ink-surface">
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            aria-label="فتح القائمة"
            className="rounded-lg p-2 text-paper-text hover:bg-paper-border/50 dark:text-ink-text dark:hover:bg-ink-border/50"
          >
            <Menu className="size-5" />
          </button>
          <span className="font-[var(--font-display)] text-base font-semibold text-paper-text dark:text-ink-text">
            <Link href={homeHref}>{campName}</Link>
          </span>
          <ThemeToggle />
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">{children}</main>
      </div>

      {/* Mobile drawer - always mounted so the transform transition can
          actually animate; opacity/pointer-events gate visibility. */}
      <div
        className={cn(
          "fixed inset-0 z-40 lg:hidden print:hidden",
          isDrawerOpen ? "pointer-events-auto" : "pointer-events-none"
        )}
        aria-hidden={!isDrawerOpen}
      >
        <div
          className={cn(
            "absolute inset-0 bg-ink/50 transition-opacity duration-200",
            isDrawerOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={() => setIsDrawerOpen(false)}
        />
        <div
          className={cn(
            "absolute inset-y-0 start-0 flex w-72 max-w-[85vw] flex-col bg-paper-surface transition-transform duration-200 ease-out dark:bg-ink-surface",
            isDrawerOpen ? "translate-x-0" : "translate-x-full"
          )}
        >
          <div className="flex items-center justify-end p-3">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              aria-label="إغلاق القائمة"
              className="rounded-full p-2 text-paper-text-muted hover:bg-paper-border/50 dark:text-ink-text-muted dark:hover:bg-ink-border/50"
            >
              <X className="size-4" />
            </button>
          </div>
          <SidebarContent
            navItems={navItems}
            roleLabel={roleLabel}
            userName={userName}
            campName={campName}
            logoUrl={logoUrl}
            pathname={pathname}
            homeHref={homeHref}
            className="pt-0"
          />
        </div>
      </div>
    </div>
  );
}

function SidebarContent({
  navItems,
  roleLabel,
  userName,
  campName,
  logoUrl,
  pathname,
  homeHref,
  className,
}: {
  navItems: NavItem[];
  roleLabel: string;
  userName: string;
  campName: string;
  logoUrl: string | null;
  pathname: string;
  homeHref: string;
  className?: string;
}) {
  return (
    <div className={cn("flex h-full flex-col", className)}>
      <Link
        href={homeHref}
        className="hidden items-center gap-3 border-b border-paper-border px-5 py-5 lg:flex dark:border-ink-border"
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={campName}
            className="size-9 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-[var(--font-display)] text-lg font-semibold text-primary">
            {campName.trim().charAt(0) || "ح"}
          </div>
        )}
        <span className="font-[var(--font-display)] text-lg font-semibold leading-tight text-paper-text dark:text-ink-text">
          {campName}
        </span>
      </Link>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-paper-text-muted hover:bg-paper-border/50 hover:text-paper-text dark:text-ink-text-muted dark:hover:bg-ink-border/50 dark:hover:text-ink-text"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="size-4.5 shrink-0" aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-paper-border p-3 dark:border-ink-border">
        <div className="flex items-center justify-between gap-2 rounded-lg px-2 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-paper-text dark:text-ink-text">
              {userName}
            </p>
            <p className="text-xs text-paper-text-muted dark:text-ink-text-muted">
              {roleLabel}
            </p>
          </div>
          <div className="hidden lg:block">
            <ThemeToggle />
          </div>
        </div>
        <form action={signOutAction}>
          <button
            type="submit"
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-paper-text-muted transition-colors hover:bg-band-red-soft hover:text-band-red dark:text-ink-text-muted dark:hover:bg-band-red/15"
          >
            <LogOut className="size-4.5" aria-hidden="true" />
            تسجيل الخروج
          </button>
        </form>
      </div>
    </div>
  );
}
