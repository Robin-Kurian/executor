import { describe, expect, it } from "vitest";
import { mergeReorderedIds } from "./executor";

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
