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
  if (isPending || !data) return <main className="grid min-h-dvh place-items-center text-sm text-[--color-text-secondary]">Loading Executor…</main>;
  return children;
}
