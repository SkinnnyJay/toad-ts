import {
  pickPreferredCreatedAt,
  pickPreferredMessageCount,
  pickPreferredTitle,
} from "@/core/agent-management/session-merge-utils";

describe("session-merge-utils", () => {
  it("prefers longer non-empty titles", () => {
    expect(pickPreferredTitle(undefined, "Incoming")).toBe("Incoming");
    expect(pickPreferredTitle("Existing", undefined)).toBe("Existing");
    expect(pickPreferredTitle("Short", "Longer incoming title")).toBe("Longer incoming title");
    expect(pickPreferredTitle("Existing", "New")).toBe("Existing");
  });

  it("prefers newer created timestamps", () => {
    expect(pickPreferredCreatedAt(undefined, "2026-02-11T18:30:00.000Z")).toBe(
      "2026-02-11T18:30:00.000Z"
    );
    expect(pickPreferredCreatedAt("2026-02-11T18:30:00.000Z", undefined)).toBe(
      "2026-02-11T18:30:00.000Z"
    );
    expect(pickPreferredCreatedAt("2026-02-10T18:30:00.000Z", "2026-02-11T18:30:00.000Z")).toBe(
      "2026-02-11T18:30:00.000Z"
    );
    expect(pickPreferredCreatedAt("2026-02-11T18:30:00.000Z", "2026-02-10T18:30:00.000Z")).toBe(
      "2026-02-11T18:30:00.000Z"
    );
    expect(pickPreferredCreatedAt("invalid", "2026-02-11T18:30:00.000Z")).toBe(
      "2026-02-11T18:30:00.000Z"
    );
  });

  it("prefers higher message counts", () => {
    expect(pickPreferredMessageCount(undefined, 14)).toBe(14);
    expect(pickPreferredMessageCount(14, undefined)).toBe(14);
    expect(pickPreferredMessageCount(2, 14)).toBe(14);
    expect(pickPreferredMessageCount(14, 2)).toBe(14);
  });
});
