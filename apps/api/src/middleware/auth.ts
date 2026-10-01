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
  const env = parseEnv(c.env);
  if (session.user.email.toLowerCase() !== env.ALLOWED_ADMIN_EMAIL || session.user.role !== "admin") {
    console.warn(JSON.stringify({ message: "access rejected", request_id: c.get("requestId"), path: c.req.path, user_id: session.user.id }));
    return c.json({ error: "Forbidden", request_id: c.get("requestId") }, 403);
  }
  c.set("session", session);
  await next();
});
