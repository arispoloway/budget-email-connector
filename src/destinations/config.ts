import { ActualClient } from "./actual.js";
import { Destination } from "./destination.js";
import { LoggingDestination } from "./logging.js";

export type DestinationConfig =
  | ActualBudgetDestinationConfig
  | LoggingDestinationConfig;

export interface ActualBudgetDestinationConfig {
  type: "actual_budget";
  password: string;
  url: string;
  syncId: string;
  noteSuffix?: string;
}

export interface LoggingDestinationConfig {
  type: "logging";
}

export function createDestinationFromConfig(
  config: DestinationConfig,
): Destination {
  switch (config.type) {
    case "actual_budget":
      return new ActualClient(
        {
          password: config.password,
          serverURL: config.url,
          dataDir: "./tmp/actual",
        },
        config.syncId,
        config.noteSuffix,
      );
    case "logging":
      return new LoggingDestination();
    default:
      throw new Error(`Unknown destination type: ${(config as any).type}`);
  }
}
