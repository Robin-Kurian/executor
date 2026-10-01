"use client";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/cn";
export function ThemeToggle({ className = "" }: { className?: string; tooltipPlacement?: "top" | "bottom" }) {
  const { theme, toggle } = useTheme();
  return <button type="button" onClick={toggle} className={cn("apple-glass rounded-xl border p-2.5 text-[--color-text-secondary] transition-all duration-200 hover:-translate-y-px hover:text-[--color-text-primary] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-accent]/60", className)} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>
    {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
  </button>;
}
