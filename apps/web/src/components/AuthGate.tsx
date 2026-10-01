"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { authClient } from "@/lib/auth-client";

export function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname(); const router = useRouter();
  const { data, isPending } = authClient.useSession();
  const publicRoute = pathname === "/login" || pathname === "/offline";
  useEffect(() => { if (!isPending && !data && !publicRoute) router.replace("/login"); }, [data, isPending, publicRoute, router]);
  if (publicRoute) return children;
  // Keep this transient node structurally stable while the session request
  // settles. Translation and accessibility extensions commonly replace a bare
  // text node here, which leaves React trying to remove a node it no longer
  // owns when it swaps the loading screen for the app.
  if (isPending || !data) {
    return (
      <main
        className="notranslate grid min-h-dvh place-items-center text-sm text-[--color-text-secondary]"
        translate="no"
      >
        <span>Loading Executor…</span>
      </main>
    );
  }
  return children;
}
