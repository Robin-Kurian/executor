import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { CreatePushSubscriptionSchema, DeletePushSubscriptionSchema } from "@executor/contracts";
import { createDb } from "../../db/client";
import { parseEnv } from "../../env";
import { WebPushTransport } from "../../infrastructure/web-push";
import { PushRepository } from "../../repositories/push";
import { PushSubscriptionService, testNotificationPayload } from "../../services/push";
import type { AppEnv } from "../../types";

export const pushRoutes = new Hono<AppEnv>();

function service(c: { env: CloudflareBindings }) {
  return new PushSubscriptionService(new PushRepository(createDb(parseEnv(c.env).DATABASE_URL)));
}

pushRoutes.get("/config", (c) => c.json({ public_key: parseEnv(c.env).VAPID_PUBLIC_KEY }));

pushRoutes.post("/subscriptions", zValidator("json", CreatePushSubscriptionSchema), async (c) => {
  const row = await service(c).subscribe(c.get("session").user.id, c.req.valid("json").subscription, c.req.header("user-agent") ?? null);
  return c.json({ ok: true, subscription_id: row.id }, 201);
});

pushRoutes.delete("/subscriptions", zValidator("json", DeletePushSubscriptionSchema), async (c) => {
  const removed = await service(c).unsubscribe(c.get("session").user.id, c.req.valid("json").endpoint);
  return c.json({ ok: true, removed });
});

pushRoutes.post("/test", async (c) => {
  const runtime = parseEnv(c.env);
  const result = await service(c).sendToUser(c.get("session").user.id, testNotificationPayload(), new WebPushTransport(runtime));
  if (result.delivered === 0 && result.failed === 0 && result.removed === 0) {
    throw Object.assign(new Error("No push subscriptions are enabled for this user"), { status: 409 });
  }
  return c.json(result);
});
