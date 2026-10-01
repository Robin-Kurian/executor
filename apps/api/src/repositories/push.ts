import { and, eq, sql } from "drizzle-orm";
import type { PushSubscriptionInput } from "@executor/contracts";
import type { Database } from "../db/client";
import { pushSubscriptions } from "../db/schema";

export type StoredPushSubscription = typeof pushSubscriptions.$inferSelect;

export interface PushSubscriptionStore {
  findByEndpoint(endpoint: string): Promise<StoredPushSubscription | null>;
  upsertOwned(userId: string, subscription: PushSubscriptionInput, userAgent: string | null): Promise<StoredPushSubscription>;
  deleteOwned(userId: string, endpoint: string): Promise<boolean>;
  deleteOwnedById(userId: string, id: string): Promise<boolean>;
  listForUser(userId: string): Promise<StoredPushSubscription[]>;
}

export class PushRepository implements PushSubscriptionStore {
  constructor(private readonly db: Database) {}

  async findByEndpoint(endpoint: string): Promise<StoredPushSubscription | null> {
    const [row] = await this.db.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint)).limit(1);
    return row ?? null;
  }

  async upsertOwned(userId: string, subscription: PushSubscriptionInput, userAgent: string | null): Promise<StoredPushSubscription> {
    const expiration = subscription.expirationTime ? new Date(subscription.expirationTime).toISOString() : null;
    const [row] = await this.db.insert(pushSubscriptions).values({
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      user_agent: userAgent,
      expiration_time: expiration,
    }).onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        user_agent: userAgent,
        expiration_time: expiration,
        last_seen_at: sql`now()`,
        updated_at: sql`now()`,
      },
      setWhere: eq(pushSubscriptions.user_id, userId),
    }).returning();
    if (!row) throw Object.assign(new Error("Push subscription belongs to another user"), { status: 409 });
    return row;
  }

  async deleteOwned(userId: string, endpoint: string): Promise<boolean> {
    const rows = await this.db.delete(pushSubscriptions).where(and(eq(pushSubscriptions.user_id, userId), eq(pushSubscriptions.endpoint, endpoint))).returning({ id: pushSubscriptions.id });
    return rows.length > 0;
  }

  async deleteOwnedById(userId: string, id: string): Promise<boolean> {
    const rows = await this.db.delete(pushSubscriptions).where(and(eq(pushSubscriptions.user_id, userId), eq(pushSubscriptions.id, id))).returning({ id: pushSubscriptions.id });
    return rows.length > 0;
  }

  listForUser(userId: string): Promise<StoredPushSubscription[]> {
    return this.db.select().from(pushSubscriptions).where(eq(pushSubscriptions.user_id, userId));
  }
}
