import { config } from "dotenv";
config({ path: ".dev.vars" });

const base = process.env.BETTER_AUTH_URL ?? "http://localhost:8787";
const email = process.env.OWNER_EMAIL;
const password = process.env.OWNER_PASSWORD;
const name = process.env.OWNER_NAME ?? "Executor Owner";
if (!email || !password) throw new Error("OWNER_EMAIL and OWNER_PASSWORD are required; do not store them in source files");

const response = await fetch(`${base}/api/auth/sign-up/email`, {
  method: "POST",
  headers: { "content-type": "application/json", origin: process.env.WEB_ORIGIN ?? "http://localhost:3000" },
  body: JSON.stringify({ email, password, name }),
});
if (!response.ok) throw new Error(`Owner bootstrap failed (${response.status}): ${await response.text()}`);
console.log(JSON.stringify({ message: "owner account created", email }));
