import { createMiddleware } from "hono/factory";
import { parseEnv } from "../env";
import type { AppEnv } from "../types";

const guardedPaths = new Set(["/api/auth/sign-in/email", "/api/auth/sign-up/email"]);

/** Restricts credential endpoints before Better Auth can create a session or user. */
export const restrictCredentialAccess = createMiddleware<AppEnv>(async (c, next) => {
  if (c.req.method !== "POST" || !guardedPaths.has(c.req.path)) return next();
  const env = parseEnv(c.env);
  if (c.req.path === "/api/auth/sign-up/email" && c.req.header("x-executor-bootstrap-token") !== env.ADMIN_BOOTSTRAP_TOKEN) {
    return c.json({ error: "Forbidden", request_id: c.get("requestId") }, 403);
  }

  const contentType = c.req.header("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return c.json({ error: "Forbidden", request_id: c.get("requestId") }, 403);
  }

  let body: unknown;
  try {
    body = await c.req.raw.clone().json();
  } catch {
    return c.json({ error: "Forbidden", request_id: c.get("requestId") }, 403);
  }
  const email = typeof body === "object" && body !== null && "email" in body ? body.email : undefined;
  if (typeof email !== "string" || email.trim().toLowerCase() !== env.ALLOWED_ADMIN_EMAIL) {
    console.warn(JSON.stringify({ message: "credential access rejected", request_id: c.get("requestId"), path: c.req.path }));
    return c.json({ error: "Forbidden", request_id: c.get("requestId") }, 403);
  }
  return next();
});
