import { chmod, unlink } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import {
  backupsDirectory,
  ensureBackupsDirectory,
  loadLocalEnvironment,
  postgresEnvironment,
  postgresCommand,
  requireEnvironmentUrl,
  safeDatabaseLabel,
} from "./database-tools.mjs";

function run(command, args, environment) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { stdio: "inherit", env: environment });
    child.once("error", (error) => reject(
      error.code === "ENOENT" ? new Error(`${command} is not installed or not on PATH`) : error,
    ));
    child.once("exit", (code) => code === 0 ? resolvePromise() : reject(new Error(`${command} exited with code ${code}`)));
  });
}

loadLocalEnvironment();
const source = requireEnvironmentUrl("DATABASE_URL");
await ensureBackupsDirectory();
const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
const output = resolve(backupsDirectory, `executor-${timestamp}.dump`);

console.log(`Backing up ${safeDatabaseLabel(source.parsed)}...`);
try {
  await run(postgresCommand("pg_dump"), [
    "--format=custom",
    "--compress=9",
    "--no-owner",
    "--no-privileges",
    "--file", output,
  ], postgresEnvironment(source.parsed));
} catch (error) {
  await unlink(output).catch(() => undefined);
  throw error;
}
await chmod(output, 0o600);
console.log(`Backup written to ${output}`);
