import { cors } from "hono/cors";
import type { RuntimeEnv } from "../env";

export function exactOriginCors(env: RuntimeEnv) {
  return cors({
    origin: (origin) => origin === env.WEB_ORIGIN ? origin : "",
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "X-Request-Id"],
    exposeHeaders: ["X-Request-Id"],
    credentials: true,
    maxAge: 86400,
  });
}
