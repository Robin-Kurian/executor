import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import type { RuntimeEnv } from "../env";
import { createDb } from "../db/client";
import * as schema from "../db/schema";

export function createAuth(env: RuntimeEnv) {
  return betterAuth({
    appName: "Executor",
    baseURL: env.BETTER_AUTH_URL,
    basePath: "/api/auth",
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.WEB_ORIGIN],
    database: drizzleAdapter(createDb(env.DATABASE_URL), { provider: "pg", schema }),
    user: {
      additionalFields: {
        role: { type: "string", required: false, input: false },
      },
    },
    emailAndPassword: { enabled: true, autoSignIn: true },
    session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
    advanced: {
      useSecureCookies: env.APP_ENV === "production",
      cookiePrefix: "executor",
      defaultCookieAttributes: {
        httpOnly: true,
        secure: env.APP_ENV === "production",
        sameSite: "lax",
        path: "/",
      },
    },
  });
}

export type AuthSession = Awaited<ReturnType<ReturnType<typeof createAuth>["api"]["getSession"]>>;
