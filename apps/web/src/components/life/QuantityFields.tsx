"use client";

import { defaultStepValues, isCountableUnit, isKmUnit, parseNumberList } from "@executor/domain/quantity";
import { cn } from "@/lib/cn";
import { LifeField, LifeToggle, lifeChoiceClass } from "./ui";

const UNIT_CHIPS = ["Ltr", "Kg", "Km", "Reps", "Pages"];

function stepsAreDefault(value: string) {
  if (!value.trim()) return true;
  const key = parseNumberList(value).join(",");
  return ["0.25,0.5,1", "2,3,5", "250,500,1000", "0.5,1", "1,5,10", "1,2,5"].includes(key);
}

export function QuantityFields({
  enabled,
  onEnabledChange,
  target,
  onTargetChange,
  unit,
  onUnitChange,
  steps,
  onStepsChange,
  className,
}: {
  enabled: boolean;
  onEnabledChange: (next: boolean) => void;
  target: string;
  onTargetChange: (next: string) => void;
  unit: string;
  onUnitChange: (next: string) => void;
  steps: string;
  onStepsChange: (next: string) => void;
  className?: string;
}) {
  const effectiveUnit = unit.trim().toLowerCase() === "l" ? "Ltr" : unit;
  const suggestedSteps = defaultStepValues(effectiveUnit, Number(target) || 0);
  const stepsPlaceholder = suggestedSteps.join(", ") || "0.25, 0.5, 1";
  const countable = isCountableUnit(effectiveUnit);
  const km = isKmUnit(effectiveUnit);
  const pages = effectiveUnit.trim().toLowerCase().startsWith("page");

  function setUnit(next: string) {
    onUnitChange(next);
    if (stepsAreDefault(steps)) {
      onStepsChange(defaultStepValues(next, Number(target) || 0).join(", "));
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      <LifeToggle
        checked={enabled}
        onChange={onEnabledChange}
        label="Track a quantity"
      />
      {enabled ? (
        <div className="space-y-3 rounded-2xl border border-[var(--color-border)] p-3">
          <p className="text-xs text-[var(--color-text-muted)]">
            Log smaller amounts during the day. The habit completes when the total hits the goal.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm text-[var(--color-text-muted)]">
              Target
              <LifeField
                className="mt-1"
                type="number"
                min="0"
                step={countable ? "1" : "any"}
                inputMode={countable ? "numeric" : "decimal"}
                value={target}
                onChange={(e) => onTargetChange(e.target.value)}
                placeholder={pages ? "15" : km ? "5" : countable ? "50" : "3.78"}
              />
            </label>
            <label className="block text-sm text-[var(--color-text-muted)]">
              Unit
              <LifeField
                className="mt-1"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="Ltr"
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {UNIT_CHIPS.map((chip) => {
              const active =
                effectiveUnit.trim().toLowerCase() === chip.toLowerCase();
              return (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setUnit(chip)}
                  className={lifeChoiceClass(active)}
                >
                  {chip}
                </button>
              );
            })}
          </div>
          <label className="block text-sm text-[var(--color-text-muted)]">
            Quick adds
            <LifeField
              className="mt-1"
              value={steps}
              onChange={(e) => onStepsChange(e.target.value)}
              placeholder={stepsPlaceholder}
            />
          </label>
          <p className="text-xs text-[var(--color-text-muted)]">
            {pages
              ? "Example: 15 pages with 2, 3 and 5."
              : km
                ? "Example: 5 Km with 1, 2 and 5."
                : countable
                  ? "Example: 50 reps with 2, 3 and 5."
                  : "Example: 3.78 Ltr with 0.25, 0.5 and 1."}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function quantityPayload(
  enabled: boolean,
  target: string,
  unit: string,
  steps: string,
): { target_value: number | null; unit: string; step_values: number[] } {
  if (!enabled) return { target_value: null, unit: "", step_values: [] };
  const n = Number(target);
  if (!Number.isFinite(n) || n <= 0) throw new Error("Enter a target amount");
  const parsed = parseNumberList(steps);
  return {
    target_value: n,
    unit: unit.trim(),
    step_values: parsed.length ? parsed : defaultStepValues(unit, n),
  };
}
