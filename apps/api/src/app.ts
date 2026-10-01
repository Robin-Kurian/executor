import { Hono } from "hono";
import { createAuth } from "./auth/auth";
import { createDb } from "./db/client";
import { parseEnv } from "./env";
import { exactOriginCors } from "./middleware/cors";
import { requireSession } from "./middleware/auth";
import { requestId } from "./middleware/request-id";
import { openApiDocument } from "./openapi";
import { ExecutorRepository } from "./repositories/executor";
import { v1 } from "./routes/v1";
import type { AppEnv } from "./types";

export function createApp() {
  const app = new Hono<AppEnv>();
  app.use("*", requestId);
  app.use("/api/*", async (c, next) => exactOriginCors(parseEnv(c.env))(c, next));
  app.use("*", async (c, next) => {
    const started = Date.now(); await next();
    console.log(JSON.stringify({ message: "request", request_id: c.get("requestId"), method: c.req.method, path: c.req.path, status: c.res.status, duration_ms: Date.now() - started }));
  });
  app.get("/health", (c) => c.json({ status: "ok", service: "executor-api", version: "1.0.0" }));
  app.get("/ready", async (c) => {
    await new ExecutorRepository(createDb(parseEnv(c.env).DATABASE_URL)).ping();
    return c.json({ status: "ready", database: "connected", migration: "0002_push_subscriptions" });
  });
  app.get("/api/openapi.json", (c) => c.json(openApiDocument));
  app.get("/api/docs", (c) => c.html("<!doctype html><html><head><title>Executor API</title></head><body><h1>Executor API</h1><p><a href='/api/openapi.json'>OpenAPI 3.1 JSON</a></p></body></html>"));
  app.all("/api/auth/*", (c) => createAuth(parseEnv(c.env)).handler(c.req.raw));
  app.use("/api/v1/*", requireSession);
  app.route("/api/v1", v1);
  app.notFound((c) => c.json({ error: "Not found", request_id: c.get("requestId") }, 404));
  app.onError((error, c) => {
    const status = "status" in error && typeof error.status === "number" ? error.status : 500;
    console.error(JSON.stringify({ message: "request failed", request_id: c.get("requestId"), path: c.req.path, error: error.message, status }));
    return c.json({ error: status >= 500 ? "Internal server error" : error.message, request_id: c.get("requestId") }, status as 400 | 401 | 403 | 404 | 409 | 422 | 500 | 503);
  });
  return app;
}
