"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarClock, ChevronDown } from "lucide-react";
import { localToday } from "@executor/domain/dates";
import { Select, type SelectOption } from "@/components/ui/Select";
import { cn } from "@/lib/cn";
import { DateField } from "./DateField";
import { lifeFieldClass } from "./ui";

const TIME_OPTIONS: SelectOption[] = Array.from({ length: 96 }, (_, index) => {
  const hours = Math.floor(index / 4);
  const minutes = (index % 4) * 15;
  const value = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  return { value, label: new Date(2000, 0, 1, hours, minutes).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) };
});

function splitValue(value: string) {
  return value ? { date: value.slice(0, 10), time: value.slice(11, 16) } : { date: null, time: null };
}

function valueLabel(date: string | null, time: string | null) {
  if (!date || !time) return "Choose date & time";
  const [year, month, day] = date.split("-").map(Number);
  const dateLabel = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(Date.UTC(year, month - 1, day, 12)));
  const timeLabel = new Date(`2000-01-01T${time}`).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return `${dateLabel}, ${timeLabel}`;
}

export function DateTimeField({ id, value, onChange }: { id?: string; value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { date, time } = splitValue(value);
  const timeOptions = time && !TIME_OPTIONS.some((option) => option.value === time)
    ? [{ value: time, label: new Date(`2000-01-01T${time}`).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) }, ...TIME_OPTIONS]
    : TIME_OPTIONS;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Element;
      if (wrapRef.current?.contains(target) || target.closest(".date-time-picker-child, [role=\"listbox\"]")) return;
      setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown, true);
    return () => { document.removeEventListener("mousedown", onPointerDown); document.removeEventListener("keydown", onKeyDown, true); };
  }, [open]);

  function setDate(nextDate: string | null) { onChange(nextDate ? `${nextDate}T${time ?? "09:00"}` : ""); }
  function setTime(nextTime: string | null) { onChange(nextTime ? `${date ?? localToday()}T${nextTime}` : ""); setOpen(false); }

  return (
    <div className="relative" ref={wrapRef}>
      <button id={id} type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((current) => !current)} className={cn(lifeFieldClass, "flex cursor-pointer items-center justify-between text-left")}>
        <span className={cn("truncate", !value && "text-[--color-text-muted]")}>{valueLabel(date, time)}</span>
        <span className="ml-2 flex shrink-0 items-center gap-1 text-[--color-text-muted]"><CalendarClock className="h-4 w-4" aria-hidden /><ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} aria-hidden /></span>
      </button>
      {open ? (
        <div role="dialog" aria-label="Choose reminder time" className="absolute left-0 z-[270] mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3 shadow-2xl">
          <div className="space-y-3">
            <DateField value={date} onChange={setDate} placeholder="Choose date" ariaLabel="Reminder date" menuClassName="date-time-picker-child" />
            <Select variant="surface" options={timeOptions} value={time} onChange={setTime} placeholder="Choose time" ariaLabel="Reminder time" />
          </div>
          <button type="button" className="mt-3 cursor-pointer text-sm text-[--color-text-muted] hover:text-[--color-text-primary]" onClick={() => { onChange(""); setOpen(false); }}>Clear reminder</button>
        </div>
      ) : null}
    </div>
  );
}
