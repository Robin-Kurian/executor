import { describe, expect, it } from "vitest";
import { CreateItemSchema, DateOnlySchema, DateTimeSchema, ErrorSchema, PushSubscriptionInputSchema } from "./index";

describe("API contracts", () => {
  it("rejects impossible civil dates", () => expect(DateOnlySchema.safeParse("2026-02-29").success).toBe(false));
  it("requires an offset for reminder timestamps", () => {
    expect(DateTimeSchema.safeParse("2026-10-01T10:30:00.000Z").success).toBe(true);
    expect(DateTimeSchema.safeParse("2026-10-01T10:30").success).toBe(false);
  });
  it("rejects empty titles and invalid weekdays", () => {
    expect(CreateItemSchema.safeParse({ title: "", recurrence_weekdays: [7] }).success).toBe(false);
  });
  it("stabilizes the handled error shape", () => {
    expect(ErrorSchema.parse({ error: "Unauthorized", request_id: "req-1" })).toEqual({ error: "Unauthorized", request_id: "req-1" });
  });
  it("validates Web Push endpoints and key material", () => {
    const valid = { endpoint: "https://push.example.test/send/abc", keys: { p256dh: "a_123456789012345", auth: "b-123456789012345" } };
    expect(PushSubscriptionInputSchema.safeParse(valid).success).toBe(true);
    expect(PushSubscriptionInputSchema.safeParse({ ...valid, endpoint: "http://push.example.test/send/abc" }).success).toBe(false);
    expect(PushSubscriptionInputSchema.safeParse({ ...valid, keys: { ...valid.keys, auth: "bad key" } }).success).toBe(false);
  });
});
