"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  // Starts false on the server and every first client render (no
  // `document` access in the initializer, so this never crashes during
  // SSR) - the inline script in the root layout already applied the
  // correct class before paint, this just syncs the icon a tick later.
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    setIsDark(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "التبديل إلى الوضع الفاتح" : "التبديل إلى الوضع الداكن"}
      className="inline-flex size-9 items-center justify-center rounded-full text-paper-text-muted transition-colors hover:bg-paper-border/50 dark:text-ink-text-muted dark:hover:bg-ink-border/50"
    >
      {isDark ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
    </button>
  );
}
