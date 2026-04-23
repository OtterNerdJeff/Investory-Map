import { describe, it, expect } from "vitest";
import { resolveSchoolId } from "@/lib/tenant";

describe("resolveSchoolId", () => {
  it("returns schoolId for SCHOOL_ADMIN", () => {
    const result = resolveSchoolId({
      role: "SCHOOL_ADMIN",
      schoolId: "sch_123",
    });
    expect(result).toBe("sch_123");
  });

  it("returns schoolId for USER", () => {
    const result = resolveSchoolId({
      role: "USER",
      schoolId: "sch_456",
    });
    expect(result).toBe("sch_456");
  });

  it("throws for SUPER_ADMIN without explicit schoolId", () => {
    expect(() =>
      resolveSchoolId({ role: "SUPER_ADMIN", schoolId: null })
    ).toThrow("schoolId required");
  });

  it("returns explicit schoolId for SUPER_ADMIN when provided", () => {
    const result = resolveSchoolId(
      { role: "SUPER_ADMIN", schoolId: null },
      "sch_789"
    );
    expect(result).toBe("sch_789");
  });

  it("throws for USER without schoolId", () => {
    expect(() =>
      resolveSchoolId({ role: "USER", schoolId: null })
    ).toThrow("User has no school");
  });
});
