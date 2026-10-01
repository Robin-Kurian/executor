import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const config = fileURLToPath(new URL("../wrangler.production.private.jsonc", import.meta.url));

if (!existsSync(config)) {
  console.error("Missing wrangler.production.private.jsonc. Copy wrangler.production.example.jsonc, set your account and domains, then retry.");
  process.exit(1);
}

const result = spawnSync("npx", ["wrangler", "deploy", "--config", config], {
  stdio: "inherit",
  shell: process.platform === "win32",
});
process.exit(result.status ?? 1);
