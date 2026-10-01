import { describe, expect, it } from "vitest";
import type { PushSubscriptionInput } from "@executor/contracts";
import type { PushSubscriptionStore, StoredPushSubscription } from "../repositories/push";
import { PushSubscriptionService, testNotificationPayload } from "./push";

const input = (endpoint = "https://push.example.test/send/one"): PushSubscriptionInput => ({
  endpoint,
  keys: { p256dh: "p256dh_123456789012345", auth: "auth_123456789012345" },
});

class MemoryStore implements PushSubscriptionStore {
  rows: StoredPushSubscription[] = [];
  findByEndpoint(endpoint: string) { return Promise.resolve(this.rows.find((row) => row.endpoint === endpoint) ?? null); }
  async upsertOwned(userId: string, subscription: PushSubscriptionInput, userAgent: string | null) {
    const existing = this.rows.find((row) => row.endpoint === subscription.endpoint);
    if (existing) {
      existing.p256dh = subscription.keys.p256dh; existing.auth = subscription.keys.auth; existing.user_agent = userAgent;
      return existing;
    }
    const row: StoredPushSubscription = {
      id: crypto.randomUUID(), user_id: userId, endpoint: subscription.endpoint, p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth, user_agent: userAgent, expiration_time: null,
      last_seen_at: new Date().toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    this.rows.push(row); return row;
  }
  async deleteOwned(userId: string, endpoint: string) { const before = this.rows.length; this.rows = this.rows.filter((row) => row.user_id !== userId || row.endpoint !== endpoint); return before !== this.rows.length; }
  async deleteOwnedById(userId: string, id: string) { const before = this.rows.length; this.rows = this.rows.filter((row) => row.user_id !== userId || row.id !== id); return before !== this.rows.length; }
  listForUser(userId: string) { return Promise.resolve(this.rows.filter((row) => row.user_id === userId)); }
}

describe("push subscription service", () => {
  it("upserts duplicates for the same owner and refuses another owner", async () => {
    const store = new MemoryStore(); const service = new PushSubscriptionService(store);
    const first = await service.subscribe("user-1", input(), "Browser A");
    const second = await service.subscribe("user-1", input(), "Browser B");
    expect(second.id).toBe(first.id); expect(store.rows).toHaveLength(1); expect(store.rows[0]?.user_agent).toBe("Browser B");
    await expect(service.subscribe("user-2", input(), null)).rejects.toMatchObject({ status: 409 });
  });

  it("unsubscribes only the authenticated owner's device", async () => {
    const store = new MemoryStore(); const service = new PushSubscriptionService(store);
    await service.subscribe("user-1", input(), null);
    expect(await service.unsubscribe("user-2", input().endpoint)).toBe(false);
    expect(await service.unsubscribe("user-1", input().endpoint)).toBe(true);
  });

  it("removes permanently gone endpoints and preserves reusable payload routing", async () => {
    const store = new MemoryStore(); const service = new PushSubscriptionService(store);
    await service.subscribe("user-1", input(), null);
    const result = await service.sendToUser("user-1", testNotificationPayload(), { send: async () => { throw { statusCode: 410 }; } });
    expect(result).toEqual({ delivered: 0, removed: 1, failed: 0 });
    expect(store.rows).toHaveLength(0);
    expect(testNotificationPayload(123)).toMatchObject({ route: "/", tag: "executor-test-123" });
  });
});
