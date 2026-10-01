import webpush from "web-push";
import type { RuntimeEnv } from "../env";
import type { StoredPushSubscription } from "../repositories/push";
import type { NotificationPayload, PushTransport } from "../services/push";

export class WebPushTransport implements PushTransport {
  constructor(private readonly env: RuntimeEnv) {}

  async send(subscription: StoredPushSubscription, payload: NotificationPayload) {
    const response = await webpush.sendNotification({
      endpoint: subscription.endpoint,
      expirationTime: subscription.expiration_time ? new Date(subscription.expiration_time).getTime() : null,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth },
    }, JSON.stringify(payload), {
      TTL: 60,
      urgency: "normal",
      vapidDetails: {
        subject: this.env.VAPID_SUBJECT,
        publicKey: this.env.VAPID_PUBLIC_KEY,
        privateKey: this.env.VAPID_PRIVATE_KEY,
      },
    });
    return { statusCode: response.statusCode };
  }
}
