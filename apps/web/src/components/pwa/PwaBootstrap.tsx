"use client";

import { useEffect } from "react";
import { registerExecutorServiceWorker } from "@/lib/pwa";

export function PwaBootstrap() {
  useEffect(() => {
    registerExecutorServiceWorker().catch((error) => console.error("Service worker registration failed", error));
  }, []);
  return null;
}
