import { createMiddleware } from "hono/factory";
import { createAuth } from "../auth/auth";
import { parseEnv } from "../env";
import type { AppEnv } from "../types";

export const requireSession = createMiddleware<AppEnv>(async (c, next) => {
  const session = await createAuth(parseEnv(c.env)).api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    console.warn(JSON.stringify({ message: "auth rejected", request_id: c.get("requestId"), path: c.req.path }));
    return c.json({ error: "Unauthorized", request_id: c.get("requestId") }, 401);
  }
  c.set("session", session);
  await next();
});
