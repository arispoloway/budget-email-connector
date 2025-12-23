import { expect, test, describe } from "vitest";
import {
  createDestinationFromConfig,
  ActualBudgetDestinationConfig,
  DestinationConfig,
} from "./config";
import { ActualClient } from "./actual";

describe("createDestinationFromConfig", () => {
  test("creates ActualBudget destination from config", () => {
    const config: ActualBudgetDestinationConfig = {
      type: "actual_budget",
      password: "test-password",
      url: "http://localhost:5006",
      syncId: "test-sync-id",
    };

    const destination = createDestinationFromConfig(config);
    expect(destination).toBeInstanceOf(ActualClient);
  });

  test("creates ActualBudget destination with noteSuffix", () => {
    const config: ActualBudgetDestinationConfig = {
      type: "actual_budget",
      password: "test-password",
      url: "http://localhost:5006",
      syncId: "test-sync-id",
      noteSuffix: "test-suffix",
    };

    const destination = createDestinationFromConfig(config);
    expect(destination).toBeInstanceOf(ActualClient);
  });

  test("throws error for unknown destination type", () => {
    const config = {
      type: "unknown_destination_type",
    } as unknown as DestinationConfig;

    expect(() => createDestinationFromConfig(config)).toThrow(
      "Unknown destination type: unknown_destination_type",
    );
  });
});
