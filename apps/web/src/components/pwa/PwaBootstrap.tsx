"use client";

import { useEffect } from "react";
import { registerExecutorServiceWorker, unregisterExecutorServiceWorkers } from "@/lib/pwa";

export function PwaBootstrap() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      void unregisterExecutorServiceWorkers();
      return;
    }
    registerExecutorServiceWorker().catch((error) => console.error("Service worker registration failed", error));
  }, []);
  return null;
}
