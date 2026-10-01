export type QuantityFields = {
  target_value: number | null;
  unit: string;
  step_values: number[];
};

export function isQuantityItem(item: QuantityFields): boolean {
  return item.target_value != null && item.target_value > 0;
}

export function roundQty(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function formatQuantity(value: number): string {
  const rounded = roundQty(value);
  if (Number.isInteger(rounded)) return String(rounded);
  return String(rounded);
}

export function parseNumberList(value: string): number[] {
  return [
    ...new Set(
      value
        .split(/[, ]+/)
        .map((part) => Number(part))
        .filter((n) => Number.isFinite(n) && n > 0)
        .map(roundQty),
    ),
  ];
}

const PAGE_STEPS = [2, 3, 5];
const LIQUID_STEPS = [0.25, 0.5, 1];
const ML_STEPS = [250, 500, 1000];
const KM_STEPS = [1, 2, 5];

export function isCountableUnit(unit: string) {
  const normalized = unit.trim().toLowerCase();
  return [
    "pages",
    "page",
    "pgs",
    "reps",
    "rep",
    "repetitions",
    "repetition",
    "count",
    "counts",
  ].includes(normalized);
}

export function isKmUnit(unit: string) {
  return ["km", "kms", "kilometer", "kilometers", "kilometre", "kilometres"].includes(
    unit.trim().toLowerCase(),
  );
}

function uniqueSteps(steps: number[], target: number): number[] {
  const seen = new Set<number>();
  const next: number[] = [];
  for (const step of steps) {
    const value = roundQty(step);
    if (value <= 0 || seen.has(value)) continue;
    seen.add(value);
    next.push(value);
    if (next.length >= 3) break;
  }
  if (target > 0) {
    const remainderFriendly = next.some((step) => step <= target);
    if (!remainderFriendly) next.unshift(roundQty(Math.min(1, target)));
  }
  return next.slice(0, 3);
}

function isMlUnit(unit: string) {
  return ["ml", "milliliter", "milliliters", "millilitre", "millilitres"].includes(
    unit.trim().toLowerCase(),
  );
}

function isLiquidLikeUnit(unit: string) {
  return [
    "",
    "ltr",
    "ltrs",
    "l",
    "liter",
    "liters",
    "litre",
    "litres",
    "kg",
    "kgs",
    "kilo",
    "kilos",
    "kilogram",
    "kilograms",
  ].includes(unit.trim().toLowerCase());
}

function fallbackSteps(unit: string): number[] {
  if (isCountableUnit(unit)) return PAGE_STEPS;
  if (isMlUnit(unit)) return ML_STEPS;
  if (isKmUnit(unit)) return KM_STEPS;
  return LIQUID_STEPS;
}

export function defaultStepValues(unit: string, target: number): number[] {
  const fallback = fallbackSteps(unit);
  const minimum = fallback[0] ?? 1;
  if (isCountableUnit(unit) || isMlUnit(unit) || isKmUnit(unit)) {
    return uniqueSteps(fallback.filter((step) => step <= Math.max(target, minimum)), target);
  }
  if (isLiquidLikeUnit(unit)) {
    return uniqueSteps(LIQUID_STEPS.filter((step) => step <= Math.max(target, 0.25)), target);
  }
  if (target >= 10) return uniqueSteps(PAGE_STEPS.filter((step) => step <= target), target);
  if (target > 1) return uniqueSteps(LIQUID_STEPS, target);
  return uniqueSteps([target > 0 ? Math.min(1, target) : 1], target);
}

export function quantitySteps(item: QuantityFields): number[] {
  const target = item.target_value ?? 0;
  let custom = item.step_values.filter((n) => Number.isFinite(n) && n > 0).map(roundQty);
  if (isCountableUnit(item.unit)) {
    custom = custom.filter((n) => Number.isInteger(n) && n >= 1);
  }
  if (custom.length) return uniqueSteps(custom, target);
  return defaultStepValues(item.unit, target);
}

export function trackerPresets(item: QuantityFields): number[] {
  const steps = quantitySteps(item);
  const fallback = fallbackSteps(item.unit);
  const next = [...steps];
  for (const step of fallback) {
    if (next.length >= 3) break;
    if (!next.some((value) => Math.abs(value - step) < 0.0001)) next.push(step);
  }
  while (next.length < 3) next.push(next[next.length - 1] ?? 1);
  return next.slice(0, 3);
}

export function formatStepLabel(value: number) {
  const formatted = formatQuantity(value);
  return formatted.startsWith("0.") ? formatted.slice(1) : formatted;
}

export function quantityUnit(item: QuantityFields): string {
  const raw = item.unit.trim();
  if (raw === "L" || raw === "l") return "Ltr";
  if (raw.toLowerCase() === "gal" || raw.toLowerCase() === "gallon" || raw.toLowerCase() === "gallons") return "Ltr";
  return raw;
}

export function formatQuantityWithUnit(value: number, unit: string): string {
  const amount = formatQuantity(value);
  let label = unit.trim();
  if (label === "L" || label === "l") label = "Ltr";
  if (label.toLowerCase() === "gal" || label.toLowerCase() === "gallon" || label.toLowerCase() === "gallons") label = "Ltr";
  return label ? `${amount} ${label}` : amount;
}

export function quantityProgressLabel(item: QuantityFields, value: number | null): string {
  const current = roundQty(Math.max(0, value ?? 0));
  const target = item.target_value ?? 0;
  const unit = quantityUnit(item);
  return `${formatQuantity(current)} / ${formatQuantity(target)}${unit ? ` ${unit}` : ""}`;
}

export function remainingQuantity(item: QuantityFields, value: number | null): number {
  const target = item.target_value ?? 0;
  return roundQty(Math.max(0, target - Math.max(0, value ?? 0)));
}

export function nextQuantityState(item: QuantityFields, nextValue: number): {
  value: number;
  completed: boolean;
} {
  const value = roundQty(Math.max(0, nextValue));
  return {
    value,
    completed: isQuantityItem(item) && value >= (item.target_value ?? 0),
  };
}

export function nextToggleState(
  item: QuantityFields & { completed: boolean; value: number | null },
): { value: number | null; completed: boolean } {
  if (!isQuantityItem(item)) {
    return { completed: !item.completed, value: item.value };
  }
  if (item.completed) return { completed: false, value: 0 };
  return { completed: true, value: item.target_value };
}
