import { Hono, type Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  CalendarQuerySchema, CreateItemSchema, CreateNoteSchema, CreatePlanSchema, HistoryQuerySchema, IdParamsSchema,
  NotesQuerySchema, PlanDetailQuerySchema, PlansQuerySchema, ReorderPlansSchema, TodayQuerySchema, UpdateCompletionSchema, UpdateItemSchema,
  UpdateNoteSchema, UpdatePlanSchema, UpsertCompletionSchema,
} from "@executor/contracts";
import { localToday } from "@executor/domain";
import { createDb } from "../../db/client";
import { parseEnv } from "../../env";
import { ExecutorRepository } from "../../repositories/executor";
import { getCalendar, getInbox, getToday, toTodayItem } from "../../services/executor";
import type { AppEnv } from "../../types";
import { pushRoutes } from "./push";

export const v1 = new Hono<AppEnv>();
v1.route("/push", pushRoutes);
const repo = (c: { env: CloudflareBindings }) => new ExecutorRepository(createDb(parseEnv(c.env).DATABASE_URL));
const notFound = (c: Context<AppEnv>, label: string) =>
  c.json({ error: `${label} not found`, request_id: c.get("requestId") }, 404);

v1.get("/today", zValidator("query", TodayQuerySchema), async (c) => c.json(await getToday(repo(c), c.req.valid("query").date ?? localToday())));
v1.get("/calendar", zValidator("query", CalendarQuerySchema), async (c) => c.json(await getCalendar(repo(c), c.req.valid("query").month)));
v1.get("/inbox", async (c) => c.json(await getInbox(repo(c))));

v1.get("/plans", zValidator("query", PlansQuerySchema), async (c) => c.json(await repo(c).listPlans(c.req.valid("query").include_archived === "true")));
v1.post("/plans", zValidator("json", CreatePlanSchema), async (c) => c.json(await repo(c).createPlan(c.req.valid("json")), 201));
v1.patch("/plans/reorder", zValidator("json", ReorderPlansSchema), async (c) => {
  await repo(c).reorderPlans(c.req.valid("json").plan_ids);
  return c.json({ ok: true });
});
v1.get("/plans/:id", zValidator("param", IdParamsSchema), zValidator("query", PlanDetailQuerySchema), async (c) => {
  const repository = repo(c); const plan = await repository.getPlan(c.req.valid("param").id); if (!plan) return notFound(c, "Plan");
  const date = c.req.valid("query").date ?? localToday(); const items = await repository.listItems(plan.id);
  const completions = await repository.listCompletionsForDate(date, items.map((item) => item.id));
  const byItem = new Map(completions.map((completion) => [completion.item_id, completion]));
  const hydrated = items.map((item) => toTodayItem(item, byItem.get(item.id), date));
  return c.json({ ...plan, items: hydrated, completed_item_ids: hydrated.filter((item) => item.completed).map((item) => item.id) });
});
v1.patch("/plans/:id", zValidator("param", IdParamsSchema), zValidator("json", UpdatePlanSchema), async (c) => {
  const row = await repo(c).updatePlan(c.req.valid("param").id, c.req.valid("json")); return row ? c.json(row) : notFound(c, "Plan");
});
v1.delete("/plans/:id", zValidator("param", IdParamsSchema), async (c) => (await repo(c).deletePlan(c.req.valid("param").id)) ? c.json({ ok: true }) : notFound(c, "Plan"));
v1.get("/plans/:id/items", zValidator("param", IdParamsSchema), async (c) => c.json(await repo(c).listItems(c.req.valid("param").id)));
v1.post("/plans/:id/items", zValidator("param", IdParamsSchema), zValidator("json", CreateItemSchema), async (c) => c.json(await repo(c).createItem(c.req.valid("param").id, c.req.valid("json")), 201));

v1.get("/items/:id", zValidator("param", IdParamsSchema), async (c) => { const row = await repo(c).getItem(c.req.valid("param").id); return row ? c.json(row) : notFound(c, "Item"); });
v1.patch("/items/:id", zValidator("param", IdParamsSchema), zValidator("json", UpdateItemSchema), async (c) => { const row = await repo(c).updateItem(c.req.valid("param").id, c.req.valid("json")); return row ? c.json(row) : notFound(c, "Item"); });
v1.delete("/items/:id", zValidator("param", IdParamsSchema), async (c) => (await repo(c).deleteItem(c.req.valid("param").id)) ? c.json({ ok: true }) : notFound(c, "Item"));
v1.post("/items/:id/completions", zValidator("param", IdParamsSchema), zValidator("json", UpsertCompletionSchema), async (c) => c.json(await repo(c).upsertCompletion({ item_id: c.req.valid("param").id, ...c.req.valid("json") })));
v1.get("/items/:id/history", zValidator("param", IdParamsSchema), zValidator("query", HistoryQuerySchema), async (c) => {
  const repository = repo(c); const id = c.req.valid("param").id; const item = await repository.getItem(id); if (!item) return notFound(c, "Item");
  const { from, to } = c.req.valid("query"); return c.json({ item, history: await repository.listCompletionsForItem(id, from, to) });
});

v1.patch("/completions/:id", zValidator("param", IdParamsSchema), zValidator("json", UpdateCompletionSchema), async (c) => { const row = await repo(c).updateCompletion(c.req.valid("param").id, c.req.valid("json")); return row ? c.json(row) : notFound(c, "Completion"); });
v1.delete("/completions/:id", zValidator("param", IdParamsSchema), async (c) => (await repo(c).deleteCompletion(c.req.valid("param").id)) ? c.json({ ok: true }) : notFound(c, "Completion"));

v1.get("/notes", zValidator("query", NotesQuerySchema), async (c) => c.json(await repo(c).listNotes(c.req.valid("query"))));
v1.post("/notes", zValidator("json", CreateNoteSchema), async (c) => c.json(await repo(c).createNote(c.req.valid("json")), 201));
v1.patch("/notes/:id", zValidator("param", IdParamsSchema), zValidator("json", UpdateNoteSchema), async (c) => { const row = await repo(c).updateNote(c.req.valid("param").id, c.req.valid("json")); return row ? c.json(row) : notFound(c, "Note"); });
v1.delete("/notes/:id", zValidator("param", IdParamsSchema), async (c) => (await repo(c).deleteNote(c.req.valid("param").id)) ? c.json({ ok: true }) : notFound(c, "Note"));
