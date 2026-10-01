"use client";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/cn";
export function ThemeToggle({ className = "" }: { className?: string; tooltipPlacement?: "top" | "bottom" }) {
  const { theme, toggle } = useTheme();
  return <button type="button" onClick={toggle} className={cn("rounded-xl border border-[--color-border] bg-[--color-surface] p-2.5 text-[--color-text-secondary] hover:text-[--color-text-primary]", className)} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>
    {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
  </button>;
}
