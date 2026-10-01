import { LifeShell } from "@/components/life/LifeShell";
import { PlanDetail } from "@/components/life/PlanDetail";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <LifeShell><PlanDetail planId={id} /></LifeShell>; }
