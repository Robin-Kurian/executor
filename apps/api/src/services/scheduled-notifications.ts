import { dateInTimeZone } from "@executor/domain";
import type { PlanItem, TodayPayload } from "@executor/domain";
import { createDb } from "../db/client";
import { parseEnv } from "../env";
import { WebPushTransport } from "../infrastructure/web-push";
import { ExpoPushTransport } from "../infrastructure/expo-push";
import { ExecutorRepository } from "../repositories/executor";
import { PushRepository } from "../repositories/push";
import { ExpoPushRepository } from "../repositories/expo-push";
import { getToday } from "./executor";
import { PushSubscriptionService, type NotificationPayload } from "./push";

export const MORNING_NOTIFICATION_CRON = "30 2 * * *";
export const EVENING_NOTIFICATION_CRON = "30 13 * * *";
// Keep scheduled database wake-ups low so Neon can remain scaled to zero.
// Timed reminders may be delivered up to one hour after their timestamp.
export const ITEM_REMINDER_CRON = "0 * * * *";
export const NOTIFICATION_TIME_ZONE = "Asia/Kolkata";

export type ScheduledNotificationKind = "morning" | "evening";
export type NotificationSchedule = ScheduledNotificationKind | "item";

export function notificationKindForCron(cron: string): NotificationSchedule | null {
  if (cron === ITEM_REMINDER_CRON) return "item";
  if (cron === MORNING_NOTIFICATION_CRON) return "morning";
  if (cron === EVENING_NOTIFICATION_CRON) return "evening";
  return null;
}

export function itemReminderPayload(item: PlanItem): NotificationPayload {
  return {
    title: `Reminder: ${item.title}`,
    body: item.description.trim() || "This Executor item is due now.",
    route: `/plans/${item.plan_id}`,
    tag: `executor-item-${item.id}-${item.reminder_at}`,
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-96.png",
  };
}

export const notificationDate = (timestamp: number) => dateInTimeZone(timestamp, NOTIFICATION_TIME_ZONE);

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
  const expoRepository = new ExpoPushRepository(db);
  const userIds = [...new Set([...(await pushRepository.listSubscribedUserIds()), ...(await expoRepository.listSubscribedUserIds())])];
  const date = notificationDate(scheduledTime);
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
      const web = await service.sendToUser(userId, payload, transport);
      const expo = await new ExpoPushTransport().send(await expoRepository.listForUser(userId), payload);
      const result = { delivered: web.delivered + expo.delivered, removed: web.removed + expo.removed, failed: web.failed + expo.failed };
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

export async function runDueItemReminders(bindings: CloudflareBindings, scheduledTime: number) {
  const runtime = parseEnv(bindings);
  const db = createDb(runtime.DATABASE_URL);
  const executorRepository = new ExecutorRepository(db);
  const pushRepository = new PushRepository(db);
  const through = new Date(scheduledTime).toISOString();
  const from = new Date(scheduledTime - 24 * 60 * 60 * 1000).toISOString();
  const expoRepository = new ExpoPushRepository(db);
  const [items, webUserIds, expoUserIds] = await Promise.all([
    executorRepository.listDueReminderItems(from, through),
    pushRepository.listSubscribedUserIds(),
    expoRepository.listSubscribedUserIds(),
  ]);
  const userIds = [...new Set([...webUserIds, ...expoUserIds])];
  const service = new PushSubscriptionService(pushRepository);
  const transport = new WebPushTransport(runtime);
  const totals = { items: items.length, users: userIds.length, delivered: 0, removed: 0, failed: 0, skipped: 0 };

  for (const item of items) {
    if (!item.reminder_at) continue;
    for (const userId of userIds) {
      const runId = `item:${item.id}:${item.reminder_at}:${userId}`;
      if (!await pushRepository.claimNotificationRun(runId, userId, "item", notificationDate(scheduledTime))) {
        totals.skipped += 1;
        continue;
      }
      try {
        const payload = itemReminderPayload(item);
        const web = await service.sendToUser(userId, payload, transport);
        const expo = await new ExpoPushTransport().send(await expoRepository.listForUser(userId), payload);
        const result = { delivered: web.delivered + expo.delivered, removed: web.removed + expo.removed, failed: web.failed + expo.failed };
        await pushRepository.completeNotificationRun(runId, result);
        totals.delivered += result.delivered;
        totals.removed += result.removed;
        totals.failed += result.failed;
      } catch (error) {
        await pushRepository.releaseNotificationRun(runId);
        throw error;
      }
    }
  }

  console.log(JSON.stringify({ message: "item reminders complete", through, ...totals }));
  return { through, ...totals };
}
