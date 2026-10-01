import type { Plan, PlanDetailPayload, PlanItem, PlanNote, TodayItem, TodayPayload } from "@executor/domain/types";
import { EXECUTOR_API } from "@/lib/paths";

async function parseError(res: Response): Promise<string> {
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  return data.error || `Request failed (${res.status})`;
}

export async function lifeFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as T;
}

export const lifeApi = {
  today: (date: string) => lifeFetch<TodayPayload>(`${EXECUTOR_API}/today?date=${date}`),
  inbox: () => lifeFetch<TodayItem[]>(`${EXECUTOR_API}/inbox`),
  plans: (archived = false) =>
    lifeFetch<Plan[]>(`${EXECUTOR_API}/plans${archived ? "?include_archived=true" : ""}`),
  plan: (id: string, date?: string) =>
    lifeFetch<PlanDetailPayload>(
      `${EXECUTOR_API}/plans/${id}${date ? `?date=${date}` : ""}`,
    ),
  createPlan: (body: Record<string, unknown>) =>
    lifeFetch<Plan>(`${EXECUTOR_API}/plans`, { method: "POST", body: JSON.stringify(body) }),
  updatePlan: (id: string, body: Record<string, unknown>) =>
    lifeFetch<Plan>(`${EXECUTOR_API}/plans/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  reorderPlans: (planIds: string[]) => lifeFetch<{ ok: boolean }>(`${EXECUTOR_API}/plans/reorder`, {
    method: "PATCH", body: JSON.stringify({ plan_ids: planIds }),
  }),
  deletePlan: (id: string) =>
    lifeFetch<{ ok: boolean }>(`${EXECUTOR_API}/plans/${id}`, { method: "DELETE" }),
  createItem: (planId: string, body: Record<string, unknown>) =>
    lifeFetch<PlanItem>(`${EXECUTOR_API}/plans/${planId}/items`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateItem: (id: string, body: Record<string, unknown>) =>
    lifeFetch<PlanItem>(`${EXECUTOR_API}/items/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteItem: (id: string) =>
    lifeFetch<{ ok: boolean }>(`${EXECUTOR_API}/items/${id}`, { method: "DELETE" }),
  complete: (itemId: string, body: Record<string, unknown>) =>
    lifeFetch(`${EXECUTOR_API}/items/${itemId}/completions`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  history: (itemId: string) =>
    lifeFetch<{ item: PlanItem; history: { date: string; completed: boolean; value: number | null }[] }>(
      `${EXECUTOR_API}/items/${itemId}/history`,
    ),
  calendar: (month: string) =>
    lifeFetch<{ month: string; days: { date: string; completed: number; total: number }[] }>(
      `${EXECUTOR_API}/calendar?month=${month}`,
    ),
  notes: (query: string) => lifeFetch<PlanNote[]>(`${EXECUTOR_API}/notes${query}`),
  createNote: (body: Record<string, unknown>) =>
    lifeFetch<PlanNote>(`${EXECUTOR_API}/notes`, { method: "POST", body: JSON.stringify(body) }),
  deleteNote: (id: string) =>
    lifeFetch<{ ok: boolean }>(`${EXECUTOR_API}/notes/${id}`, { method: "DELETE" }),
};
