"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import toast from "react-hot-toast";
import { CalendarDays, Inbox, LayoutList, LogOut, Plus, Sun } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { NotificationSettings } from "@/components/pwa/NotificationSettings";
import { cn } from "@/lib/cn";
import { authClient } from "@/lib/auth-client";
import { executorPaths } from "@/lib/paths";
import { LifeProvider, useLife } from "./LifeProvider";
import { QuickAdd } from "./QuickAdd";

const TABS = [
  { href: executorPaths.today, label: "Today", icon: Sun, exact: true },
  { href: executorPaths.plans, label: "Plans", icon: LayoutList, exact: false },
  { href: executorPaths.calendar, label: "Calendar", icon: CalendarDays, exact: false },
  { href: executorPaths.inbox, label: "Inbox", icon: Inbox, exact: false },
] as const;

function controlClass({
  active = false,
  accent = false,
}: {
  active?: boolean;
  accent?: boolean;
} = {}) {
  return cn(
    "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-4 py-2.5 text-base font-medium leading-none shadow-sm transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-accent]/60",
    accent
      ? "border-[--color-accent] bg-[--color-accent] text-[--color-bg] shadow-none hover:bg-[--color-accent-hover]"
      : active
        ? "border-[--color-accent] bg-[--color-accent]/15 text-[--color-text-primary] shadow-none"
        : "border-[--color-border] bg-[--color-surface] text-[--color-text-secondary] hover:border-[--color-text-muted] hover:bg-[--color-surface-raised] hover:text-[--color-text-primary]",
  );
}

function tabIsActive(tab: (typeof TABS)[number], pathname: string) {
  return tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
}

function mobileTabClass(active: boolean) {
  return cn(
    "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10px] font-medium tracking-wide",
    "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-accent]/50",
    active
      ? "text-[--color-accent]"
      : "text-[--color-text-muted] hover:text-[--color-text-primary]",
  );
}

function MobileTab({
  tab,
  pathname,
}: {
  tab: (typeof TABS)[number];
  pathname: string;
}) {
  const Icon = tab.icon;
  const active = tabIsActive(tab, pathname);
  return (
    <Link
      href={tab.href}
      aria-current={active ? "page" : undefined}
      className={mobileTabClass(active)}
    >
      {active ? (
        <span className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-[--color-accent]" />
      ) : null}
      <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
      {tab.label}
    </Link>
  );
}

function ShellInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { openAdd, addOpen } = useLife();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (typing) return;
      if (e.key === "n") {
        e.preventDefault();
        openAdd(pathname.startsWith(executorPaths.inbox) ? { date: null } : undefined);
      }
      if (e.key === "t") {
        router.push(executorPaths.today);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openAdd, pathname, router]);

  function handleAdd() {
    openAdd(pathname.startsWith(executorPaths.inbox) ? { date: null } : undefined);
  }

  async function logout() {
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error(result.error.message);
      window.location.replace("/login");
    } catch {
      toast.error("Could not sign out");
    }
  }

  return (
    <div className="min-h-dvh bg-[--color-bg] text-[--color-text-primary] [&_a]:cursor-pointer [&_button:not(:disabled)]:cursor-pointer">
      <header className="sticky top-0 z-30 overflow-visible">
        <div
          className="pointer-events-none absolute inset-0 border-b border-[--color-border] bg-[--color-bg]/90 backdrop-blur"
          aria-hidden
        />
        <div className="relative mx-auto flex min-h-20 max-w-6xl items-center justify-between gap-6 px-5 py-4 md:px-8">
          <Link
            href={executorPaths.today}
            className="shrink-0 text-xl font-semibold tracking-tight lg:text-2xl"
          >
            Executor
          </Link>
          <nav className="hidden flex-1 items-center justify-center gap-3 lg:flex" aria-label="Executor">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = tabIsActive(tab, pathname);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={controlClass({ active })}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                  {tab.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={handleAdd}
              className={cn(controlClass({ accent: true }), "hidden lg:inline-flex")}
            >
              <Plus className="h-5 w-5" strokeWidth={2.25} aria-hidden />
              Add
            </button>
            <ThemeToggle tooltipPlacement="bottom" />
            <NotificationSettings />
            <button
              type="button"
              onClick={logout}
              aria-label="Log out"
              className={cn(
                controlClass(),
                "px-2.5 text-status-danger hover:border-[color:var(--status-danger-border)] hover:bg-[color:var(--status-danger-bg)] hover:text-status-danger",
              )}
            >
              <LogOut className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-5 pb-24 pt-6 md:px-8 lg:pb-10">{children}</main>

      <nav
        aria-label="Executor"
        aria-hidden={addOpen || undefined}
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t border-[--color-border] bg-[--color-bg]/95 pb-[max(0.35rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden",
          addOpen && "invisible pointer-events-none",
        )}
      >
        <div className="flex items-end px-1 pt-1">
          {TABS.slice(0, 2).map((tab) => (
            <MobileTab key={tab.href} tab={tab} pathname={pathname} />
          ))}
          <button
            type="button"
            onClick={handleAdd}
            aria-label="Add"
            className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 pb-2 pt-0 text-[10px] font-medium tracking-wide text-[--color-accent] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-accent]/50"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[--color-accent] text-[--color-bg] shadow-md shadow-[--color-accent]/25">
              <Plus className="h-5 w-5" strokeWidth={2.4} aria-hidden />
            </span>
            Add
          </button>
          {TABS.slice(2).map((tab) => (
            <MobileTab key={tab.href} tab={tab} pathname={pathname} />
          ))}
        </div>
      </nav>
      <QuickAdd />
    </div>
  );
}

export function LifeShell({ children }: { children: ReactNode }) {
  return (
    <LifeProvider>
      <ShellInner>{children}</ShellInner>
    </LifeProvider>
  );
}
