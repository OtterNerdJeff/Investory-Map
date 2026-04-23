import { describe, it, expect } from "vitest";
import { canAccess } from "@/lib/auth-guard";

describe("canAccess", () => {
  it("allows SUPER_ADMIN to access any school", () => {
    expect(
      canAccess({ role: "SUPER_ADMIN", schoolId: null }, "school_123")
    ).toBe(true);
  });

  it("allows SCHOOL_ADMIN to access their own school", () => {
    expect(
      canAccess(
        { role: "SCHOOL_ADMIN", schoolId: "school_123" },
        "school_123"
      )
    ).toBe(true);
  });

  it("blocks SCHOOL_ADMIN from accessing another school", () => {
    expect(
      canAccess(
        { role: "SCHOOL_ADMIN", schoolId: "school_123" },
        "school_456"
      )
    ).toBe(false);
  });

  it("allows USER to access their own school", () => {
    expect(
      canAccess({ role: "USER", schoolId: "school_123" }, "school_123")
    ).toBe(true);
  });

  it("blocks USER from accessing another school", () => {
    expect(
      canAccess({ role: "USER", schoolId: "school_123" }, "school_456")
    ).toBe(false);
  });
});
