import { z } from "zod";

const RuntimeEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  WEB_ORIGIN: z.string().url(),
  ALLOWED_ADMIN_EMAIL: z.string().email().transform((value) => value.trim().toLowerCase()),
  ADMIN_BOOTSTRAP_TOKEN: z.string().min(32),
  APP_ENV: z.enum(["local", "staging", "production"]),
  VAPID_PUBLIC_KEY: z.string().min(32),
  VAPID_PRIVATE_KEY: z.string().min(32),
  VAPID_SUBJECT: z.string().refine((value) => value.startsWith("mailto:") || value.startsWith("https://"), "VAPID subject must be a mailto: or HTTPS URL"),
});

export type RuntimeEnv = z.infer<typeof RuntimeEnvSchema>;

export function parseEnv(bindings: CloudflareBindings): RuntimeEnv {
  return RuntimeEnvSchema.parse(bindings);
}
