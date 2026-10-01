const CACHE_VERSION = "executor-shell-v1";
const SHELL_URLS = [
  "/offline",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
  "/icons/badge-96.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL_URLS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("executor-") && key !== CACHE_VERSION).map((key) => caches.delete(key)))),
    self.clients.claim(),
  ]));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname === "/sw.js") return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(caches.open(CACHE_VERSION).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    }));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then(async (response) => {
      if (response.ok) await (await caches.open(CACHE_VERSION)).put(request, response.clone());
      return response;
    }).catch(async () => (await caches.match(request)) || (await caches.match("/offline"))));
  }
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try { payload = event.data.json(); } catch { payload = { title: "Executor", body: event.data.text() }; }
  const route = typeof payload.route === "string" && payload.route.startsWith("/") ? payload.route : "/";
  event.waitUntil(self.registration.showNotification(typeof payload.title === "string" ? payload.title : "Executor", {
    body: typeof payload.body === "string" ? payload.body : "",
    icon: typeof payload.icon === "string" ? payload.icon : "/icons/icon-192.png",
    badge: typeof payload.badge === "string" ? payload.badge : "/icons/badge-96.png",
    tag: typeof payload.tag === "string" ? payload.tag : "executor",
    renotify: true,
    data: { route },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const rawRoute = event.notification.data && typeof event.notification.data.route === "string" ? event.notification.data.route : "/";
  const target = new URL(rawRoute, self.location.origin);
  const targetUrl = target.origin === self.location.origin ? target.href : new URL("/", self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
    const client = clients.find((candidate) => new URL(candidate.url).origin === self.location.origin);
    if (client) {
      if ("navigate" in client) await client.navigate(targetUrl);
      return client.focus();
    }
    return self.clients.openWindow(targetUrl);
  }));
});
