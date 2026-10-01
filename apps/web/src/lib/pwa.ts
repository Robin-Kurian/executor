let registrationPromise: Promise<ServiceWorkerRegistration> | null = null;

export async function unregisterExecutorServiceWorkers() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));
  registrationPromise = null;
}

export function registerExecutorServiceWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return Promise.reject(new Error("Service workers are not supported"));
  }
  registrationPromise ??= navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  return registrationPromise;
}

export function base64UrlToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
