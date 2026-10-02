import { and, eq, sql } from "drizzle-orm";
import type { Database } from "../db/client";
import { expoPushTokens } from "../db/schema";

export type StoredExpoPushToken = typeof expoPushTokens.$inferSelect;

export class ExpoPushRepository {
  constructor(private readonly db: Database) {}

  async upsertOwned(userId: string, token: string): Promise<StoredExpoPushToken> {
    const [row] = await this.db.insert(expoPushTokens).values({ user_id: userId, token }).onConflictDoUpdate({
      target: expoPushTokens.token,
      set: { last_seen_at: sql`now()`, updated_at: sql`now()` },
      setWhere: eq(expoPushTokens.user_id, userId),
    }).returning();
    if (!row) throw Object.assign(new Error("Expo push token belongs to another user"), { status: 409 });
    return row;
  }

  async deleteOwned(userId: string, token: string): Promise<boolean> {
    const rows = await this.db.delete(expoPushTokens).where(and(eq(expoPushTokens.user_id, userId), eq(expoPushTokens.token, token))).returning({ id: expoPushTokens.id });
    return rows.length > 0;
  }

  listForUser(userId: string) { return this.db.select().from(expoPushTokens).where(eq(expoPushTokens.user_id, userId)); }
  async listSubscribedUserIds(): Promise<string[]> {
    const rows = await this.db.selectDistinct({ userId: expoPushTokens.user_id }).from(expoPushTokens);
    return rows.map((row) => row.userId);
  }
}
