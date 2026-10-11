import { z } from "zod";

const optionalSetting = (schema: z.ZodString) => z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  schema.optional(),
);

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
  NEON_API_KEY: optionalSetting(z.string().trim().min(1)),
  NEON_ORG_ID: optionalSetting(z.string().trim().regex(/^[a-z0-9-]{1,60}$/)),
  NEON_PROJECT_ID: optionalSetting(z.string().trim().regex(/^[a-z0-9-]{1,100}$/)),
  NEON_CU_LIMIT_CU_HOURS: z.preprocess(
    (value) => value === undefined || value === "" ? 100 : value,
    z.coerce.number().positive(),
  ),
});

export type RuntimeEnv = z.infer<typeof RuntimeEnvSchema>;

export function parseEnv(bindings: CloudflareBindings): RuntimeEnv {
  return RuntimeEnvSchema.parse(bindings);
}
