import { describe, expect, it } from "vitest";
import { ExecutorRepository, mergeReorderedIds } from "./executor";

describe("mergeReorderedIds", () => {
  it("reorders a filtered subset without moving unrelated items", () => {
    expect(mergeReorderedIds(
      ["habit-a", "task-a", "habit-b", "waiting-a", "task-b"],
      ["task-b", "task-a"],
    )).toEqual(["habit-a", "task-b", "habit-b", "waiting-a", "task-a"]);
  });

  it("rejects item ids that do not exist", () => {
    expect(() => mergeReorderedIds(["item-a"], ["missing"])).toThrow("unknown item");
  });

  it("rejects duplicate item ids", () => {
    expect(() => mergeReorderedIds(["item-a", "item-b"], ["item-a", "item-a"])).toThrow("duplicate item");
  });
});

describe("ExecutorRepository.createItem", () => {
  it("creates a new item with a sort_order that places it at the top", async () => {
    let insertedValues: any = null;
    const fakeDb = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [{
              id: "plan-1",
              name: "Test Plan",
              description: "",
              icon: "",
              color: "",
              status: "active",
              start_date: null,
              end_date: null,
              sort_order: 0,
              created_at: new Date(),
              updated_at: new Date(),
            }],
          }),
        }),
      }),
      insert: () => ({
        values: (vals: any) => {
          insertedValues = vals;
          return {
            returning: async () => [{
              id: "item-1",
              plan_id: "plan-1",
              title: vals.title,
              description: vals.description,
              type: vals.type,
              priority: vals.priority,
              status: vals.status,
              start_date: null,
              end_date: null,
              due_date: null,
              reminder_at: null,
              recurrence: vals.recurrence,
              recurrence_weekdays: [],
              waiting_on: "",
              last_follow_up: null,
              next_follow_up: null,
              target_value: null,
              unit: "",
              step_values: [],
              sort_order: -1,
              created_at: new Date(),
              updated_at: new Date(),
            }],
          };
        },
      }),
    };

    const repo = new ExecutorRepository(fakeDb as any);
    await repo.createItem("plan-1", { title: "New Task" });

    expect(insertedValues).toBeDefined();
    expect(insertedValues.title).toBe("New Task");
    const sqlChunks = insertedValues.sort_order.queryChunks.map((chunk: any) =>
      typeof chunk === "string" ? chunk : chunk?.value ?? ""
    ).join("");
    expect(sqlChunks).toContain("min");
    expect(sqlChunks).toContain("- 1");
  });
});

