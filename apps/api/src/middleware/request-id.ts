import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../types";

export const requestId = createMiddleware<AppEnv>(async (c, next) => {
  const id = c.req.header("x-request-id") ?? crypto.randomUUID();
  c.set("requestId", id);
  await next();
  c.header("x-request-id", id);
});
