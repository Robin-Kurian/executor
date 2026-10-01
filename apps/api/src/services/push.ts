import type { PushSubscriptionInput } from "@executor/contracts";
import type { PushSubscriptionStore, StoredPushSubscription } from "../repositories/push";

export type NotificationPayload = {
  title: string;
  body: string;
  route: string;
  tag: string;
  icon: string;
  badge: string;
};

export type PushDeliveryResult = { statusCode: number };
export interface PushTransport {
  send(subscription: StoredPushSubscription, payload: NotificationPayload): Promise<PushDeliveryResult>;
}

export const testNotificationPayload = (): NotificationPayload => ({
  title: "Executor notifications are ready",
  body: "This device can now receive Executor reminders.",
  route: "/",
  tag: "executor-test",
  icon: "/icons/icon-192.png",
  badge: "/icons/badge-96.png",
});

export class PushSubscriptionService {
  constructor(private readonly store: PushSubscriptionStore) {}

  async subscribe(userId: string, subscription: PushSubscriptionInput, userAgent: string | null) {
    const existing = await this.store.findByEndpoint(subscription.endpoint);
    if (existing && existing.user_id !== userId) {
      throw Object.assign(new Error("Push subscription belongs to another user"), { status: 409 });
    }
    return this.store.upsertOwned(userId, subscription, userAgent);
  }

  unsubscribe(userId: string, endpoint: string) {
    return this.store.deleteOwned(userId, endpoint);
  }

  async sendToUser(userId: string, payload: NotificationPayload, transport: PushTransport) {
    const subscriptions = await this.store.listForUser(userId);
    let delivered = 0;
    let removed = 0;
    let failed = 0;
    await Promise.all(subscriptions.map(async (subscription) => {
      try {
        const result = await transport.send(subscription, payload);
        if (result.statusCode >= 200 && result.statusCode < 300) delivered += 1;
        else if (result.statusCode === 404 || result.statusCode === 410) {
          await this.store.deleteOwnedById(userId, subscription.id);
          removed += 1;
        } else failed += 1;
      } catch (error) {
        const statusCode = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 0;
        if (statusCode === 404 || statusCode === 410) {
          await this.store.deleteOwnedById(userId, subscription.id);
          removed += 1;
        } else failed += 1;
      }
    }));
    return { delivered, removed, failed };
  }
}
