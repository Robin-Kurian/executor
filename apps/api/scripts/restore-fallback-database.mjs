import { access } from "node:fs/promises";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { resolve } from "node:path";
import { stdin, stdout } from "node:process";
import {
  databaseIdentity,
  latestBackup,
  loadLocalEnvironment,
  postgresEnvironment,
  postgresCommand,
  repositoryDirectory,
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
const target = requireEnvironmentUrl("FALLBACK_DATABASE_URL");
if (databaseIdentity(source.parsed) === databaseIdentity(target.parsed)) {
  throw new Error("Refusing to restore: DATABASE_URL and FALLBACK_DATABASE_URL point to the same database");
}

const suppliedPath = process.argv.slice(2).find((argument) => argument !== "--yes");
const backup = suppliedPath ? resolve(repositoryDirectory, suppliedPath) : latestBackup();
if (!backup) throw new Error("No backup found. Run npm run db:backup first or pass a dump path.");
await access(backup);

const label = safeDatabaseLabel(target.parsed);
if (!process.argv.includes("--yes")) {
  if (!stdin.isTTY) throw new Error("Restore needs confirmation. Re-run with --yes in a non-interactive shell.");
  const prompt = createInterface({ input: stdin, output: stdout });
  const answer = await prompt.question(`Replace all data in fallback database ${label}? Type RESTORE to continue: `);
  prompt.close();
  if (answer !== "RESTORE") {
    console.log("Restore cancelled.");
    process.exit(0);
  }
}

console.log(`Restoring ${backup} into ${label}...`);
await run(postgresCommand("pg_restore"), [
  "--clean",
  "--if-exists",
  "--exit-on-error",
  "--no-owner",
  "--no-privileges",
  backup,
], postgresEnvironment(target.parsed));
console.log(`Fallback database restored from ${backup}`);
