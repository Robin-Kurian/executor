import type { NotificationPayload } from "../services/push";
import type { StoredExpoPushToken } from "../repositories/expo-push";

export class ExpoPushTransport {
  async send(tokens: StoredExpoPushToken[], payload: NotificationPayload) {
    if (!tokens.length) return { delivered: 0, removed: 0, failed: 0 };
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(tokens.map(({ token }) => ({ to: token, title: payload.title, body: payload.body, data: { route: payload.route }, sound: "default", priority: "high" }))),
    });
    if (!response.ok) return { delivered: 0, removed: 0, failed: tokens.length };
    const result = await response.json() as { data?: { status?: string; details?: { error?: string } }[] };
    return (result.data ?? []).reduce((total, ticket) => ({
      delivered: total.delivered + (ticket.status === "ok" ? 1 : 0),
      removed: total.removed + (ticket.details?.error === "DeviceNotRegistered" ? 1 : 0),
      failed: total.failed + (ticket.status === "ok" || ticket.details?.error === "DeviceNotRegistered" ? 0 : 1),
    }), { delivered: 0, removed: 0, failed: 0 });
  }
}
