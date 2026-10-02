"use client";

import { useEffect } from "react";
import { registerExecutorServiceWorker, unregisterExecutorServiceWorkers } from "@/lib/pwa";

export function PwaBootstrap() {
  useEffect(() => {
    // The React Native shell owns push delivery through Expo. Never install a
    // browser worker inside its WebView: a worker subscription is delivered as
    // a browser notification (for example, branded with Brave's icon).
    const nativeShell = "ReactNativeWebView" in window;
    if (nativeShell) {
      void unregisterExecutorServiceWorkers();
      return;
    }
    if (process.env.NODE_ENV !== "production") {
      void unregisterExecutorServiceWorkers();
      return;
    }
    registerExecutorServiceWorker().catch((error) => console.error("Service worker registration failed", error));
  }, []);
  return null;
}
