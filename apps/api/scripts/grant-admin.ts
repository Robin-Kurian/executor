import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config({ path: ".dev.vars" });

const databaseUrl = process.env.DATABASE_URL;
const email = process.env.ALLOWED_ADMIN_EMAIL?.trim().toLowerCase();
if (!databaseUrl || !email) throw new Error("DATABASE_URL and ALLOWED_ADMIN_EMAIL are required in .dev.vars");

const result = await neon(databaseUrl)`UPDATE "user" SET "role" = 'admin' WHERE lower("email") = ${email} RETURNING "id"`;
if (result.length !== 1) throw new Error(`Expected exactly one user matching ALLOWED_ADMIN_EMAIL; found ${result.length}`);
console.log(JSON.stringify({ message: "admin role granted" }));
