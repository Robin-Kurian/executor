import { OpenAPIHono, z } from "@hono/zod-openapi";
import {
  CalendarQuerySchema, CompletionSchema, CreateItemSchema, CreateNoteSchema, CreatePlanSchema, ErrorSchema,
  HistoryQuerySchema, IdParamsSchema, NoteSchema, NotesQuerySchema, PlanDetailQuerySchema, PlanItemSchema, PlanSchema,
  PlansQuerySchema, ReorderPlansSchema, TodayQuerySchema, UpdateCompletionSchema, UpdateItemSchema, UpdateNoteSchema, UpdatePlanSchema,
  UpsertCompletionSchema,
  CreateExpoPushTokenSchema, CreatePushSubscriptionSchema, DeleteExpoPushTokenSchema, DeletePushSubscriptionSchema, PushSubscriptionResultSchema, PushTestResultSchema,
} from "@executor/contracts";

const docs = new OpenAPIHono();
docs.openAPIRegistry.registerComponent("securitySchemes", "cookieAuth", {
  type: "apiKey", in: "cookie", name: "executor.session_token",
});

const errorResponses = {
  400: { description: "Invalid request", content: { "application/json": { schema: ErrorSchema } } },
  401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
  404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
} as const;
const jsonBody = (schema: z.ZodType) => ({ required: true, content: { "application/json": { schema } } });
const ok = (schema: z.ZodType, description = "Success") => ({
  200: { description, content: { "application/json": { schema } } }, ...errorResponses,
});
const created = (schema: z.ZodType) => ({
  201: { description: "Created", content: { "application/json": { schema } } }, ...errorResponses,
});
const register = (route: Parameters<typeof docs.openAPIRegistry.registerPath>[0]) => docs.openAPIRegistry.registerPath({
  ...route, security: route.path.startsWith("/api/v1") ? [{ cookieAuth: [] }] : undefined,
});

register({ method: "get", path: "/health", responses: ok(z.object({ status: z.string(), service: z.string(), version: z.string() })) });
register({ method: "get", path: "/ready", responses: ok(z.object({ status: z.string(), database: z.string(), migration: z.string() })) });
register({ method: "get", path: "/api/v1/today", request: { query: TodayQuerySchema }, responses: ok(z.any(), "Today payload") });
register({ method: "get", path: "/api/v1/calendar", request: { query: CalendarQuerySchema }, responses: ok(z.object({ month: z.string(), days: z.array(z.any()) })) });
register({ method: "get", path: "/api/v1/inbox", responses: ok(z.array(PlanItemSchema)) });
register({ method: "get", path: "/api/v1/plans", request: { query: PlansQuerySchema }, responses: ok(z.array(PlanSchema)) });
register({ method: "post", path: "/api/v1/plans", request: { body: jsonBody(CreatePlanSchema) }, responses: created(PlanSchema) });
register({ method: "patch", path: "/api/v1/plans/reorder", request: { body: jsonBody(ReorderPlansSchema) }, responses: ok(z.object({ ok: z.boolean() })) });
register({ method: "get", path: "/api/v1/plans/{id}", request: { params: IdParamsSchema, query: PlanDetailQuerySchema }, responses: ok(z.any(), "Plan detail") });
register({ method: "patch", path: "/api/v1/plans/{id}", request: { params: IdParamsSchema, body: jsonBody(UpdatePlanSchema) }, responses: ok(PlanSchema) });
register({ method: "delete", path: "/api/v1/plans/{id}", request: { params: IdParamsSchema }, responses: ok(z.object({ ok: z.boolean() })) });
register({ method: "get", path: "/api/v1/plans/{id}/items", request: { params: IdParamsSchema }, responses: ok(z.array(PlanItemSchema)) });
register({ method: "post", path: "/api/v1/plans/{id}/items", request: { params: IdParamsSchema, body: jsonBody(CreateItemSchema) }, responses: created(PlanItemSchema) });
register({ method: "get", path: "/api/v1/items/{id}", request: { params: IdParamsSchema }, responses: ok(PlanItemSchema) });
register({ method: "patch", path: "/api/v1/items/{id}", request: { params: IdParamsSchema, body: jsonBody(UpdateItemSchema) }, responses: ok(PlanItemSchema) });
register({ method: "delete", path: "/api/v1/items/{id}", request: { params: IdParamsSchema }, responses: ok(z.object({ ok: z.boolean() })) });
register({ method: "post", path: "/api/v1/items/{id}/completions", request: { params: IdParamsSchema, body: jsonBody(UpsertCompletionSchema) }, responses: ok(CompletionSchema) });
register({ method: "get", path: "/api/v1/items/{id}/history", request: { params: IdParamsSchema, query: HistoryQuerySchema }, responses: ok(z.object({ item: PlanItemSchema, history: z.array(CompletionSchema) })) });
register({ method: "patch", path: "/api/v1/completions/{id}", request: { params: IdParamsSchema, body: jsonBody(UpdateCompletionSchema) }, responses: ok(CompletionSchema) });
register({ method: "delete", path: "/api/v1/completions/{id}", request: { params: IdParamsSchema }, responses: ok(z.object({ ok: z.boolean() })) });
register({ method: "get", path: "/api/v1/notes", request: { query: NotesQuerySchema }, responses: ok(z.array(NoteSchema)) });
register({ method: "post", path: "/api/v1/notes", request: { body: jsonBody(CreateNoteSchema) }, responses: created(NoteSchema) });
register({ method: "patch", path: "/api/v1/notes/{id}", request: { params: IdParamsSchema, body: jsonBody(UpdateNoteSchema) }, responses: ok(NoteSchema) });
register({ method: "delete", path: "/api/v1/notes/{id}", request: { params: IdParamsSchema }, responses: ok(z.object({ ok: z.boolean() })) });
register({ method: "get", path: "/api/v1/push/config", responses: ok(z.object({ public_key: z.string() })) });
register({ method: "post", path: "/api/v1/push/subscriptions", request: { body: jsonBody(CreatePushSubscriptionSchema) }, responses: created(PushSubscriptionResultSchema) });
register({ method: "delete", path: "/api/v1/push/subscriptions", request: { body: jsonBody(DeletePushSubscriptionSchema) }, responses: ok(z.object({ ok: z.boolean(), removed: z.boolean() })) });
register({ method: "post", path: "/api/v1/push/expo", request: { body: jsonBody(CreateExpoPushTokenSchema) }, responses: created(PushSubscriptionResultSchema) });
register({ method: "delete", path: "/api/v1/push/expo", request: { body: jsonBody(DeleteExpoPushTokenSchema) }, responses: ok(z.object({ ok: z.boolean(), removed: z.boolean() })) });
register({ method: "post", path: "/api/v1/push/test", responses: ok(PushTestResultSchema) });

export const openApiDocument = docs.getOpenAPI31Document({
  openapi: "3.1.0",
  info: { title: "Executor API", version: "1.0.0", description: "Standalone Executor contract. Civil dates are YYYY-MM-DD strings." },
  servers: [{ url: "/" }],
});
