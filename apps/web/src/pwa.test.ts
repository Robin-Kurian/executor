import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import manifest from "./app/manifest";

describe("PWA contract", () => {
  it("provides a standalone root-scoped manifest with required and maskable icons", () => {
    const value = manifest();
    expect(value).toMatchObject({ name: "Executor", short_name: "Executor", start_url: "/", scope: "/", display: "standalone" });
    expect(value.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ sizes: "192x192", type: "image/png" }),
      expect.objectContaining({ sizes: "512x512", type: "image/png" }),
      expect.objectContaining({ purpose: "maskable" }),
    ]));
  });

  it("registers a production-only root-scoped worker and keeps Next runtime chunks out of service-worker caches", () => {
    const registration = readFileSync(new URL("./lib/pwa.ts", import.meta.url), "utf8");
    const bootstrap = readFileSync(new URL("./components/pwa/PwaBootstrap.tsx", import.meta.url), "utf8");
    const worker = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
    expect(registration).toContain('register("/sw.js", { scope: "/"');
    expect(bootstrap).toContain('process.env.NODE_ENV !== "production"');
    expect(bootstrap).toContain("unregisterExecutorServiceWorkers()");
    expect(bootstrap).toContain('"ReactNativeWebView" in window');
    expect(worker).toContain('request.method !== "GET"');
    expect(worker).toContain("url.origin !== self.location.origin");
    expect(worker).not.toContain('url.pathname.startsWith("/_next/static/")');
    expect(worker).toContain('caches.match("/offline")');
    expect(worker).toContain('self.addEventListener("notificationclick"');
    expect(worker).toContain("renotify: true");
  });

  it("hands native startup off only after authentication settles without showing a second text loader", () => {
    const authGate = readFileSync(new URL("./components/AuthGate.tsx", import.meta.url), "utf8");
    expect(authGate).toContain('postMessage("executor:native-web-ready")');
    expect(authGate).not.toContain("<span>Loading Executor…</span>");
  });
});
