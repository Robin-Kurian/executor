"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronDown } from "lucide-react";
import { addDays, daysInclusive, formatLongDate, localToday, monthBounds, weekdayOf } from "@executor/domain/dates";
import { cn } from "@/lib/cn";
import { dropdownMenuClassName } from "@/components/ui/Select";
import { lifeFieldClass } from "./ui";

function shortDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}

function shiftMonth(yearMonth: string, delta: number) {
  const [y, m] = yearMonth.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1 + delta, 1, 12));
  return next.toISOString().slice(0, 7);
}

export function DateField({
  value,
  onChange,
  placeholder = "Pick a date",
  allowClear = true,
  ariaLabel,
}: {
  value: string | null;
  onChange: (date: string | null) => void;
  placeholder?: string;
  allowClear?: boolean;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => (value ?? localToday()).slice(0, 7));
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useLayoutEffect(() => {
    if (!open) return;
    function updatePosition() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const width = Math.max(rect.width, 288);
      let left = rect.left;
      const maxLeft = window.innerWidth - width - 8;
      if (left > maxLeft) left = Math.max(8, maxLeft);
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const openUp = spaceBelow < 320 && rect.top > spaceBelow;
      setMenuStyle({
        position: "fixed",
        left,
        width,
        zIndex: 260,
        ...(openUp
          ? { bottom: window.innerHeight - rect.top + 8, top: "auto" }
          : { top: rect.bottom + 8, bottom: "auto" }),
      });
    }
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      e.preventDefault();
      setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  const { start, end } = monthBounds(month);
  const totalDays = daysInclusive(start, end);
  const leading = weekdayOf(start);
  const today = localToday();

  const menu = open ? (
    <div
      ref={menuRef}
      id={listId}
      role="dialog"
      aria-label="Choose date"
      style={menuStyle}
      className={cn(dropdownMenuClassName, "p-3")}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <button
          type="button"
          className="cursor-pointer rounded-lg px-2 py-1 text-sm text-[--color-text-muted] hover:bg-[--color-surface]"
          onClick={() => setMonth((current) => shiftMonth(current, -1))}
        >
          Prev
        </button>
        <p className="text-sm font-medium">{month}</p>
        <button
          type="button"
          className="cursor-pointer rounded-lg px-2 py-1 text-sm text-[--color-text-muted] hover:bg-[--color-surface]"
          onClick={() => setMonth((current) => shiftMonth(current, 1))}
        >
          Next
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-[--color-text-muted]">
        {["S", "M", "T", "W", "T", "F", "S"].map((label, i) => (
          <div key={`${label}-${i}`} className="py-1">
            {label}
          </div>
        ))}
        {Array.from({ length: leading }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {Array.from({ length: totalDays }).map((_, i) => {
          const date = addDays(start, i);
          const selected = date === value;
          const isToday = date === today;
          return (
            <button
              key={date}
              type="button"
              onClick={() => {
                onChange(date);
                setOpen(false);
              }}
              className={cn(
                "cursor-pointer rounded-xl py-1.5 text-sm tabular-nums",
                selected
                  ? "bg-[--color-accent] text-[--color-bg]"
                  : isToday
                    ? "bg-[--color-surface] text-[--color-text-primary]"
                    : "text-[--color-text-secondary] hover:bg-[--color-surface]",
              )}
            >
              {Number(date.slice(8))}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 px-1">
        <button
          type="button"
          className="cursor-pointer text-sm text-[--color-accent]"
          onClick={() => {
            onChange(today);
            setOpen(false);
          }}
        >
          Today
        </button>
        {allowClear ? (
          <button
            type="button"
            className="cursor-pointer text-sm text-[--color-text-muted]"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
          >
            Clear
          </button>
        ) : null}
      </div>
    </div>
  ) : null;

  return (
    <div className="relative w-full min-w-0" ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel ?? placeholder}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          setMonth((value ?? localToday()).slice(0, 7));
          setOpen((o) => !o);
        }}
        className={cn(lifeFieldClass, "flex cursor-pointer items-center justify-between text-left")}
      >
        <span className={cn("min-w-0 truncate", !value && "text-[--color-text-muted]")}>
          {value ? shortDate(value) : placeholder}
        </span>
        <span className="ml-2 flex shrink-0 items-center gap-1 text-[--color-text-muted]">
          <CalendarDays className="h-4 w-4" aria-hidden />
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </span>
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(menu, document.body)
        : null}
    </div>
  );
}

export function dateLabel(date: string) {
  return formatLongDate(date);
}
