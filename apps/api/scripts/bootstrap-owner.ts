import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
config({ path: ".dev.vars" });

const base = process.env.BETTER_AUTH_URL ?? "http://localhost:8787";
const email = process.env.OWNER_EMAIL;
const password = process.env.OWNER_PASSWORD;
const name = process.env.OWNER_NAME ?? "Executor Owner";
const databaseUrl = process.env.DATABASE_URL;
const allowedAdminEmail = process.env.ALLOWED_ADMIN_EMAIL?.trim().toLowerCase();
const bootstrapToken = process.env.ADMIN_BOOTSTRAP_TOKEN;
if (!email || !password || !databaseUrl || !allowedAdminEmail || !bootstrapToken) throw new Error("OWNER_EMAIL, OWNER_PASSWORD, DATABASE_URL, ALLOWED_ADMIN_EMAIL, and ADMIN_BOOTSTRAP_TOKEN are required; do not store them in source files");
if (email.trim().toLowerCase() !== allowedAdminEmail) throw new Error("OWNER_EMAIL must match ALLOWED_ADMIN_EMAIL");

const response = await fetch(`${base}/api/auth/sign-up/email`, {
  method: "POST",
  headers: { "content-type": "application/json", "x-executor-bootstrap-token": bootstrapToken, origin: process.env.WEB_ORIGIN ?? "http://localhost:3000" },
  body: JSON.stringify({ email, password, name }),
});
if (!response.ok) throw new Error(`Owner bootstrap failed (${response.status}): ${await response.text()}`);
await neon(databaseUrl)`UPDATE "user" SET "role" = 'admin' WHERE lower("email") = ${allowedAdminEmail}`;
console.log(JSON.stringify({ message: "owner account created", email }));
