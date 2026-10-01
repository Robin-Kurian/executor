const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isDateOnly(value: string): boolean {
  if (!DATE_ONLY.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

export function toDateOnly(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value === "string") {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    return match && isDateOnly(match[1]) ? match[1] : null;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    // Postgres DATE is a civil date. Drivers encode it as local midnight, which
    // becomes 18:30Z in IST (or 00:00Z in UTC). Snap from UTC+12h so both
    // encodings map to the same YYYY-MM-DD in any process timezone.
    const snapped = new Date(value.getTime() + 12 * 60 * 60 * 1000);
    return snapped.toISOString().slice(0, 10);
  }
  return null;
}

export function requireDateOnly(value: unknown, label = "date"): string {
  const date = typeof value === "string" && isDateOnly(value) ? value : toDateOnly(value);
  if (!date) throw new Error(`${label} must be YYYY-MM-DD`);
  return date;
}

/** Calendar weekday: 0 Sunday … 6 Saturday. Uses noon UTC so the date never shifts. */
export function weekdayOf(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days, 12));
  return next.toISOString().slice(0, 10);
}

export function compareDates(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function daysInclusive(start: string, end: string): number {
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  const startMs = Date.UTC(sy, sm - 1, sd);
  const endMs = Date.UTC(ey, em - 1, ed);
  return Math.floor((endMs - startMs) / 86_400_000) + 1;
}

export function formatLongDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  const weekday = new Intl.DateTimeFormat("en", { weekday: "long" }).format(dt);
  const month = new Intl.DateTimeFormat("en", { month: "short" }).format(dt);
  return `${weekday}, ${d}\u00A0${month}`;
}

export function formatDayMonth(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  const month = new Intl.DateTimeFormat("en", { month: "short" }).format(dt);
  return `${d} ${month}`;
}

export function formatWeekday(date: string): string {
  return WEEKDAY_NAMES[weekdayOf(date)];
}

export function localToday(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function dayDifference(targetDate: string, baseDate: string = localToday()): number {
  const [ty, tm, td] = targetDate.split("-").map(Number);
  const [by, bm, bd] = baseDate.split("-").map(Number);
  const targetMs = Date.UTC(ty, tm - 1, td, 12);
  const baseMs = Date.UTC(by, bm - 1, bd, 12);
  return Math.round((targetMs - baseMs) / 86_400_000);
}

export function formatRelativeDate(date: string, baseDate: string = localToday()): string {
  if (!isDateOnly(date)) return "Today";
  const diff = dayDifference(date, baseDate);
  if (diff === 0) return "Today";
  if (diff === -1) return "Yesterday";
  if (diff === 1) return "Tomorrow";

  const weekday = WEEKDAY_NAMES[weekdayOf(date)];
  if (diff < 0) {
    return `Last ${weekday}`;
  }
  return `Next ${weekday}`;
}

export function monthBounds(yearMonth: string): { start: string; end: string } {
  const match = yearMonth.match(/^(\d{4})-(\d{2})$/);
  if (!match) throw new Error("month must be YYYY-MM");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const start = `${match[1]}-${match[2]}-01`;
  const last = new Date(Date.UTC(year, month, 0, 12)).getUTCDate();
  const end = `${match[1]}-${match[2]}-${String(last).padStart(2, "0")}`;
  return { start, end };
}

export function planDayProgress(
  startDate: string | null,
  endDate: string | null,
  today: string,
): { current: number; total: number } | null {
  if (!startDate || !endDate) return null;
  const total = daysInclusive(startDate, endDate);
  if (total <= 0) return null;
  const raw = daysInclusive(startDate, today);
  const current = Math.min(Math.max(raw, 0), total);
  return { current, total };
}
