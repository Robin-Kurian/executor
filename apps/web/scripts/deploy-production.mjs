import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const config = fileURLToPath(new URL("../wrangler.production.private.jsonc", import.meta.url));

if (!existsSync(config)) {
  console.error("Missing wrangler.production.private.jsonc. Copy wrangler.production.example.jsonc, set your account and domains, then retry.");
  process.exit(1);
}

const privateConfig = JSON.parse(readFileSync(config, "utf8"));
const apiUrl = privateConfig.vars?.NEXT_PUBLIC_API_URL;
if (typeof apiUrl !== "string" || !apiUrl.startsWith("https://")) {
  console.error("wrangler.production.private.jsonc must set vars.NEXT_PUBLIC_API_URL to your HTTPS API origin.");
  process.exit(1);
}

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, NEXT_PUBLIC_API_URL: apiUrl },
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("npx", ["opennextjs-cloudflare", "build", "--env="]);
run("npx", ["opennextjs-cloudflare", "deploy", "--env=", "--", "--config", config, "--keep-vars"]);
