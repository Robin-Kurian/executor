import { describe, expect, it } from "vitest";
import { createApp } from "./app";

const env = {
  DATABASE_URL: "postgresql://user:password@example.invalid/database?sslmode=require",
  BETTER_AUTH_SECRET: "test-secret-that-is-at-least-thirty-two-characters",
  BETTER_AUTH_URL: "http://localhost:8787",
  WEB_ORIGIN: "http://localhost:3000",
  APP_ENV: "local",
  VAPID_PUBLIC_KEY: "test-public-vapid-key-that-is-long-enough",
  VAPID_PRIVATE_KEY: "test-private-vapid-key-that-is-long-enough",
  VAPID_SUBJECT: "mailto:test@example.com",
};

describe("public API", () => {
  it("serves health and OpenAPI", async () => {
    const app = createApp();
    expect((await app.request("/health", {}, env)).status).toBe(200);
    const doc = await (await app.request("/api/openapi.json", {}, env)).json() as { openapi: string; paths: Record<string, unknown> };
    expect(doc.openapi).toBe("3.1.0");
    expect(doc.paths["/api/v1/today"]).toBeTruthy();
    expect(doc.paths["/api/v1/push/subscriptions"]).toBeTruthy();
  });
  it("rejects protected requests without a session", async () => {
    const response = await createApp().request("/api/v1/inbox", {}, env);
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ error: "Unauthorized" });
  });
});
