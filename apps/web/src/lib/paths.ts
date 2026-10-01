export const EXECUTOR_BASE = "";
export const EXECUTOR_API = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787"}/api/v1`;
export const executorPaths = {
  today: "/", plans: "/plans", plan: (id: string) => `/plans/${id}`, calendar: "/calendar", inbox: "/inbox",
} as const;
