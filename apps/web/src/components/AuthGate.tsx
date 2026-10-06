"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { authClient } from "@/lib/auth-client";

type NativeWebViewWindow = Window & {
  ReactNativeWebView?: { postMessage: (message: string) => void };
};

export function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname(); const router = useRouter();
  const { data, isPending } = authClient.useSession();
  const publicRoute = pathname === "/login" || pathname === "/offline";
  useEffect(() => { if (!isPending && !data && !publicRoute) router.replace("/login"); }, [data, isPending, publicRoute, router]);
  useEffect(() => {
    if (publicRoute || (!isPending && data)) {
      (window as NativeWebViewWindow).ReactNativeWebView?.postMessage("executor:native-web-ready");
    }
  }, [data, isPending, publicRoute]);
  if (publicRoute) return children;
  // Keep this transient node structurally stable while the session request
  // settles. Translation and accessibility extensions commonly replace a bare
  // text node here, which leaves React trying to remove a node it no longer
  // owns when it swaps the loading screen for the app.
  if (isPending || !data) {
    return (
      <main
        aria-label="Loading Executor"
        className="notranslate grid min-h-dvh place-items-center"
        translate="no"
      >
        <span className="h-0.5 w-16 overflow-hidden rounded-full bg-[--color-border]" aria-hidden>
          <span className="block h-full w-full origin-left animate-pulse rounded-full bg-[--color-accent]" />
        </span>
      </main>
    );
  }
  return children;
}
