import {
  createDestinationFromConfig,
  DestinationConfig,
} from "./destinations/config";
import { Destination } from "./destinations/destination";
import {
  createEmailClientFromConfig,
  EmailClientConfig,
} from "./email/clients/config";
import { EmailClient } from "./email/clients/types";
import { createParserFromConfig, ParserConfig } from "./email/parsers/config";
import { TransactionParser } from "./email/parsers/parser";
import { EmailStore } from "./email/store";
import { createNotifierFromConfig, NotifierConfig } from "./notifiers/config";
import { Notifier } from "./notifiers/notifier";
import { promises as fs } from "fs";

export type ParsedConfig = {
  emailStore: EmailStore;
  email: EmailClient;
  destination: Destination;
  parser: TransactionParser;
  notifier: Notifier;
};

// TODO: configurable email client
export type Config = {
  emailStorePath: string;
  email: EmailClientConfig;
  destination: DestinationConfig;
  parser: ParserConfig;
  notifier: NotifierConfig;
};

export function parseConfig(config: Config): ParsedConfig {
  return {
    emailStore: new EmailStore(config.emailStorePath),
    email: createEmailClientFromConfig(config.email),
    destination: createDestinationFromConfig(config.destination),
    parser: createParserFromConfig(config.parser),
    notifier: createNotifierFromConfig(config.notifier),
  };
}

export async function parseConfigFromFile(path: string): Promise<ParsedConfig> {
  const config = JSON.parse(await fs.readFile(path, "utf8")) as Config;
  return parseConfig(config);
}
