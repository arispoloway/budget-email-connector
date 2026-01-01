import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { parseDate } from "./utils";

describe("parseDate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("parses date with year", () => {
    expect(parseDate("24 Sep 2025 10:10 SGT")).toEqual(
      new Date("2025-09-24T10:10:00+08:00"),
    );
    expect(parseDate("24 Sep 2025 10:10 (SGT)")).toEqual(
      new Date("2025-09-24T10:10:00+08:00"),
    );
  });

  test("parses date without year - uses current year when within 60 days", () => {
    vi.setSystemTime(new Date("2025-09-25T12:00:00+08:00"));
    expect(parseDate("24 Sep 10:10 SGT")).toEqual(
      new Date("2025-09-24T10:10:00+08:00"),
    );

    vi.setSystemTime(new Date("2025-09-24T08:00:00+08:00"));
    expect(parseDate("24 Sep 10:10 SGT")).toEqual(
      new Date("2025-09-24T10:10:00+08:00"),
    );

    vi.setSystemTime(new Date("2025-01-01T10:00:00+08:00"));
    expect(parseDate("1 Jan 14:00 SGT")).toEqual(
      new Date("2025-01-01T14:00:00+08:00"),
    );
  });

  test("parses date without year - rolls back when more than 60 days in future", () => {
    vi.setSystemTime(new Date("2025-09-24T12:00:00+08:00"));
    expect(parseDate("30 Nov 10:10 SGT")).toEqual(
      new Date("2024-11-30T10:10:00+08:00"),
    );

    vi.setSystemTime(new Date("2025-01-01T10:00:00+08:00"));
    expect(parseDate("25 Dec 10:00 SGT")).toEqual(
      new Date("2024-12-25T10:00:00+08:00"),
    );
  });

  test("handles threshold edge cases", () => {
    vi.setSystemTime(new Date("2025-01-01T12:00:00+08:00"));
    expect(parseDate("2 Mar 12:00 SGT")).toEqual(
      new Date("2024-03-02T12:00:00+08:00"),
    );
    expect(parseDate("3 Mar 12:00 SGT")).toEqual(
      new Date("2024-03-03T12:00:00+08:00"),
    );
  });

  test("handles timezone mismatch - app in UTC, transaction in SGT", () => {
    // App running in UTC: Dec 31, 2024 18:00 UTC
    // Transaction: Jan 1, 2025 02:00 SGT (same moment, SGT is UTC+8)
    const nowUtc = new Date("2024-12-31T18:00:00Z");
    const result = parseDate("1 Jan 02:00 SGT", nowUtc);
    // Should parse as Jan 1, 2025 (current year in SGT timezone)
    expect(result).toEqual(new Date("2025-01-01T02:00:00+08:00"));
  });

  test("returns null for invalid inputs", () => {
    expect(parseDate("invalid date SGT")).toBeNull();
    expect(parseDate("24 Sep 10:10 EST")).toBeNull();
    expect(parseDate("24 Sep 10:10")).toBeNull();
  });
});
