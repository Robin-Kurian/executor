import type { TodayPayload } from "@executor/domain";
import { createDb } from "../db/client";
import { parseEnv } from "../env";
import { WebPushTransport } from "../infrastructure/web-push";
import { ExecutorRepository } from "../repositories/executor";
import { PushRepository } from "../repositories/push";
import { getToday } from "./executor";
import { PushSubscriptionService, type NotificationPayload } from "./push";

export const MORNING_NOTIFICATION_CRON = "30 2 * * *";
export const EVENING_NOTIFICATION_CRON = "30 13 * * *";
export const NOTIFICATION_TIME_ZONE = "Asia/Kolkata";

export type ScheduledNotificationKind = "morning" | "evening";

export function notificationKindForCron(cron: string): ScheduledNotificationKind | null {
  if (cron === MORNING_NOTIFICATION_CRON) return "morning";
  if (cron === EVENING_NOTIFICATION_CRON) return "evening";
  return null;
}

export function dateInTimeZone(timestamp: number, timeZone = NOTIFICATION_TIME_ZONE): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date(timestamp));
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function scheduledNotificationPayload(kind: ScheduledNotificationKind, date: string, today: TodayPayload): NotificationPayload {
  const scheduled = today.plans.flatMap((plan) => [...plan.habits, ...plan.tasks]);
  const remaining = scheduled.filter((item) => !item.completed).length;
  const overdue = today.overdue.filter((item) => !item.completed).length;
  const waiting = today.waiting.filter((item) => !item.completed).length;
  const counts = [
    `${remaining} ${remaining === 1 ? "item" : "items"} ${kind === "morning" ? "planned" : "left"}`,
    overdue ? `${overdue} overdue` : null,
    kind === "morning" && waiting ? `${waiting} waiting` : null,
  ].filter((part): part is string => Boolean(part));

  return {
    title: kind === "morning" ? "Today in Executor" : remaining || overdue ? "Executor evening check-in" : "Executor day complete",
    body: kind === "evening" && remaining === 0 && overdue === 0 ? "Everything scheduled for today is complete." : counts.join(" · "),
    route: "/",
    tag: `executor-${kind}-${date}`,
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-96.png",
  };
}

export async function runScheduledNotifications(bindings: CloudflareBindings, kind: ScheduledNotificationKind, scheduledTime: number) {
  const runtime = parseEnv(bindings);
  const db = createDb(runtime.DATABASE_URL);
  const pushRepository = new PushRepository(db);
  const userIds = await pushRepository.listSubscribedUserIds();
  const date = dateInTimeZone(scheduledTime);
  const today = await getToday(new ExecutorRepository(db), date);
  const payload = scheduledNotificationPayload(kind, date, today);
  const service = new PushSubscriptionService(pushRepository);
  const transport = new WebPushTransport(runtime);
  const totals = { users: userIds.length, delivered: 0, removed: 0, failed: 0, skipped: 0 };

  for (const userId of userIds) {
    const runId = `${kind}:${date}:${userId}`;
    if (!await pushRepository.claimNotificationRun(runId, userId, kind, date)) {
      totals.skipped += 1;
      continue;
    }
    try {
      const result = await service.sendToUser(userId, payload, transport);
      await pushRepository.completeNotificationRun(runId, result);
      totals.delivered += result.delivered;
      totals.removed += result.removed;
      totals.failed += result.failed;
    } catch (error) {
      await pushRepository.releaseNotificationRun(runId);
      throw error;
    }
  }

  console.log(JSON.stringify({ message: "scheduled notifications complete", kind, date, ...totals }));
  return { kind, date, ...totals };
}
