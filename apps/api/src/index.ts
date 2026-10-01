import { createApp } from "./app";
import { notificationKindForCron, runScheduledNotifications } from "./services/scheduled-notifications";

const app = createApp();

export default {
  fetch: app.fetch,
  scheduled(controller, env, ctx) {
    const kind = notificationKindForCron(controller.cron);
    if (!kind) {
      console.warn(JSON.stringify({ message: "unknown notification schedule", cron: controller.cron }));
      controller.noRetry();
      return;
    }
    ctx.waitUntil(runScheduledNotifications(env, kind, controller.scheduledTime));
  },
} satisfies ExportedHandler<CloudflareBindings>;
