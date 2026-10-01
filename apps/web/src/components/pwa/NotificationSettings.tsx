"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, LoaderCircle, Send, X } from "lucide-react";
import toast from "react-hot-toast";
import { EXECUTOR_API } from "@/lib/paths";
import { base64UrlToUint8Array, registerExecutorServiceWorker } from "@/lib/pwa";
import { cn } from "@/lib/cn";
import { lifeFetch } from "@/components/life/api";

type PushConfig = { public_key: string };
type PushTestResult = { delivered: number; removed: number; failed: number };

function serialize(subscription: PushSubscription) {
  const value = subscription.toJSON();
  if (!value.endpoint || !value.keys?.p256dh || !value.keys.auth) throw new Error("Browser returned an incomplete push subscription");
  return { endpoint: value.endpoint, expirationTime: value.expirationTime ?? null, keys: value.keys };
}

export function NotificationSettings() {
  const [open, setOpen] = useState(false);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [pending, setPending] = useState(false);

  const refresh = useCallback(async () => {
    const available = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setSupported(available);
    if (!available) return;
    setPermission(Notification.permission);
    const registration = await registerExecutorServiceWorker();
    const current = await registration.pushManager.getSubscription();
    setSubscription(current);
    if (current) {
      await lifeFetch(`${EXECUTOR_API}/push/subscriptions`, { method: "POST", body: JSON.stringify({ subscription: serialize(current) }) });
    }
  }, []);

  useEffect(() => {
    refresh().catch((error) => console.error("Push state refresh failed", error));
  }, [refresh]);

  async function enable() {
    setPending(true);
    try {
      const nextPermission = await Notification.requestPermission();
      setPermission(nextPermission);
      if (nextPermission !== "granted") return;
      const registration = await registerExecutorServiceWorker();
      const config = await lifeFetch<PushConfig>(`${EXECUTOR_API}/push/config`);
      const next = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToUint8Array(config.public_key) });
      try {
        await lifeFetch(`${EXECUTOR_API}/push/subscriptions`, { method: "POST", body: JSON.stringify({ subscription: serialize(next) }) });
      } catch (error) {
        await next.unsubscribe();
        throw error;
      }
      setSubscription(next);
      toast.success("Notifications enabled on this device");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not enable notifications");
    } finally {
      setPending(false);
    }
  }

  async function disable() {
    if (!subscription) return;
    setPending(true);
    try {
      await lifeFetch(`${EXECUTOR_API}/push/subscriptions`, { method: "DELETE", body: JSON.stringify({ endpoint: subscription.endpoint }) });
      await subscription.unsubscribe();
      setSubscription(null);
      toast.success("Notifications disabled on this device");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not disable notifications");
    } finally {
      setPending(false);
    }
  }

  async function sendTest() {
    setPending(true);
    try {
      const result = await lifeFetch<PushTestResult>(`${EXECUTOR_API}/push/test`, { method: "POST", body: "{}" });
      if (result.delivered < 1) throw new Error("The push service did not accept a notification");
      toast.success(`Test sent to ${result.delivered} device${result.delivered === 1 ? "" : "s"}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send test notification");
    } finally {
      setPending(false);
    }
  }

  const enabled = permission === "granted" && Boolean(subscription);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Notification settings" title="Notification settings" className="relative inline-flex items-center justify-center rounded-xl border border-[--color-border] bg-[--color-surface] p-2.5 text-[--color-text-secondary] shadow-sm transition-colors hover:border-[--color-text-muted] hover:bg-[--color-surface-raised] hover:text-[--color-text-primary] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-accent]/60">
        {enabled ? <Bell className="h-5 w-5 text-[--color-accent]" /> : <BellOff className="h-5 w-5" />}
        {enabled ? <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[--color-accent]" /> : null}
      </button>
      {open ? (
        <div className="fixed inset-0 z-[80] grid place-items-end bg-black/60 p-0 backdrop-blur-sm sm:place-items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="notification-settings-title" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <section className="w-full max-w-md rounded-t-3xl border border-[--color-border] bg-[--color-surface] p-6 shadow-2xl sm:rounded-3xl">
            <div className="flex items-start justify-between gap-4">
              <div><h2 id="notification-settings-title" className="text-xl font-semibold">Notifications</h2><p className="mt-1 text-sm leading-6 text-[--color-text-secondary]">Manage this installed browser or device independently.</p></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close notification settings" className="rounded-lg p-2 text-[--color-text-secondary] hover:bg-[--color-surface-raised]"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-5 rounded-2xl border border-[--color-border] bg-[--color-bg] p-4">
              <p className="text-sm font-medium">{supported === false ? "Not supported" : enabled ? "Enabled on this device" : permission === "denied" ? "Blocked by browser" : "Not enabled"}</p>
              <p className="mt-1 text-sm leading-6 text-[--color-text-secondary]">
                {supported === false ? "This browser does not expose service workers and Web Push." : permission === "denied" ? "Allow notifications for executor.itsrobin.dev in the browser’s site settings, then return here." : enabled ? "Executor can send reminders even when this window is closed." : "Permission is requested only after you choose Enable."}
              </p>
            </div>
            <div className="mt-5 grid gap-3">
              {!enabled && permission !== "denied" && supported !== false ? <button type="button" disabled={pending || supported === null} onClick={enable} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[--color-accent] px-4 py-3 font-semibold text-[--color-bg] disabled:opacity-50">{pending ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Bell className="h-5 w-5" />}Enable notifications</button> : null}
              {enabled ? <button type="button" disabled={pending} onClick={sendTest} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[--color-accent] px-4 py-3 font-semibold text-[--color-bg] disabled:opacity-50">{pending ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}Send test notification</button> : null}
              {subscription ? <button type="button" disabled={pending} onClick={disable} className={cn("rounded-xl border border-[--color-border] px-4 py-3 font-medium text-[--color-text-secondary] hover:bg-[--color-surface-raised]", pending && "opacity-50")}>Disable on this device</button> : null}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
