import { existsSync, readdirSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { delimiter, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const scriptsDirectory = dirname(fileURLToPath(import.meta.url));
export const apiDirectory = resolve(scriptsDirectory, "..");
export const repositoryDirectory = resolve(apiDirectory, "../..");
export const backupsDirectory = resolve(repositoryDirectory, "backups");

export function loadLocalEnvironment() {
  config({ path: resolve(apiDirectory, ".dev.vars"), quiet: true });
}

export function requireEnvironmentUrl(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is missing from apps/api/.dev.vars`);
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${name} is not a valid PostgreSQL URL`);
  }
  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new Error(`${name} must use postgres:// or postgresql://`);
  }
  return { value, parsed };
}

export function safeDatabaseLabel(url) {
  return `${url.hostname}/${url.pathname.replace(/^\//, "") || "postgres"}`;
}

export function databaseIdentity(url) {
  return `${url.hostname.toLowerCase()}:${url.port || "5432"}/${decodeURIComponent(url.pathname.replace(/^\//, ""))}`;
}

/** Pass credentials through the child environment so they never appear in the process list. */
export function postgresEnvironment(url) {
  const environment = {
    ...process.env,
    PGHOST: url.hostname,
    PGPORT: url.port || "5432",
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: decodeURIComponent(url.pathname.replace(/^\//, "")),
  };
  const mappings = {
    sslmode: "PGSSLMODE",
    channel_binding: "PGCHANNELBINDING",
    options: "PGOPTIONS",
  };
  for (const [parameter, variable] of Object.entries(mappings)) {
    const value = url.searchParams.get(parameter);
    if (value) environment[variable] = value;
  }
  return environment;
}

export function postgresCommand(name) {
  const pathDirectories = (process.env.PATH ?? "").split(delimiter);
  const candidates = [
    ...pathDirectories.map((directory) => resolve(directory, name)),
    `/opt/homebrew/opt/libpq/bin/${name}`,
    `/usr/local/opt/libpq/bin/${name}`,
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? name;
}

export async function ensureBackupsDirectory() {
  await mkdir(backupsDirectory, { recursive: true, mode: 0o700 });
}

export function latestBackup() {
  if (!existsSync(backupsDirectory)) return null;
  const files = readdirSync(backupsDirectory)
    .filter((name) => /^executor-\d{8}T\d{6}Z\.dump$/.test(name))
    .sort()
    .reverse();
  return files[0] ? resolve(backupsDirectory, files[0]) : null;
}
