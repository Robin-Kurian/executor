import { describe, expect, it } from "vitest";
import { getPushRegistrationFailure } from "./push-errors";

describe("getPushRegistrationFailure", () => {
  it("turns Brave's opaque registration failure into recovery instructions", () => {
    const failure = getPushRegistrationFailure(new DOMException("Registration failed - push service error", "AbortError"), true);

    expect(failure.title).toBe("Turn on push messaging in Brave");
    expect(failure.message).toContain("Use Google services for push messaging");
    expect(failure.message).toContain("reopen Brave");
  });

  it("keeps useful errors from other browsers", () => {
    expect(getPushRegistrationFailure(new Error("Network request failed"), false)).toEqual({
      title: "Could not enable notifications",
      message: "Network request failed",
    });
  });
});
