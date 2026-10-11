import type { Metadata } from "next";
import { AnalyticsView } from "@/components/life/AnalyticsView";
import { LifeShell } from "@/components/life/LifeShell";

export const metadata: Metadata = { title: "Analytics" };

export default function Page() {
  return <LifeShell><AnalyticsView /></LifeShell>;
}
