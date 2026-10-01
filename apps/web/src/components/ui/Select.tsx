"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, Plus } from "lucide-react";
import { cn } from "@/lib/cn";

export type SelectOption = { label: string; value: string };

export const dropdownMenuClassName =
  "dropdown-menu-scrollbar max-h-60 overflow-y-auto overscroll-contain rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] py-1 shadow-2xl";

export function dropdownOptionClassName(selected: boolean) {
  return cn(
    "flex w-full cursor-pointer items-center px-4 py-2.5 text-left text-sm transition-colors hover:bg-[var(--color-surface)]",
    selected
      ? "bg-[var(--color-accent)]/10 font-medium text-[var(--color-accent)]"
      : "text-[var(--color-text-primary)]",
  );
}

const TRIGGER_CLASS: Record<"pill" | "field" | "surface", string> = {
  pill: "flex w-full cursor-pointer items-center justify-between rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm text-[var(--color-text-primary)] shadow-sm transition-colors hover:border-[var(--color-accent)]/50 focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]",
  field:
    "cms-field flex w-full cursor-pointer items-center justify-between text-left font-normal",
  surface:
    "flex w-full cursor-pointer items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-left text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]",
};

const MENU_MAX_H = 240;
const MENU_GAP = 8;

export function Select({
  options,
  value,
  onChange,
  placeholder = "Select...",
  className,
  allowClear = false,
  variant = "field",
  id,
  name,
  ariaLabel,
  action,
}: {
  options: SelectOption[];
  value: string | null;
  onChange: (val: string | null) => void;
  placeholder?: string;
  className?: string;
  allowClear?: boolean;
  variant?: "pill" | "field" | "surface";
  id?: string;
  name?: string;
  ariaLabel?: string;
  action?: { label: string; onSelect: () => void };
}) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const triggerWrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const triggerId = id ?? listId;

  useLayoutEffect(() => {
    if (!open) return;

    function updatePosition() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const width =
        variant === "pill" ? Math.max(rect.width, 160) : rect.width;
      let left = rect.left;
      const maxLeft = window.innerWidth - width - MENU_GAP;
      if (left > maxLeft) left = Math.max(MENU_GAP, maxLeft);

      const spaceBelow = window.innerHeight - rect.bottom - MENU_GAP;
      const spaceAbove = rect.top - MENU_GAP;
      const openUp = spaceBelow < MENU_MAX_H && spaceAbove > spaceBelow;

      setMenuStyle({
        position: "fixed",
        left,
        width,
        zIndex: 250,
        ...(openUp
          ? { bottom: window.innerHeight - rect.top + MENU_GAP, top: "auto" }
          : { top: rect.bottom + MENU_GAP, bottom: "auto" }),
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, variant]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: MouseEvent) {
      const t = e.target as Node;
      if (
        triggerWrapRef.current?.contains(t) ||
        menuRef.current?.contains(t)
      ) {
        return;
      }
      setOpen(false);
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape, true);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape, true);
    };
  }, [open]);

  const selectedLabel = value
    ? (options.find((o) => o.value === value)?.label ?? placeholder)
    : placeholder;

  const menu = open ? (
    <div
      ref={menuRef}
      id={listId}
      role="listbox"
      aria-labelledby={triggerId}
      style={menuStyle}
      className={dropdownMenuClassName}
      data-lenis-prevent="true"
    >
      {allowClear ? (
        <button
          type="button"
          role="option"
          aria-selected={!value}
          onClick={() => {
            onChange(null);
            setOpen(false);
          }}
          className={dropdownOptionClassName(!value)}
        >
          <span className="flex-1 truncate">{placeholder}</span>
          {!value ? (
            <Check className="ml-2 h-4 w-4 shrink-0 text-[--color-accent]" />
          ) : null}
        </button>
      ) : null}

      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="option"
            aria-selected={selected}
            onClick={() => {
              onChange(opt.value);
              setOpen(false);
            }}
            className={dropdownOptionClassName(selected)}
          >
            <span className="flex-1 truncate">{opt.label}</span>
            {selected ? (
              <Check className="ml-2 h-4 w-4 shrink-0 text-[--color-accent]" />
            ) : null}
          </button>
        );
      })}

      {action ? (
        <>
          <div className="my-1 border-t border-[var(--color-border)]" />
          <button
            type="button"
            onClick={() => {
              action.onSelect();
              setOpen(false);
            }}
            className={cn(
              dropdownOptionClassName(false),
              "font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10",
            )}
          >
            <Plus className="mr-2 h-4 w-4 shrink-0" />
            <span className="flex-1 truncate">{action.label}</span>
          </button>
        </>
      ) : null}
    </div>
  ) : null;

  return (
    <div
      className={cn(
        "relative",
        variant === "pill" ? "min-w-[160px]" : "w-full min-w-0",
        className,
      )}
      ref={triggerWrapRef}
    >
      {name ? (
        <input type="hidden" name={name} value={value ?? ""} readOnly aria-hidden />
      ) : null}
      <button
        ref={triggerRef}
        type="button"
        id={triggerId}
        aria-label={ariaLabel ?? placeholder}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
        className={TRIGGER_CLASS[variant]}
      >
        <span className="min-w-0 truncate">{selectedLabel}</span>
        <ChevronDown
          className={cn(
            "ml-2 h-4 w-4 shrink-0 text-[--color-text-muted] transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(menu, document.body)
        : null}
    </div>
  );
}
