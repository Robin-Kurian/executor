"use client";

import { useState, type FormEvent } from "react";
import { ChevronDown } from "lucide-react";
import type { QuantityFields as QuantityShape } from "@executor/domain/quantity";
import {
  formatQuantity,
  formatStepLabel,
  isCountableUnit,
  quantityProgressLabel,
  roundQty,
  trackerPresets,
} from "@executor/domain/quantity";
import { cn } from "@/lib/cn";

function parseCustom(value: string, fallback: number) {
  const n = Number(value);
  if (Number.isFinite(n) && n > 0) return n;
  return fallback;
}

const cellClass =
  "inline-flex h-8 w-full min-w-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-0.5 text-[11px] font-medium tabular-nums leading-none text-[var(--color-text-secondary)] sm:h-9 sm:text-xs";

const pressClass =
  "cursor-pointer transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40";

const splitBtnClass =
  "inline-flex h-full w-7 shrink-0 cursor-pointer items-center justify-center border-l border-[var(--color-border)] text-sm font-semibold leading-none text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg)] hover:text-[var(--color-text-primary)] disabled:pointer-events-none disabled:opacity-40";

export function QuantityTracker({
  item,
  value,
  onChange,
  collapsible = false,
  defaultExpanded = false,
}: {
  item: QuantityShape;
  value: number | null;
  onChange: (next: number) => void;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [custom, setCustom] = useState("");
  const [customFocused, setCustomFocused] = useState(false);
  const current = roundQty(Math.max(0, value ?? 0));
  const target = item.target_value ?? 0;
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  const presets = trackerPresets(item);
  const customFallback = presets[0] ?? 1;
  const countable = isCountableUnit(item.unit);

  function add(amount: number) {
    onChange(roundQty(Math.max(0, current + amount)));
  }

  function applyCustom(direction: 1 | -1) {
    add(direction * parseCustom(custom, customFallback));
    setCustom("");
  }

  function submitCustom(e: FormEvent) {
    e.preventDefault();
    applyCustom(1);
  }

  const buttonsForm = (
    <form onSubmit={submitCustom} className={cn("grid grid-cols-4 gap-1.5", collapsible ? "pt-2" : "mt-2")}>
      {presets.map((step) => (
        <button
          key={`plus-${step}`}
          type="button"
          onClick={() => add(step)}
          aria-label={`Add ${formatQuantity(step)}`}
          className={cn(cellClass, pressClass)}
        >
          +{formatStepLabel(step)}
        </button>
      ))}
      {presets.map((step) => (
        <button
          key={`minus-${step}`}
          type="button"
          onClick={() => add(-step)}
          disabled={current <= 0}
          aria-label={`Subtract ${formatQuantity(step)}`}
          className={cn(cellClass, pressClass)}
        >
          −{formatStepLabel(step)}
        </button>
      ))}
      <div
        className={cn(
          cellClass,
          "col-span-2 justify-between overflow-hidden px-0",
          customFocused && "border-[var(--color-accent)] text-[var(--color-text-primary)]",
        )}
      >
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onFocus={() => setCustomFocused(true)}
          onBlur={() => setCustomFocused(false)}
          inputMode={countable ? "numeric" : "decimal"}
          placeholder={formatStepLabel(customFallback)}
          aria-label="Custom amount"
          className="h-full min-w-0 flex-1 cursor-text bg-transparent px-2.5 text-center text-[11px] tabular-nums text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)] sm:text-xs"
        />
        <button
          type="button"
          onClick={() => applyCustom(-1)}
          disabled={current <= 0}
          aria-label="Subtract custom amount"
          className={splitBtnClass}
        >
          −
        </button>
        <button type="submit" aria-label="Add custom amount" className={splitBtnClass}>
          +
        </button>
      </div>
    </form>
  );

  return (
    <div className="mt-1.5">
      <div className="flex items-center gap-2">
        <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--color-border)]">
          <div
            className="h-full rounded-full bg-[var(--color-accent)] transition-[width]"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="shrink-0 text-xs tabular-nums text-[var(--color-text-muted)]">
          {quantityProgressLabel(item, current)}
        </span>
        {collapsible ? (
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            aria-expanded={expanded}
            aria-label={expanded ? "Hide adjustment controls" : "Show adjustment controls"}
            className="inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)] -mr-0.5"
          >
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform duration-250 ease-out",
                expanded && "rotate-180",
              )}
              aria-hidden
            />
          </button>
        ) : null}
      </div>
      {collapsible ? (
        <div
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-250 ease-out",
            expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 pointer-events-none",
          )}
          style={{
            gridTemplateRows: expanded ? "1fr" : "0fr",
          }}
        >
          <div className="min-h-0 overflow-hidden" inert={!expanded ? true : undefined}>
            {buttonsForm}
          </div>
        </div>
      ) : (
        buttonsForm
      )}
    </div>
  );
}
