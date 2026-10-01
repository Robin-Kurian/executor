import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

type Table = "plans" | "plan_items" | "item_completions" | "plan_notes";
const TABLES: Table[] = ["plans", "plan_items", "item_completions", "plan_notes"];
const dataDir = resolve("migration-data");
const exportPath = resolve(dataDir, "executor-export.json");
const reportPath = resolve("../../docs/migration-report.md");
const verificationPath = resolve("../../docs/data-verification.md");

const sourceUrl = process.env.SOURCE_DATABASE_URL;
const targetUrl = process.env.TARGET_DATABASE_URL;
function required(value: string | undefined, name: string) { if (!value) throw new Error(`${name} is required explicitly`); return value; }
function dbIdentity(url: string) { const parsed = new URL(url); return `${parsed.hostname}/${parsed.pathname.slice(1)}`; }
function stable(value: unknown): string { if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`; if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`; return JSON.stringify(value); }
const checksum = (value: unknown) => createHash("sha256").update(stable(value)).digest("hex");

async function rows(sql: NeonQueryFunction<false, false>, table: Table) {
  if (table === "plans") return sql`select id,name,description,icon,color,status,start_date::text,end_date::text,sort_order,created_at,updated_at from plans order by id`;
  if (table === "plan_items") return sql`select id,plan_id,title,description,type,priority,status,start_date::text,due_date::text,reminder_at::text,recurrence,recurrence_weekdays,waiting_on,last_follow_up::text,next_follow_up::text,target_value::text,unit,step_values::text[],sort_order,created_at,updated_at from plan_items order by id`;
  if (table === "item_completions") return sql`select id,item_id,date::text,completed,value::text,note,created_at,updated_at from item_completions order by id`;
  return sql`select id,plan_id,item_id,date::text,content,created_at,updated_at from plan_notes order by id`;
}

async function audit(url: string) {
  const sql = neon(url); const result: Record<string, unknown> = { identity: dbIdentity(url), generated_at: new Date().toISOString() };
  result.counts = (await Promise.all(TABLES.map(async (table) => [table, (await rows(sql, table)).length]))).reduce((out, [table, count]) => ({ ...out, [String(table)]: count }), {});
  result.plans_by_status = await sql`select status,count(*)::int count from plans group by status order by status`;
  result.items_by_type_status_recurrence = await sql`select type,status,recurrence,count(*)::int count from plan_items group by type,status,recurrence order by type,status,recurrence`;
  result.completions = (await sql`select min(date)::text earliest,max(date)::text latest,count(*) filter(where completed)::int completed,count(*) filter(where not completed)::int incomplete from item_completions`)[0];
  result.notes_by_association = (await sql`select count(*) filter(where plan_id is not null)::int plan_notes,count(*) filter(where item_id is not null)::int item_notes,count(*) filter(where date is not null)::int dated_notes from plan_notes`)[0];
  result.orphans = (await sql`select (select count(*)::int from plan_items i left join plans p on p.id=i.plan_id where p.id is null) items,(select count(*)::int from item_completions c left join plan_items i on i.id=c.item_id where i.id is null) completions,(select count(*)::int from plan_notes n left join plans p on p.id=n.plan_id where n.plan_id is not null and p.id is null) plan_notes,(select count(*)::int from plan_notes n left join plan_items i on i.id=n.item_id where n.item_id is not null and i.id is null) item_notes`)[0];
  result.duplicate_completion_keys = (await sql`select count(*)::int count from (select item_id,date from item_completions group by item_id,date having count(*)>1) duplicates`)[0]?.count;
  result.invalid_plan_ranges = (await sql`select count(*)::int count from plans where start_date is not null and end_date is not null and end_date < start_date`)[0]?.count;
  result.empty_custom_weekdays = (await sql`select count(*)::int count from plan_items where recurrence='custom' and cardinality(recurrence_weekdays)=0`)[0]?.count;
  result.invalid_quantities = (await sql`select count(*)::int count from plan_items where (target_value is not null and target_value<=0) or exists(select 1 from unnest(step_values) v where v<=0)`)[0]?.count;
  result.schema = await sql`select table_name,column_name,data_type,is_nullable,column_default from information_schema.columns where table_schema='public' and table_name=any(array['plans','plan_items','item_completions','plan_notes']) order by table_name,ordinal_position`;
  result.constraints = await sql`select conrelid::regclass::text table_name,conname,pg_get_constraintdef(oid) definition from pg_constraint where conrelid=any(array['plans'::regclass,'plan_items'::regclass,'item_completions'::regclass,'plan_notes'::regclass]) order by conrelid::regclass::text,conname`;
  result.indexes = await sql`select tablename,indexname,indexdef from pg_indexes where schemaname='public' and tablename=any(array['plans','plan_items','item_completions','plan_notes']) order by tablename,indexname`;
  return result;
}

async function exportData() {
  const url = required(sourceUrl, "SOURCE_DATABASE_URL"); const sql = neon(url); await mkdir(dataDir, { recursive: true });
  const data = Object.fromEntries(await Promise.all(TABLES.map(async (table) => [table, await rows(sql, table)])));
  const payload = { format: 1, source: dbIdentity(url), exported_at: new Date().toISOString(), checksums: Object.fromEntries(TABLES.map((table) => [table, checksum(data[table])])), data };
  await writeFile(exportPath, `${JSON.stringify(payload, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify({ message: "export complete", path: exportPath, counts: Object.fromEntries(TABLES.map((table) => [table, data[table].length])), checksums: payload.checksums }));
}

async function importData() {
  required(sourceUrl, "SOURCE_DATABASE_URL"); const url = required(targetUrl, "TARGET_DATABASE_URL");
  if (dbIdentity(sourceUrl!) === dbIdentity(url)) throw new Error("SOURCE_DATABASE_URL and TARGET_DATABASE_URL resolve to the same database");
  const payload = JSON.parse(await readFile(exportPath, "utf8")) as { data: Record<Table, Record<string, unknown>[]> };
  const sql = neon(url); const queries = [];
  for (const r of payload.data.plans) queries.push(sql`insert into plans(id,name,description,icon,color,status,start_date,end_date,sort_order,created_at,updated_at) values(${r.id},${r.name},${r.description},${r.icon},${r.color},${r.status},${r.start_date},${r.end_date},${r.sort_order},${r.created_at},${r.updated_at}) on conflict(id) do update set name=excluded.name,description=excluded.description,icon=excluded.icon,color=excluded.color,status=excluded.status,start_date=excluded.start_date,end_date=excluded.end_date,sort_order=excluded.sort_order,created_at=excluded.created_at,updated_at=excluded.updated_at`);
  for (const r of payload.data.plan_items) queries.push(sql`insert into plan_items(id,plan_id,title,description,type,priority,status,start_date,due_date,reminder_at,recurrence,recurrence_weekdays,waiting_on,last_follow_up,next_follow_up,target_value,unit,step_values,sort_order,created_at,updated_at) values(${r.id},${r.plan_id},${r.title},${r.description},${r.type},${r.priority},${r.status},${r.start_date},${r.due_date},${r.reminder_at},${r.recurrence},${r.recurrence_weekdays},${r.waiting_on},${r.last_follow_up},${r.next_follow_up},${r.target_value},${r.unit},${r.step_values},${r.sort_order},${r.created_at},${r.updated_at}) on conflict(id) do update set plan_id=excluded.plan_id,title=excluded.title,description=excluded.description,type=excluded.type,priority=excluded.priority,status=excluded.status,start_date=excluded.start_date,due_date=excluded.due_date,reminder_at=excluded.reminder_at,recurrence=excluded.recurrence,recurrence_weekdays=excluded.recurrence_weekdays,waiting_on=excluded.waiting_on,last_follow_up=excluded.last_follow_up,next_follow_up=excluded.next_follow_up,target_value=excluded.target_value,unit=excluded.unit,step_values=excluded.step_values,sort_order=excluded.sort_order,created_at=excluded.created_at,updated_at=excluded.updated_at`);
  for (const r of payload.data.item_completions) queries.push(sql`insert into item_completions(id,item_id,date,completed,value,note,created_at,updated_at) values(${r.id},${r.item_id},${r.date},${r.completed},${r.value},${r.note},${r.created_at},${r.updated_at}) on conflict(id) do update set item_id=excluded.item_id,date=excluded.date,completed=excluded.completed,value=excluded.value,note=excluded.note,created_at=excluded.created_at,updated_at=excluded.updated_at`);
  for (const r of payload.data.plan_notes) queries.push(sql`insert into plan_notes(id,plan_id,item_id,date,content,created_at,updated_at) values(${r.id},${r.plan_id},${r.item_id},${r.date},${r.content},${r.created_at},${r.updated_at}) on conflict(id) do update set plan_id=excluded.plan_id,item_id=excluded.item_id,date=excluded.date,content=excluded.content,created_at=excluded.created_at,updated_at=excluded.updated_at`);
  if (queries.length) await sql.transaction(queries);
  console.log(JSON.stringify({ message: "import complete", target: dbIdentity(url), rows: queries.length }));
}

async function verify() {
  const source = neon(required(sourceUrl, "SOURCE_DATABASE_URL")); const target = neon(required(targetUrl, "TARGET_DATABASE_URL"));
  const comparison: Record<string, { source: number; target: number; source_checksum: string; target_checksum: string; match: boolean }> = {};
  for (const table of TABLES) { const [a, b] = await Promise.all([rows(source, table), rows(target, table)]); comparison[table] = { source: a.length, target: b.length, source_checksum: checksum(a), target_checksum: checksum(b), match: a.length === b.length && checksum(a) === checksum(b) }; }
  const integrity = await audit(required(targetUrl, "TARGET_DATABASE_URL")); const allMatch = Object.values(comparison).every((value) => value.match);
  const completions = integrity.completions as Record<string, unknown>; const report = `# Executor data verification\n\nGenerated: ${new Date().toISOString()}\n\nResult: **${allMatch ? "PASS" : "FAIL"}**\n\n| Table | Source | Target | Checksum match |\n| --- | ---: | ---: | --- |\n${TABLES.map((table) => `| ${table} | ${comparison[table]!.source} | ${comparison[table]!.target} | ${comparison[table]!.match ? "yes" : "no"} |`).join("\n")}\n\n- Foreign-key orphans: ${JSON.stringify(integrity.orphans)}\n- Duplicate item/date completions: ${integrity.duplicate_completion_keys}\n- Completion date range: ${completions.earliest ?? "none"} to ${completions.latest ?? "none"}\n- Invalid plan ranges: ${integrity.invalid_plan_ranges}\n- Empty custom recurrences: ${integrity.empty_custom_weekdays}\n- Invalid quantity targets/steps: ${integrity.invalid_quantities}\n\nDeterministic SHA-256 checksums compare every explicitly exported column ordered by primary key. Today, Calendar, Inbox, plan history, and notes use the same migrated rows and preserved domain functions; authenticated HTTP fixture comparisons are recorded during smoke testing.\n`;
  await writeFile(verificationPath, report); console.log(JSON.stringify({ result: allMatch ? "PASS" : "FAIL", comparison })); if (!allMatch) process.exitCode = 1;
}

async function writeAudit() {
  const result = await audit(required(sourceUrl, "SOURCE_DATABASE_URL"));
  const report = `# Executor migration report\n\nGenerated: ${result.generated_at}\n\nSource: \`${result.identity}\` (credentials intentionally omitted)\n\n## Pre-migration audit\n\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\`\n\n## Backup and restore\n\nThe ignored \`apps/api/migration-data/executor-export.json\` is an explicit-column logical backup of all four Executor tables. Restore by applying migrations to an empty PostgreSQL database and running \`npm run migration:import\` with explicit source/target URLs. Verification recomputes full deterministic checksums.\n`;
  await writeFile(reportPath, report); console.log(JSON.stringify({ message: "audit complete", report: reportPath, counts: result.counts }));
}

const command = process.argv[2];
if (command === "audit") await writeAudit(); else if (command === "export") await exportData(); else if (command === "import") await importData(); else if (command === "verify") await verify(); else throw new Error("Expected audit, export, import, or verify");
