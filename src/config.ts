import {
  createDestinationFromConfig,
  DestinationConfig,
} from "./destinations/config.js";
import { Destination } from "./destinations/destination.js";
import {
  createEmailClientFromConfig,
  EmailClientConfig,
} from "./email/clients/config.js";
import { EmailClient } from "./email/clients/types.js";
import {
  createParserFromConfig,
  ParserConfig,
} from "./email/parsers/config.js";
import { TransactionParser } from "./email/parsers/parser.js";
import { EmailStore } from "./email/store.js";
import {
  createNotifierFromConfig,
  NotifierConfig,
} from "./notifiers/config.js";
import { Notifier } from "./notifiers/notifier.js";
import { promises as fs } from "fs";

export type ParsedConfig = {
  emailStore: EmailStore;
  email: EmailClient;
  destination: Destination;
  parser: TransactionParser;
  notifier: Notifier;
  refreshIntervalMs: number;
};

// TODO: configurable email client
export type Config = {
  emailStorePath: string;
  email: EmailClientConfig;
  destination: DestinationConfig;
  parser: ParserConfig;
  notifier: NotifierConfig;
  refresh_interval_seconds?: number;
};

const DEFAULT_REFRESH_INTERVAL_SECONDS = 600; // 10 minutes

export function parseConfig(config: Config): ParsedConfig {
  const refreshIntervalSeconds =
    config.refresh_interval_seconds ?? DEFAULT_REFRESH_INTERVAL_SECONDS;
  return {
    emailStore: new EmailStore(config.emailStorePath),
    email: createEmailClientFromConfig(config.email),
    destination: createDestinationFromConfig(config.destination),
    parser: createParserFromConfig(config.parser),
    notifier: createNotifierFromConfig(config.notifier),
    refreshIntervalMs: refreshIntervalSeconds * 1000,
  };
}

export async function parseConfigFromFile(path: string): Promise<ParsedConfig> {
  const config = JSON.parse(await fs.readFile(path, "utf8")) as Config;
  return parseConfig(config);
}
