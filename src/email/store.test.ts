import { expect, test, beforeEach, describe } from "vitest";
import { EmailStore } from "./store";

describe("EmailStore", () => {
  let store: EmailStore;

  beforeEach(() => {
    // Use in-memory database for each test
    store = new EmailStore(":memory:");
  });

  test("works properly on empty database", async () => {
    const result = await store.seenEmail("email-1");
    expect(result).toBe(false);
  });

  test("marking same email multiple times does not cause errors", async () => {
    await store.markEmailSeen("email-1");
    await store.markEmailSeen("email-1");
    await store.markEmailSeen("email-1");
    expect(await store.seenEmail("email-1")).toBe(true);
  });

  test("multiple emails can be tracked independently", async () => {
    await store.markEmailSeen("email-1");
    await store.markEmailSeen("email-2");

    expect(await store.seenEmail("email-1")).toBe(true);
    expect(await store.seenEmail("email-2")).toBe(true);
    expect(await store.seenEmail("email-3")).toBe(false);
  });
});
